// app/components/challenges/BossNode.tsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

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
              <h2 className="text-3xl font-bold text-blue-600 mb-4">Ionix Encounter</h2>
              <p className="mb-4">
                You've reached the containment chamber where Ionix, an experimental ion chamber, 
                has been displaying unusual behavior. The energy readings are off the charts, and 
                there are signs of what appears to be sentience.
              </p>
              <p className="mb-4">
                As you enter the chamber, the displays flicker and a pattern of energy pulses 
                seems to react to your presence. You'll need to use your medical physics knowledge
                to stabilize and understand this phenomenon.
              </p>
            </div>
            
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => advanceToPhase('phase1')}
            >
              Begin Encounter
            </button>
          </>
        );
        
      case 'phase1':
        return (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">Phase 1: Calibration Challenge</h2>
              <p className="mb-4">
                Ionix's energy output is fluctuating wildly. You need to calibrate your equipment
                to stabilize the readings and establish communication.
              </p>
              
              <div className="p-4 border border-blue-300 rounded-lg bg-blue-50 mb-6">
                <h3 className="font-bold mb-2">What's the appropriate first step?</h3>
                
                <div className="space-y-2">
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    Establish a baseline reading using a calibrated dosimeter at a safe distance
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    Immediately shut down all power to the containment system
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase1"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    Move closer to get a more accurate reading
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 ${feedback.includes('Correct') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {feedback}
                </div>
              )}
            </div>
            
            <button
              className={`px-6 py-2 rounded-lg transition-colors
                ${selectedAnswer ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </>
        );
        
      case 'phase2':
        return (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">Phase 2: Response to Erratic Behavior</h2>
              <p className="mb-4">
                Now that you've established basic readings, you notice Ionix's energy patterns are
                shifting in what appears to be a rhythmic sequence. You need to identify the pattern
                to predict and manage the energy fluctuations.
              </p>
              
              <div className="p-4 border border-blue-300 rounded-lg bg-blue-50 mb-6">
                <h3 className="font-bold mb-2">How should you analyze the energy pattern?</h3>
                
                <div className="space-y-2">
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    Record the energy frequency spectrum and look for harmonic patterns
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    Immediately apply dampening field at maximum strength
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase2"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    Ignore the patterns and focus only on containing peak energy outputs
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 ${feedback.includes('Great') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {feedback}
                </div>
              )}
            </div>
            
            <button
              className={`px-6 py-2 rounded-lg transition-colors
                ${selectedAnswer ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </>
        );
        
      case 'phase3':
        return (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">Phase 3: Resolution Approach</h2>
              <p className="mb-4">
                Your analysis indicates that Ionix has developed a form of rudimentary consciousness
                through quantum effects in its sensitive detection material. You need to decide on
                the best approach to resolve the situation.
              </p>
              
              <div className="p-4 border border-blue-300 rounded-lg bg-blue-50 mb-6">
                <h3 className="font-bold mb-2">What's the most appropriate resolution?</h3>
                
                <div className="space-y-2">
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'correct' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'correct'}
                      onChange={() => handleAnswerSelect('correct')}
                    />
                    Establish a stable containment field calibrated to the energy pattern and develop an interface for communication
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong1' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong1'}
                      onChange={() => handleAnswerSelect('wrong1')}
                    />
                    Completely deactivate Ionix by removing its power source
                  </label>
                  
                  <label className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedAnswer === 'wrong2' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}>
                    <input
                      type="radio"
                      name="phase3"
                      className="mr-2"
                      checked={selectedAnswer === 'wrong2'}
                      onChange={() => handleAnswerSelect('wrong2')}
                    />
                    Isolate Ionix in a lead-lined container to prevent further energy emissions
                  </label>
                </div>
              </div>
              
              {feedback && (
                <div className={`p-3 rounded-lg mb-4 ${feedback.includes('Perfect') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {feedback}
                </div>
              )}
            </div>
            
            <button
              className={`px-6 py-2 rounded-lg transition-colors
                ${selectedAnswer ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </>
        );
        
      case 'victory':
        return (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-blue-600 mb-4">Victory!</h2>
              
              <div className="p-6 border border-blue-300 rounded-lg bg-blue-50 mb-6">
                <p className="mb-4">
                  You've successfully established a stable interface with Ionix. The energy patterns
                  have stabilized, and what was once chaotic energy has transformed into a
                  controllable, even beneficial phenomenon.
                </p>
                <p className="mb-4">
                  The interface you've created allows for communication with this new form of
                  consciousness, opening up possibilities for research and collaboration.
                </p>
                <p className="font-medium text-blue-800">
                  Your knowledge of medical physics has not only saved the facility but potentially
                  opened a new chapter in our understanding of quantum effects in detection materials.
                </p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Rewards</h3>
                <p className="text-2xl font-bold text-blue-800">+200 Insight</p>
              </div>
            </div>
            
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto block"
              onClick={completeEncounter}
            >
              Complete Run
            </button>
          </>
        );
    }
  };

  // For the game completion screen after defeating the boss
  if (gameCompleted) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-6">Congratulations!</h1>
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-300 max-w-2xl mx-auto mb-8">
          <p className="text-lg mb-4">
            You've successfully completed your first run as a Medical Physics Resident!
          </p>
          <p className="mb-4">
            You navigated through challenging scenarios, collected valuable items, and 
            successfully resolved the Ionix anomaly.
          </p>
          <p className="font-medium text-blue-800">
            In a full game, this would unlock permanent progression and new content.
          </p>
        </div>
        
        <button
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          onClick={() => window.location.reload()} // Simple way to restart for prototype
        >
          Start New Run
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 pulse-animation mr-2"></div>
          <span className="font-medium text-blue-800">Ionix</span>
        </div>
        
        <div className="bg-gray-200 rounded-full h-4 w-48">
          <div 
            className="bg-red-500 h-4 rounded-full" 
            style={{ width: `${bossHealth}%` }}
          ></div>
        </div>
      </div>
      
      {renderContent()}
      
      <style jsx>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(66, 153, 225, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(66, 153, 225, 0);
          }
        }
      `}</style>
    </div>
  );
}