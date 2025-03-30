'use client';
import { useChallengeStore, ChallengeGrade } from '../../store/challengeStore';

export default function ChallengeOutcome() {
  const { currentChallenge, resetChallenge } = useChallengeStore();
  
  if (!currentChallenge) return null;
  
  // Get grade from state (set during completeChallenge)
  const grade = (currentChallenge as any).grade as ChallengeGrade;
  
  // Reward mapping
  const rewards = {
    'C': 25,
    'B': 50,
    'A': 75,
    'S': 100
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-blue-50 rounded-lg text-center">
      <h2 className="text-3xl font-bold mb-6">Challenge Complete!</h2>
      
      <div className="mb-8">
        <div className={`
          inline-block w-24 h-24 rounded-full text-white text-5xl font-bold 
          flex items-center justify-center mb-4
          ${grade === 'S' ? 'bg-purple-600' : 
            grade === 'A' ? 'bg-green-600' : 
            grade === 'B' ? 'bg-blue-600' : 
            'bg-yellow-600'}
        `}>
          <span className="flex items-center justify-center">{grade}</span>
        </div>
        
        <h3 className="text-xl font-semibold">Performance Grade</h3>
      </div>
      
      <div className="mb-8 bg-white p-4 rounded border border-blue-200">
        <h3 className="text-lg font-semibold mb-2">Rewards</h3>
        <p className="text-2xl font-bold text-blue-800">+{rewards[grade]} Insight</p>
      </div>
      
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={resetChallenge}
      >
        Return to Map
      </button>
    </div>
  );
}