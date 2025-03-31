'use client';
import { useChallengeStore } from '../../store/challengeStore';
import ClinicalChallengeIntro from './ClinicalChallengeIntro';
import ClinicalChallenge from './ClinicalChallenge';
import ChallengeOutcome from './ChallengeOutcome';
import { PixelText } from '../PixelThemeProvider';

export default function ChallengeContainer() {
  const { currentChallenge } = useChallengeStore();
  
  if (!currentChallenge) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="p-6 bg-surface pixel-borders text-center">
          <PixelText className="text-lg text-text-secondary">Select a node to begin challenge</PixelText>
        </div>
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