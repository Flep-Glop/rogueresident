'use client';
import { useChallengeStore } from '../../store/challengeStore';
import ClinicalChallengeIntro from './ClinicalChallengeIntro';
import ClinicalChallenge from './ClinicalChallenge';
import ChallengeOutcome from './ChallengeOutcome';

export default function ChallengeContainer() {
  const { currentChallenge } = useChallengeStore();
  
  if (!currentChallenge) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-gray-500">Select a node to begin challenge</p>
      </div>
    );
  }
  
  switch (currentChallenge.stage) {
    case 'intro':
      return <ClinicalChallengeIntro />;
    case 'challenge':
      return <ClinicalChallenge />;
    case 'outcome':
      return <ChallengeOutcome />;
    default:
      return null;
  }
}