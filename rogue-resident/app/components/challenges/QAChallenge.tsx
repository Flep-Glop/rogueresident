// app/components/challenges/QAChallenge.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useChallengeStore } from '../../store/challengeStore';
import { useGameStore } from '../../store/gameStore';
import { useGameEffects } from '../GameEffects';
import { PixelText, PixelButton } from '../PixelThemeProvider';

// QA Challenge Types
type CalibrationChallengeType = {
  type: 'calibration';
  targetValue: number;
  tolerance: number;
  unit: string;
  minValue: number;
  maxValue: number;
  valueDescription: string;
  deviceName: string;
  description: string;
};

type PatternChallengeType = {
  type: 'pattern-matching';
  correctPattern: number[];
  numOptions: number;
  description: string;
  deviceName: string;
  timeLimit?: number;
};

type SequenceChallengeType = {
  type: 'sequence';
  correctSequence: string[];
  options: string[];
  description: string;
  deviceName: string;
  timeLimit?: number;
};

type QAChallengeData = 
  | CalibrationChallengeType
  | PatternChallengeType
  | SequenceChallengeType;

// QA Challenge Component
export default function QAChallenge() {
  // Get challenge data from store
  const { currentChallenge, completeChallenge } = useChallengeStore();
  const { inventory } = useGameStore();
  const { shakeScreen, flashScreen, showRewardEffect, playSound } = useGameEffects();
  
  // Internal state
  const [result, setResult] = useState<'success' | 'failure' | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Challenge-specific state
  const [currentValue, setCurrentValue] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState<number[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  
  // References for animations and timers
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize challenge
  useEffect(() => {
    if (!currentChallenge || currentChallenge.stage !== 'challenge') return;
    
    const qaData = currentChallenge.content as QAChallengeData;
    
    // Initialize based on challenge type
    if (qaData.type === 'calibration') {
      // Start at a random value
      const randomStart = Math.floor(Math.random() * 
        (qaData.maxValue - qaData.minValue) + qaData.minValue);
      setCurrentValue(randomStart);
    } 
    else if (qaData.type === 'pattern-matching') {
      setSelectedPattern([]);
      // Set timer if specified
      if (qaData.timeLimit) {
        setTimeRemaining(qaData.timeLimit);
        startTimer();
      }
    }
    else if (qaData.type === 'sequence') {
      setSelectedSequence([]);
      // Set timer if specified
      if (qaData.timeLimit) {
        setTimeRemaining(qaData.timeLimit);
        startTimer();
      }
    }
    
    // Play challenge start sound
    playSound('challenge-start');
    
  }, [currentChallenge, playSound]);
  
  // Start timer for timed challenges
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up!
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // Calculate QA bonus from inventory
  const calculateQABonus = () => {
    return inventory.reduce((total, item) => {
      const effect = item.effects.find(e => e.type === 'qa');
      return total + (effect?.value || 0);
    }, 0);
  };
  
  const qaBonus = calculateQABonus();
  
  // Handle calibration value changes
  const handleValueChange = (newValue: number) => {
    setCurrentValue(newValue);
    
    // Small screen shake for feedback
    if (containerRef.current) {
      containerRef.current.classList.add('shake-small');
      setTimeout(() => {
        containerRef.current?.classList.remove('shake-small');
      }, 300);
    }
    
    // Play adjustment sound
    playSound('ui-click');
  };
  
  // Handle pattern selection
  const handlePatternSelect = (index: number) => {
    if (result) return; // Don't allow changes after submitting
    
    setSelectedPattern(prev => {
      const newPattern = [...prev];
      
      // Toggle selection
      const existingIndex = newPattern.indexOf(index);
      if (existingIndex >= 0) {
        newPattern.splice(existingIndex, 1);
      } else {
        newPattern.push(index);
      }
      
      return newPattern;
    });
    
    // Play selection sound
    playSound('ui-toggle');
  };
  
  // Handle sequence selection
  const handleSequenceSelect = (item: string) => {
    if (result) return; // Don't allow changes after submitting
    
    setSelectedSequence(prev => [...prev, item]);
    
    // Play selection sound
    playSound('ui-click');
  };
  
  // Remove last item from sequence
  const removeLastSequenceItem = () => {
    setSelectedSequence(prev => prev.slice(0, -1));
    
    // Play removal sound
    playSound('ui-error');
  };
  
  // Reset sequence selection
  const resetSequence = () => {
    setSelectedSequence([]);
    
    // Play reset sound
    playSound('ui-close');
  };
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Submit answer
  const handleSubmit = () => {
    if (!currentChallenge) return;
    
    setAttemptCount(prev => prev + 1);
    const qaData = currentChallenge.content as QAChallengeData;
    
    let isCorrect = false;
    
    // Check correctness based on challenge type
    if (qaData.type === 'calibration') {
      const targetValue = qaData.targetValue;
      const tolerance = qaData.tolerance;
      
      // Check if value is within tolerance
      isCorrect = Math.abs(currentValue - targetValue) <= tolerance;
      
      if (isCorrect) {
        setFeedback(`Correct! You calibrated to ${currentValue}${qaData.unit}, which is within the acceptable tolerance of ±${tolerance}${qaData.unit}.`);
      } else {
        const direction = currentValue > targetValue ? 'high' : 'low';
        setFeedback(`Your calibration of ${currentValue}${qaData.unit} is too ${direction}. The acceptable range is ${targetValue - tolerance}${qaData.unit} to ${targetValue + tolerance}${qaData.unit}.`);
      }
    } 
    else if (qaData.type === 'pattern-matching') {
      // Convert arrays to strings for comparison (order doesn't matter for pattern matching)
      const sortedSelected = [...selectedPattern].sort((a, b) => a - b).join(',');
      const sortedCorrect = [...qaData.correctPattern].sort((a, b) => a - b).join(',');
      
      isCorrect = sortedSelected === sortedCorrect;
      
      if (isCorrect) {
        setFeedback(`Correct! You identified the pattern accurately.`);
      } else {
        setFeedback(`The pattern you selected doesn't match the expected output pattern.`);
      }
    }
    else if (qaData.type === 'sequence') {
      // For sequence challenges, order matters
      isCorrect = qaData.correctSequence.length === selectedSequence.length &&
                qaData.correctSequence.every((item, index) => item === selectedSequence[index]);
      
      if (isCorrect) {
        setFeedback(`Correct! You completed the sequence in the right order.`);
      } else {
        setFeedback(`The sequence is incorrect. Please check the order of steps.`);
      }
    }
    
    // Stop timer if running
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Set result and play appropriate effect
    if (isCorrect) {
      setResult('success');
      flashScreen('green');
      playSound('challenge-success');
      showRewardEffect(50, window.innerWidth / 2, window.innerHeight / 2);
      
      // Success vibration pattern
      navigator.vibrate?.(200);
      
      // Complete challenge with appropriate grade based on attempts
      let grade: 'S' | 'A' | 'B' | 'C';
      if (attemptCount === 0) grade = 'S';
      else if (attemptCount === 1) grade = 'A';
      else if (attemptCount === 2) grade = 'B';
      else grade = 'C';
      
      // Apply QA bonus to grade (each 20% bonus improves grade by one level)
      const gradeImprovement = Math.floor(qaBonus / 20);
      const grades: Array<'S' | 'A' | 'B' | 'C'> = ['C', 'B', 'A', 'S'];
      const currentGradeIndex = grades.indexOf(grade);
      const improvedGradeIndex = Math.min(3, currentGradeIndex + gradeImprovement);
      const finalGrade = grades[improvedGradeIndex];
      
      setTimeout(() => {
        completeChallenge(finalGrade);
      }, 2000);
    } else {
      setResult('failure');
      shakeScreen('medium');
      flashScreen('red');
      playSound('challenge-failure');
      
      // Failure vibration pattern
      navigator.vibrate?.([100, 100, 100]);
      
      // Reset after delay for another attempt
      setTimeout(() => {
        setResult(null);
        
        // Reset state based on challenge type
        if (qaData.type === 'sequence') {
          setSelectedSequence([]);
        }
        
        // Restart timer if applicable
        if ((qaData.type === 'pattern-matching' || qaData.type === 'sequence') && qaData.timeLimit) {
          setTimeRemaining(qaData.timeLimit);
          startTimer();
        }
      }, 2000);
    }
  };
  
  // Render challenge based on type
  const renderChallengeContent = () => {
    if (!currentChallenge) return null;
    
    const qaData = currentChallenge.content as QAChallengeData;
    
    switch(qaData.type) {
      case 'calibration':
        return renderCalibrationChallenge(qaData);
      case 'pattern-matching':
        return renderPatternChallenge(qaData);
      case 'sequence':
        return renderSequenceChallenge(qaData);
      default:
        return <div>Unknown challenge type</div>;
    }
  };
  
  // Render calibration challenge
  const renderCalibrationChallenge = (data: CalibrationChallengeType) => {
    return (
      <div className="space-y-6">
        <div className="bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="text-lg mb-2">Calibration Target:</PixelText>
          <PixelText className="text-xl text-qa-light">
            {data.valueDescription}: {data.targetValue - data.tolerance} - {data.targetValue + data.tolerance} {data.unit}
          </PixelText>
        </div>
        
        <div 
          className="bg-surface-dark p-6 pixel-borders-thin text-center relative"
          ref={containerRef}
        >
          <div className="text-3xl font-bold font-pixel mb-6">
            {currentValue}{data.unit}
          </div>
          
          <div className="flex justify-between items-center">
            <PixelButton
              className="bg-qa text-white"
              onClick={() => handleValueChange(Math.max(data.minValue, currentValue - 1))}
            >
              -1
            </PixelButton>
            
            <div className="flex space-x-4">
              <PixelButton
                className="bg-qa text-white"
                onClick={() => handleValueChange(Math.max(data.minValue, currentValue - 0.1))}
              >
                -0.1
              </PixelButton>
              
              <PixelButton
                className="bg-qa text-white"
                onClick={() => handleValueChange(Math.min(data.maxValue, currentValue + 0.1))}
              >
                +0.1
              </PixelButton>
            </div>
            
            <PixelButton
              className="bg-qa text-white"
              onClick={() => handleValueChange(Math.min(data.maxValue, currentValue + 1))}
            >
              +1
            </PixelButton>
          </div>
          
          {/* Calibration gauge */}
          <div className="mt-8 w-full bg-dark-gray h-4 pixel-borders-thin relative">
            <div 
              className="absolute h-full bg-qa transition-all duration-300"
              style={{ 
                width: `${((currentValue - data.minValue) / (data.maxValue - data.minValue)) * 100}%`
              }}
            ></div>
            
            {/* Target marker */}
            <div 
              className="absolute h-6 w-1 bg-white top-1/2 transform -translate-y-1/2"
              style={{ 
                left: `${((data.targetValue - data.minValue) / (data.maxValue - data.minValue)) * 100}%`,
                boxShadow: '0 0 5px rgba(255,255,255,0.8)'
              }}
            ></div>
            
            {/* Tolerance range */}
            <div 
              className="absolute h-full bg-green-500 opacity-20"
              style={{ 
                left: `${((data.targetValue - data.tolerance - data.minValue) / (data.maxValue - data.minValue)) * 100}%`,
                width: `${((data.tolerance * 2) / (data.maxValue - data.minValue)) * 100}%`
              }}
            ></div>
          </div>
          
          {/* Device visualization */}
          <div className="mt-6 p-3 bg-surface pixel-borders">
            <PixelText className="text-sm text-qa-light">{data.deviceName}</PixelText>
            
            <div className="flex justify-center mt-2">
              <div className="w-16 h-16 bg-qa-dark pixel-borders flex items-center justify-center">
                <div className="text-2xl">🔍</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render pattern matching challenge
  const renderPatternChallenge = (data: PatternChallengeType) => {
    // Generate a grid of options
    const gridSize = Math.ceil(Math.sqrt(data.numOptions));
    
    return (
      <div className="space-y-6">
        {timeRemaining > 0 && (
          <div className="flex justify-between items-center">
            <PixelText>Time Remaining:</PixelText>
            <div className={`px-3 py-1 text-sm font-pixel ${timeRemaining < 10 ? 'bg-danger text-white' : 'bg-qa text-white'} pixel-borders-thin`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}
        
        <div className="bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="text-lg mb-2">Pattern Detection Task:</PixelText>
          <PixelText>Select all grid cells that match the expected output pattern for {data.deviceName}.</PixelText>
        </div>
        
        {/* Pattern grid */}
        <div className="bg-surface-dark p-6 pixel-borders-thin">
          <div 
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {Array.from({ length: data.numOptions }).map((_, index) => (
              <button
                key={index}
                className={`
                  w-full aspect-square pixel-borders flex items-center justify-center
                  ${selectedPattern.includes(index) ? 'bg-qa' : 'bg-surface'}
                  ${result ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-qa-dark'}
                  transition-colors
                `}
                onClick={() => handlePatternSelect(index)}
                disabled={!!result}
              >
                <div className="text-lg font-pixel">
                  {/* Visual representation based on index */}
                  {index % 3 === 0 ? '◼' : index % 3 === 1 ? '◆' : '●'}
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <PixelText className="text-sm text-text-secondary">
              Selected: {selectedPattern.length} pattern elements
            </PixelText>
          </div>
        </div>
        
        {/* Device visualization */}
        <div className="p-3 bg-surface pixel-borders">
          <PixelText className="text-sm text-qa-light">{data.deviceName}</PixelText>
          
          <div className="flex justify-center mt-2">
            <div className="w-16 h-16 bg-qa-dark pixel-borders flex items-center justify-center">
              <div className="text-2xl">📊</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render sequence challenge
  const renderSequenceChallenge = (data: SequenceChallengeType) => {
    return (
      <div className="space-y-6">
        {timeRemaining > 0 && (
          <div className="flex justify-between items-center">
            <PixelText>Time Remaining:</PixelText>
            <div className={`px-3 py-1 text-sm font-pixel ${timeRemaining < 10 ? 'bg-danger text-white' : 'bg-qa text-white'} pixel-borders-thin`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}
        
        <div className="bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="text-lg mb-2">Sequence Task:</PixelText>
          <PixelText>Arrange the steps in the correct sequence for {data.deviceName} operation.</PixelText>
        </div>
        
        {/* Selected sequence */}
        <div className="bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="mb-2">Current Sequence:</PixelText>
          <div className="min-h-20 flex flex-wrap gap-2 mb-4">
            {selectedSequence.length === 0 ? (
              <div className="w-full text-center py-4 text-text-secondary">
                <PixelText>Click steps below to build your sequence</PixelText>
              </div>
            ) : (
              selectedSequence.map((item, index) => (
                <div 
                  key={index}
                  className="pixel-borders bg-qa-dark py-1 px-3 flex items-center"
                >
                  <span className="font-pixel mr-2">{index + 1}.</span>
                  <span className="font-pixel">{item}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <PixelButton
              className="bg-medium-gray"
              onClick={removeLastSequenceItem}
              disabled={selectedSequence.length === 0 || !!result}
            >
              Undo
            </PixelButton>
            
            <PixelButton
              className="bg-medium-gray"
              onClick={resetSequence}
              disabled={selectedSequence.length === 0 || !!result}
            >
              Reset
            </PixelButton>
          </div>
        </div>
        
        {/* Available options */}
        <div className="bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="mb-2">Available Steps:</PixelText>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.options.map((item, index) => (
              <button
                key={index}
                className={`
                  text-left p-2 pixel-borders-thin
                  ${selectedSequence.includes(item) ? 'bg-qa-dark opacity-50' : 'bg-surface hover:bg-qa/30'}
                  ${result ? 'cursor-not-allowed' : 'cursor-pointer'}
                  transition-colors
                `}
                onClick={() => handleSequenceSelect(item)}
                disabled={selectedSequence.includes(item) || !!result}
              >
                <PixelText>{item}</PixelText>
              </button>
            ))}
          </div>
        </div>
        
        {/* Device visualization */}
        <div className="p-3 bg-surface pixel-borders">
          <PixelText className="text-sm text-qa-light">{data.deviceName}</PixelText>
          
          <div className="flex justify-center mt-2">
            <div className="w-16 h-16 bg-qa-dark pixel-borders flex items-center justify-center">
              <div className="text-2xl">⚙️</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (!currentChallenge) return null;
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders qa-container">
      {/* Challenge header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <PixelText className="text-2xl text-qa-light font-pixel-heading mb-1">
            Quality Assurance Challenge
          </PixelText>
          <PixelText className="text-text-secondary">
            {currentChallenge.content.description}
          </PixelText>
        </div>
        
        {qaBonus > 0 && (
          <div className="px-3 py-1 bg-qa text-white pixel-borders-thin text-sm font-pixel flex items-center">
            <span className="mr-1">🔍</span>
            <span>+{qaBonus}% QA Bonus</span>
          </div>
        )}
      </div>
      
      {/* Main challenge content */}
      {renderChallengeContent()}
      
      {/* Feedback */}
      {feedback && (
        <div className={`my-6 p-4 pixel-borders-thin ${result === 'success' ? 'bg-success/30' : result === 'failure' ? 'bg-danger/30' : 'bg-qa/30'}`}>
          <PixelText className={result === 'success' ? 'text-success' : result === 'failure' ? 'text-danger' : 'text-qa-light'}>
            {feedback}
          </PixelText>
        </div>
      )}
      
      {/* Hint */}
      {!result && (
        <div className="mt-6">
          {showHint ? (
            <div className="p-4 bg-surface-dark pixel-borders-thin mb-4">
              <PixelText className="text-qa-light mb-2">Hint:</PixelText>
              <PixelText className="text-text-secondary">
                {currentChallenge.content.type === 'calibration'
                  ? `Try adjusting the value in small increments toward the target range (${(currentChallenge.content as CalibrationChallengeType).targetValue - (currentChallenge.content as CalibrationChallengeType).tolerance} - ${(currentChallenge.content as CalibrationChallengeType).targetValue + (currentChallenge.content as CalibrationChallengeType).tolerance})`
                  : currentChallenge.content.type === 'pattern-matching'
                    ? 'Look for patterns in the active elements. The solution often involves symmetry or consistency.'
                    : 'Consider the logical order of operations and safety procedures when arranging the sequence.'}
              </PixelText>
            </div>
          ) : (
            <PixelButton
              className="bg-dark-gray text-text-secondary"
              onClick={() => setShowHint(true)}
            >
              Show Hint
            </PixelButton>
          )}
        </div>
      )}
      
      {/* Submit button */}
      <div className="mt-6 flex justify-end">
        <PixelButton
          className="bg-qa text-white font-medium"
          onClick={handleSubmit}
          disabled={!!result}
        >
          {currentChallenge.content.type === 'calibration'
            ? 'Confirm Calibration'
            : currentChallenge.content.type === 'pattern-matching'
              ? 'Confirm Pattern'
              : 'Submit Sequence'}
        </PixelButton>
      </div>
      
      {/* Animation styles */}
      <style jsx>{`
        .shake-small {
          animation: shake-small 0.3s ease-in-out;
        }
        
        @keyframes shake-small {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}