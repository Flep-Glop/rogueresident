// app/components/challenges/BossNode.tsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PixelButton, PixelText } from '../PixelThemeProvider';

// Boss stages
type BossStage = 'intro' | 'phase1' | 'phase2' | 'phase3' | 'victory';

export default function BossNode() {
  const [stage, setStage] = useState<BossStage>('intro');
  const [bossHealth, setBossHealth] = useState(100);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [gameCompleted, setGameCompleted] = useState(false);
  
  const { completeNode, currentNodeId, updateInsight, updateHealth } = useGameStore();

  // Phase management
  const advanceToPhase = (nextPhase: BossStage) => {
    setSelectedAnswer(null);
    setFeedback('');
    setStage(nextPhase);
  };

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  // Submit answer and progress based on current phase
  const handleSubmit = () => {
    if (!selectedAnswer) return;

    // Simplified boss mechanics for prototype
    // In a full implementation, you would have more complex logic
    switch (stage) {
      case 'phase1':
        if (selectedAnswer === 'correct') {
          setBossHealth(bossHealth - 40);
          setFeedback("Correct! You've calibrated the system and stabilized Ionix's energy output.");
          setTimeout(() => advanceToPhase('phase2'), 2000);
        } else {
          updateHealth(-1); // Player takes damage
          setFeedback('Incorrect calibration. The energy levels spike dangerously, causing damage.');
        }
        break;
        
      case 'phase2':
        if (selectedAnswer === 'correct') {
          setBossHealth(bossHealth - 40);
          setFeedback("Great job! You've successfully identified the pattern and contained the energy fluctuations.");
          setTimeout(() => advanceToPhase('phase3'), 2000);
        } else {
          updateHealth(-1); // Player takes damage
          setFeedback('You misidentified the pattern. Energy surges affect you before you can correct your approach.');
        }
        break;
        
      case 'phase3':
        if (selectedAnswer === 'correct') {
          setBossHealth(0);
          setFeedback("Perfect! You've successfully identified the core issue and resolved it.");
          setTimeout(() => advanceToPhase('victory'), 2000);
        } else {
          updateHealth(-1); // Player takes damage
          setFeedback('Your approach failed. Ionix seems to grow more unstable before you adjust your strategy.');
        }
        break;
    }
  };

  // Handle victory
  const completeEncounter = () => {
    if (currentNodeId) {
      completeNode(currentNodeId);
      updateInsight(200); // Big reward for boss completion
      
      // Set game state to victory
      useGameStore.getState().gameState = 'victory';
      
      setGameCompleted(true);
    }
  };

  // Render content based on current stage
  const renderContent = () => {
    switch (stage) {
      case 'intro':
        return (
          <>
            <div className="mb-8">
              <PixelText className="text-3xl text-boss-light font-pixel-heading mb-4">Ionix Encounter</PixelText>
              <p className="mb-4 font-pixel text-text-primary">
                You've reached the containment chamber where Ionix, an experimental ion chamber, 
                has been displaying unusual behavior. The energy readings are off the charts, and 
                there are signs of what appears to be sentience.
              </p>
              <p className="mb-4 font-pixel text-text-primary">
                As you enter the chamber, the displays flicker and a pattern of energy pulses 
                seems to react to your presence. You'll need to use your medical physics knowledge
                to stabilize and understand this phenomenon.
              </p>
            </div>
            
            <PixelButton
              className="bg-boss text-white hover:bg-boss-light"
              onClick={() => advanceToPhase('phase1')}
            >
              Begin Encounter
            </PixelButton>
          </>
        );
        
      case 'phase1':
        return (
          <>
            <div className="mb-8">
              <PixelText className="text-2xl text-boss-light font-pixel-heading mb-2">Phase 1: Calibration Challenge</PixelText>
              <p className="mb-4 font-pixel text-text-primary">
                Ionix's energy output is fluctuating wildly. You need to calibrate your equipment
                to stabilize the readings and establish communication.
              </p>
              
              <div className="p-4 pixel-borders-thin bg-surface-dark mb-6">
                <PixelText className="font-bold mb-2">What's the appropriate first step?</PixelText>
                
                <div className="space-y-2">
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    <PixelText className="text-text-primary">Establish a baseline reading using a calibrated dosimeter at a safe distance</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    <PixelText className="text-text-primary">Immediately shut down all power to the containment system</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    <PixelText className="text-text-primary">Move closer to get a more accurate reading</PixelText>
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 pixel-borders-thin ${feedback.includes('Correct') ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  <PixelText>{feedback}</PixelText>
                </div>
              )}
            </div>
            
            <PixelButton
              className={selectedAnswer ? 'bg-boss text-white hover:bg-boss-light' : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </PixelButton>
          </>
        );
        
      case 'phase2':
        return (
          <>
            <div className="mb-8">
              <PixelText className="text-2xl text-boss-light font-pixel-heading mb-2">Phase 2: Response to Erratic Behavior</PixelText>
              <p className="mb-4 font-pixel text-text-primary">
                Now that you've established basic readings, you notice Ionix's energy patterns are
                shifting in what appears to be a rhythmic sequence. You need to identify the pattern
                to predict and manage the energy fluctuations.
              </p>
              
              <div className="p-4 pixel-borders-thin bg-surface-dark mb-6">
                <PixelText className="font-bold mb-2">How should you analyze the energy pattern?</PixelText>
                
                <div className="space-y-2">
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    <PixelText className="text-text-primary">Record the energy frequency spectrum and look for harmonic patterns</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    <PixelText className="text-text-primary">Immediately apply dampening field at maximum strength</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    <PixelText className="text-text-primary">Ignore the patterns and focus only on containing peak energy outputs</PixelText>
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 pixel-borders-thin ${feedback.includes('Great') ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  <PixelText>{feedback}</PixelText>
                </div>
              )}
            </div>
            
            <PixelButton
              className={selectedAnswer ? 'bg-boss text-white hover:bg-boss-light' : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </PixelButton>
          </>
        );
        
      case 'phase3':
        return (
          <>
            <div className="mb-8">
              <PixelText className="text-2xl text-boss-light font-pixel-heading mb-2">Phase 3: Resolution Approach</PixelText>
              <p className="mb-4 font-pixel text-text-primary">
                Your analysis indicates that Ionix has developed a form of rudimentary consciousness
                through quantum effects in its sensitive detection material. You need to decide on
                the best approach to resolve the situation.
              </p>
              
              <div className="p-4 pixel-borders-thin bg-surface-dark mb-6">
                <PixelText className="font-bold mb-2">What's the most appropriate resolution?</PixelText>
                
                <div className="space-y-2">
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    <PixelText className="text-text-primary">Establish a stable containment field calibrated to the energy pattern and develop an interface for communication</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    <PixelText className="text-text-primary">Completely deactivate Ionix by removing its power source</PixelText>
                  </label>
                  
                  <label className={`block p-3 pixel-borders-thin cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-boss/30 pixel-borders' : 'bg-surface'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    <PixelText className="text-text-primary">Isolate Ionix in a lead-lined container to prevent further energy emissions</PixelText>
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 pixel-borders-thin ${feedback.includes('Perfect') ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  <PixelText>{feedback}</PixelText>
                </div>
              )}
            </div>
            
            <PixelButton
              className={selectedAnswer ? 'bg-boss text-white hover:bg-boss-light' : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </PixelButton>
          </>
        );
        
      case 'victory':
        return (
          <>
            <div className="mb-8 text-center">
              <PixelText className="text-3xl text-boss-light font-pixel-heading mb-4">Victory!</PixelText>
              
              <div className="p-6 pixel-borders-thin bg-surface-dark mb-6">
                <p className="mb-4 font-pixel text-text-primary">
                  You've successfully established a stable interface with Ionix. The energy patterns
                  have stabilized, and what was once chaotic energy has transformed into a
                  controllable, even beneficial phenomenon.
                </p>
                <p className="mb-4 font-pixel text-text-primary">
                  The interface you've created allows for communication with this new form of
                  consciousness, opening up possibilities for research and collaboration.
                </p>
                <p className="font-medium text-boss-light font-pixel">
                  Your knowledge of medical physics has not only saved the facility but potentially
                  opened a new chapter in our understanding of quantum effects in detection materials.
                </p>
              </div>
              
              <div className="mb-6">
                <PixelText className="text-lg text-text-primary mb-2">Rewards</PixelText>
                <PixelText className="text-2xl font-bold text-success">+200 Insight</PixelText>
              </div>
            </div>
            
            <PixelButton
              className="bg-success text-white hover:bg-green-600 mx-auto block"
              onClick={completeEncounter}
            >
              Complete Run
            </PixelButton>
          </>
        );
    }
  };

  // For the game completion screen after defeating the boss
  if (gameCompleted) {
    return (
      <div className="p-8 text-center bg-surface pixel-borders">
        <PixelText className="text-4xl font-pixel-heading text-success mb-6">Congratulations!</PixelText>
        <div className="p-6 bg-surface-dark pixel-borders-thin max-w-2xl mx-auto mb-8">
          <p className="text-lg mb-4 font-pixel text-text-primary">
            You've successfully completed your first run as a Medical Physics Resident!
          </p>
          <p className="mb-4 font-pixel text-text-primary">
            You navigated through challenging scenarios, collected valuable items, and 
            successfully resolved the Ionix anomaly.
          </p>
          <p className="font-medium text-success font-pixel">
            In a full game, this would unlock permanent progression and new content.
          </p>
        </div>
        
        <PixelButton
          className="px-6 py-3 bg-success text-white hover:bg-green-600"
          onClick={() => window.location.reload()} // Simple way to restart for prototype
        >
          Start New Run
        </PixelButton>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders boss-container">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-boss pulse-animation mr-2"></div>
          <PixelText className="font-medium text-boss-light">Ionix</PixelText>
        </div>
        
        <div className="pixel-progress-bg w-48 h-4">
          <div 
            className="h-4 bg-boss" 
            style={{ width: `${bossHealth}%` }}
          ></div>
        </div>
      </div>
      
      {renderContent()}
      
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(204, 77, 77, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(204, 77, 77, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(204, 77, 77, 0);
          }
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}