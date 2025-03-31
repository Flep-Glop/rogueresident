// app/components/challenges/EducationalChallenge.tsx
'use client';
import { useState, useEffect } from 'react';
import { useChallengeStore } from '../../store/challengeStore';
import { useGameStore } from '../../store/gameStore';
import { useGameEffects } from '../GameEffects';
import { PixelText, PixelButton } from '../PixelThemeProvider';

interface ExplanationLevel {
  id: string;
  audience: 'patient' | 'student' | 'colleague';
  question: string;
  correctAnswer: string;
  options: string[];
}

interface EducationalChallengeData {
  title: string;
  topic: string;
  description: string;
  concept: string;
  conceptExplanation: string;
  explanationLevels: ExplanationLevel[];
}

export default function EducationalChallenge() {
  const { currentChallenge, completeChallenge } = useChallengeStore();
  const { inventory } = useGameStore();
  const { shakeScreen, flashScreen, showRewardEffect, playSound } = useGameEffects();
  
  // State for the current challenge
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  
  // Reset state when challenge changes
  useEffect(() => {
    if (!currentChallenge) return;
    
    setCurrentLevel(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setFeedback('');
    setScore(0);
    setShowResult(false);
    
    // Play challenge start sound
    playSound('challenge-start');
  }, [currentChallenge, playSound]);
  
  if (!currentChallenge || !currentChallenge.content) return null;
  
  // Cast to our expected data structure
  const challengeData = currentChallenge.content as EducationalChallengeData;
  const levels = challengeData.explanationLevels;
  const currentLevelData = levels[currentLevel];
  
  // Calculate educational bonus from inventory
  const calculateEducationalBonus = () => {
    return inventory.reduce((total, item) => {
      const effect = item.effects.find(e => e.type === 'educational');
      return total + (effect?.value || 0);
    }, 0);
  };
  
  const educationalBonus = calculateEducationalBonus();
  
  // Handle selecting an option
  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };
  
  // Submit the current answer
  const handleSubmit = () => {
    if (!selectedOption) return;
    
    const isAnswerCorrect = selectedOption === currentLevelData.correctAnswer;
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      // Update score
      setScore(prev => prev + 1);
      
      // Success feedback
      setFeedback("Excellent explanation! That's perfect for this audience.");
      flashScreen('green');
      playSound('success');
      
      if (currentLevel + 1 >= levels.length) {
        // All levels completed
        setTimeout(() => {
          setShowResult(true);
        }, 1500);
      }
    } else {
      // Failure feedback
      setFeedback("That explanation isn't quite right for this audience. Consider their background and needs.");
      shakeScreen('light');
      flashScreen('red');
      playSound('failure');
    }
  };
  
  // Continue to next level
  const handleContinue = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setFeedback('');
    
    if (currentLevel + 1 < levels.length) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };
  
  // Complete the challenge
  const handleComplete = () => {
    // Calculate grade based on score and educational bonus
    const percentage = (score / levels.length) * 100;
    
    // Apply educational bonus (each 20% bonus gives 5% more to final score)
    const bonusPercentage = Math.min(25, Math.floor(educationalBonus / 20) * 5);
    const finalPercentage = Math.min(100, percentage * (1 + bonusPercentage/100));
    
    // Determine grade
    let grade: 'S' | 'A' | 'B' | 'C';
    if (finalPercentage >= 95) grade = 'S';
    else if (finalPercentage >= 80) grade = 'A';
    else if (finalPercentage >= 65) grade = 'B';
    else grade = 'C';
    
    // Show reward effect
    showRewardEffect(Math.round(finalPercentage), window.innerWidth / 2, window.innerHeight / 2);
    
    // Complete the challenge
    completeChallenge(grade);
  };
  
  // Render result summary
  const renderResult = () => {
    const percentage = (score / levels.length) * 100;
    const bonusPercentage = Math.min(25, Math.floor(educationalBonus / 20) * 5);
    const finalPercentage = Math.min(100, percentage * (1 + bonusPercentage/100));
    
    return (
      <div className="p-6 text-center">
        <PixelText className="text-3xl text-educational-light font-pixel-heading mb-6">Challenge Complete!</PixelText>
        
        <div className="bg-surface-dark p-4 pixel-borders-thin mb-6">
          <PixelText className="text-xl mb-2">Educational Effectiveness</PixelText>
          <div className="space-y-4">
            <div>
              <PixelText className="text-text-secondary mb-1">Base Score:</PixelText>
              <PixelText className="text-2xl">{percentage.toFixed(0)}%</PixelText>
              <div className="w-full bg-dark-gray h-4 my-2">
                <div className="h-full bg-educational" style={{ width: `${percentage}%` }}></div>
              </div>
              <PixelText className="text-sm text-text-secondary">({score}/{levels.length} explanations effective)</PixelText>
            </div>
            
            {educationalBonus > 0 && (
              <div>
                <PixelText className="text-text-secondary mb-1">Educational Bonus:</PixelText>
                <PixelText className="text-lg text-educational-light">+{bonusPercentage}%</PixelText>
              </div>
            )}
            
            <div>
              <PixelText className="text-text-secondary mb-1">Final Score:</PixelText>
              <PixelText className="text-3xl text-educational-light">{finalPercentage.toFixed(0)}%</PixelText>
              <div className="w-full bg-dark-gray h-6 my-2">
                <div className="h-full bg-educational-light" style={{ width: `${finalPercentage}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <PixelText className="text-text-secondary mb-2">Dr. Garcia's Assessment:</PixelText>
          <PixelText className="italic px-4">
            {finalPercentage >= 95 
              ? "Outstanding work! You demonstrated exceptional skill in tailoring complex concepts to different audiences. Your communication skills are a tremendous asset to our department."
              : finalPercentage >= 80
                ? "Very good work. You showed strong ability to adapt your explanations to different audiences. With a bit more practice, you'll be an excellent communicator."
                : finalPercentage >= 65
                  ? "Satisfactory work. You're on the right track with your explanations, but need more practice in adapting your language to different audiences."
                  : "You need more practice in adapting explanations to different audiences. Review how you communicate complex concepts with patients versus colleagues."}
          </PixelText>
        </div>
        
        <PixelButton
          className="bg-educational text-white hover:bg-educational-light"
          onClick={handleComplete}
        >
          Complete Challenge
        </PixelButton>
      </div>
    );
  };
  
  // Render the audience info
  const renderAudienceInfo = () => {
    const audience = currentLevelData.audience;
    
    return (
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-6">
        <PixelText className="mb-2">Your Audience:</PixelText>
        <div className="flex items-center">
          <div className="w-12 h-12 flex items-center justify-center text-2xl bg-educational-dark mr-4">
            {audience === 'patient' ? '👨‍⚕️' : audience === 'student' ? '👩‍🎓' : '👩‍⚕️'}
          </div>
          <div>
            <PixelText className="text-lg">
              {audience === 'patient' ? 'Patient' : audience === 'student' ? 'Medical Student' : 'Physician Colleague'}
            </PixelText>
            <PixelText className="text-text-secondary text-sm">
              {audience === 'patient' 
                ? 'No medical background. Needs simple, clear explanations without jargon.'
                : audience === 'student'
                  ? 'Basic medical knowledge. Can understand common terminology but needs concepts broken down.'
                  : 'Advanced medical knowledge. Familiar with complex concepts and terminology.'}
            </PixelText>
          </div>
        </div>
      </div>
    );
  };
  
  // If showing results, render the summary
  if (showResult) {
    return renderResult();
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders educational-container">
      {/* Challenge header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <PixelText className="text-2xl text-educational-light font-pixel-heading mb-1">
            {challengeData.title}
          </PixelText>
          <PixelText className="text-text-secondary">
            {challengeData.description}
          </PixelText>
        </div>
        
        {educationalBonus > 0 && (
          <div className="px-3 py-1 bg-educational text-white pixel-borders-thin text-sm font-pixel flex items-center">
            <span className="mr-1">📚</span>
            <span>+{educationalBonus}% Educational Bonus</span>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <PixelText className="text-text-secondary">Explanation {currentLevel + 1} of {levels.length}</PixelText>
          <PixelText className="text-text-secondary">Score: {score}/{levels.length}</PixelText>
        </div>
        <div className="w-full bg-dark-gray h-4">
          <div 
            className="h-full bg-educational transition-all duration-300"
            style={{ width: `${((currentLevel) / levels.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Concept to explain */}
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-6">
        <PixelText className="mb-2">Concept to Explain:</PixelText>
        <PixelText className="text-lg mb-2 text-educational-light">{challengeData.concept}</PixelText>
        <PixelText className="text-text-secondary text-sm italic">{challengeData.conceptExplanation}</PixelText>
      </div>
      
      {/* Audience info */}
      {renderAudienceInfo()}
      
      {/* Current question */}
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-6">
        <PixelText className="mb-4">{currentLevelData.question}</PixelText>
        
        <div className="space-y-3">
          {currentLevelData.options.map((option, index) => (
            <button
              key={index}
              className={`
                w-full text-left p-3 pixel-borders-thin cursor-pointer
                ${selectedOption === option 
                  ? isCorrect === null 
                    ? 'bg-educational/30' 
                    : isCorrect 
                      ? 'bg-success/30' 
                      : 'bg-danger/30' 
                  : 'bg-surface'}
                ${selectedOption !== null && isCorrect !== null ? 'cursor-default' : 'hover:bg-surface-dark'}
              `}
              onClick={() => isCorrect === null && handleOptionSelect(option)}
              disabled={isCorrect !== null}
            >
              <PixelText>{option}</PixelText>
            </button>
          ))}
        </div>
      </div>
      
      {/* Feedback */}
      {feedback && (
        <div className={`p-4 mb-6 pixel-borders-thin ${isCorrect ? 'bg-success/30' : 'bg-danger/30'}`}>
          <PixelText>{feedback}</PixelText>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-end">
        {isCorrect === null ? (
          <PixelButton
            className="bg-educational text-white"
            onClick={handleSubmit}
            disabled={!selectedOption}
          >
            Submit Explanation
          </PixelButton>
        ) : (
          <PixelButton
            className="bg-educational text-white"
            onClick={handleContinue}
          >
            {currentLevel + 1 < levels.length ? 'Next Audience' : 'See Results'}
          </PixelButton>
        )}
      </div>
    </div>
  );
}