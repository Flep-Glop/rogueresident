// app/components/challenges/ChallengeOutcome.tsx
'use client';
import { useState, useEffect } from 'react';
import { useChallengeStore, ChallengeGrade } from '../../store/challengeStore';

// Grade-specific messages
const gradeMessages = {
  'S': "Perfect performance! Your medical physics knowledge is exceptional.",
  'A': "Excellent work! You've demonstrated strong understanding of the concepts.",
  'B': "Good job! You've shown solid knowledge with some room for improvement.",
  'C': "You've completed the challenge, but might want to review these concepts further."
};

// Grade-specific animations
const gradeAnimations = {
  'S': 'animate-grade-s',
  'A': 'animate-grade-a',
  'B': 'animate-grade-b',
  'C': 'animate-grade-c'
};

export default function ChallengeOutcome() {
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const [showGrade, setShowGrade] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    // Sequence of animations
    const gradeTimer = setTimeout(() => setShowGrade(true), 500);
    const rewardsTimer = setTimeout(() => setShowRewards(true), 1500);
    const buttonTimer = setTimeout(() => setShowButton(true), 2500);
    
    return () => {
      clearTimeout(gradeTimer);
      clearTimeout(rewardsTimer);
      clearTimeout(buttonTimer);
    };
  }, []);
  
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
  
  // Grade color mapping
  const gradeColors = {
    'S': {
      bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      text: 'text-purple-700',
      light: 'bg-purple-100',
      border: 'border-purple-200'
    },
    'A': {
      bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      text: 'text-green-700',
      light: 'bg-green-100',
      border: 'border-green-200'
    },
    'B': {
      bg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      text: 'text-blue-700',
      light: 'bg-blue-100',
      border: 'border-blue-200'
    },
    'C': {
      bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
      text: 'text-amber-700',
      light: 'bg-amber-100',
      border: 'border-amber-200'
    }
  };
  
  const colors = gradeColors[grade];
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg text-center overflow-hidden">
      <h2 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
        Challenge Complete!
      </h2>
      
      <div className="mb-10 transition-all duration-500 transform translate-y-0 opacity-100">
        {/* Grade display */}
        <div className={`
          inline-flex flex-col items-center mb-4
          transition-all duration-1000 transform 
          ${showGrade ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>
          <div className={`
            w-32 h-32 rounded-full text-white text-6xl font-bold 
            flex items-center justify-center mb-4 shadow-lg
            ${colors.bg} ${gradeAnimations[grade]}
          `}>
            <span className="flex items-center justify-center">{grade}</span>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800">Performance Grade</h3>
          
          <p className={`mt-2 ${colors.text} px-4 py-2 rounded-full ${colors.light} inline-block`}>
            {gradeMessages[grade]}
          </p>
        </div>
        
        {/* Rewards */}
        <div className={`
          my-8 p-6 rounded-lg shadow-md ${colors.light} ${colors.border} border
          transition-all duration-1000 transform
          ${showRewards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Rewards</h3>
          
          <div className="flex justify-center items-center space-x-8">
            {/* Insight reward */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                +{rewards[grade]}
              </div>
              <p className="text-blue-800 font-medium">Insight Points</p>
            </div>
            
            {/* Experience reward - would connect to meta-progression in full game */}
            <div className="text-center opacity-50">
              <div className="text-3xl font-bold text-green-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                +{Math.round(rewards[grade] / 2)}
              </div>
              <p className="text-green-800 font-medium">Experience 
                <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                  Full Game
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <button
        className={`
          px-8 py-3 rounded-lg font-medium text-lg
          bg-blue-600 text-white hover:bg-blue-700
          shadow-md hover:shadow-lg transform transition-all duration-300
          hover:-translate-y-1
          ${showButton ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={resetChallenge}
      >
        Return to Map
      </button>
      
      <style jsx>{`
        @keyframes grade-s-animation {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(147, 51, 234, 0.5); }
        }
        @keyframes grade-a-animation {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 15px 7px rgba(16, 185, 129, 0.5); }
        }
        @keyframes grade-b-animation {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(59, 130, 246, 0.5); }
        }
        @keyframes grade-c-animation {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50% { transform: scale(1.03); box-shadow: 0 0 8px 4px rgba(251, 191, 36, 0.5); }
        }
        
        .animate-grade-s {
          animation: grade-s-animation 2s infinite;
        }
        .animate-grade-a {
          animation: grade-a-animation 2s infinite;
        }
        .animate-grade-b {
          animation: grade-b-animation 2s infinite;
        }
        .animate-grade-c {
          animation: grade-c-animation 2s infinite;
        }
      `}</style>
    </div>
  );
}