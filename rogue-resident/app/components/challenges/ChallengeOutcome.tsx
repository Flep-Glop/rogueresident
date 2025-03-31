// app/components/challenges/ChallengeOutcome.tsx
'use client';
import { useState, useEffect } from 'react';
import { useChallengeStore, ChallengeGrade } from '../../store/challengeStore';
import { useGameStore } from '../../store/gameStore';
import { PixelButton, PixelText } from '../PixelThemeProvider';

// Grade-specific messages
const gradeMessages = {
  'S': "Perfect performance! Your medical physics knowledge is exceptional.",
  'A': "Excellent work! You've demonstrated strong understanding of the concepts.",
  'B': "Good job! You've shown solid knowledge with some room for improvement.",
  'C': "You've completed the challenge, but might want to review these concepts further."
};

// Grade-specific colors
const gradeColors = {
  'S': {
    bg: 'bg-purple-900',
    text: 'text-purple-300',
    border: 'border-purple-700',
    glow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)]'
  },
  'A': {
    bg: 'bg-green-900',
    text: 'text-green-300',
    border: 'border-green-700',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]'
  },
  'B': {
    bg: 'bg-blue-900',
    text: 'text-blue-300',
    border: 'border-blue-700',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'
  },
  'C': {
    bg: 'bg-amber-900',
    text: 'text-amber-300',
    border: 'border-amber-700',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]'
  }
};

export default function ChallengeOutcome() {
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { currentNodeId, completedNodeIds } = useGameStore();
  const [showGrade, setShowGrade] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    // Verify node is properly marked as completed
    if (currentNodeId && !completedNodeIds.includes(currentNodeId)) {
      console.warn(`Node ${currentNodeId} not marked as completed - forcing completion`);
      useGameStore.getState().completeNode(currentNodeId);
    }
    
    // Debug state when component mounts
    console.log("ChallengeOutcome: Current challenge:", currentChallenge);
    console.log("ChallengeOutcome: Current node ID:", currentNodeId);
    console.log("ChallengeOutcome: Completed nodes:", completedNodeIds);
    
    // Sequence of animations
    const gradeTimer = setTimeout(() => setShowGrade(true), 500);
    const rewardsTimer = setTimeout(() => setShowRewards(true), 1500);
    const buttonTimer = setTimeout(() => setShowButton(true), 2500);
    
    return () => {
      clearTimeout(gradeTimer);
      clearTimeout(rewardsTimer);
      clearTimeout(buttonTimer);
    };
  }, [currentNodeId, completedNodeIds, currentChallenge]);
  
  if (!currentChallenge) return null;
  
  // Get grade from state (set during completeChallenge)
  const grade = (currentChallenge as any).grade as ChallengeGrade;
  
  // Reward mapping
  const rewards = {
    'S': 100,
    'A': 75,
    'B': 50,
    'C': 25
  };
  
  const colors = gradeColors[grade];
  
  const handleReturnToMap = () => {
    console.log("Returning to map from challenge outcome");
    console.log("Current completed nodes:", useGameStore.getState().completedNodeIds);
    resetChallenge();
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders text-center">
      <PixelText className="text-3xl text-clinical-light font-pixel-heading mb-8">
        Challenge Complete!
      </PixelText>
      
      <div className="mb-10 transition-all duration-500 transform translate-y-0 opacity-100">
        {/* Grade display */}
        <div className={`
          inline-flex flex-col items-center mb-4
          transition-all duration-1000 transform 
          ${showGrade ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>
          <div className={`
            w-32 h-32 rounded-full text-white text-6xl font-pixel
            flex items-center justify-center mb-4
            ${colors.bg} ${colors.border} ${colors.glow} pixel-borders
            animate-pixel-pulse
          `}>
            <span className="flex items-center justify-center">{grade}</span>
          </div>
          
          <PixelText className="text-xl text-text-primary mb-2">Performance Grade</PixelText>
          
          <div className={`mt-2 ${colors.text} px-4 py-2 rounded-full ${colors.bg} inline-block pixel-borders-thin`}>
            <PixelText>{gradeMessages[grade]}</PixelText>
          </div>
        </div>
        
        {/* Rewards */}
        <div className={`
          my-8 p-6 rounded-lg ${colors.bg} ${colors.border} pixel-borders
          transition-all duration-1000 transform
          ${showRewards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>
          <PixelText className="text-xl text-white mb-4">Rewards</PixelText>
          
          <div className="flex justify-center items-center space-x-8">
            {/* Insight reward */}
            <div className="text-center">
              <div className="text-3xl font-pixel text-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                +{rewards[grade]}
              </div>
              <PixelText className="text-gray-300">Insight Points</PixelText>
            </div>
            
            {/* Experience reward - would connect to meta-progression in full game */}
            <div className="text-center opacity-50">
              <div className="text-3xl font-pixel text-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                +{Math.round(rewards[grade] / 2)}
              </div>
              <PixelText className="text-gray-300">Experience 
                <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                  Full Game
                </span>
              </PixelText>
            </div>
          </div>
        </div>
      </div>
      
      <PixelButton
        className={`
          px-8 py-3 bg-clinical text-white hover:bg-clinical-light
          shadow-pixel-md hover:shadow-pixel-lg transform transition-all duration-300
          hover:-translate-y-1 font-pixel text-lg
          ${showButton ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleReturnToMap}
      >
        Return to Map
      </PixelButton>
    </div>
  );
}