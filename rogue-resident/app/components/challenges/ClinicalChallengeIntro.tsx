'use client';
import { useChallengeStore } from '../../store/challengeStore';
import { PixelButton } from '../PixelThemeProvider';

export default function ClinicalChallengeIntro() {
  const { currentChallenge, setStage } = useChallengeStore();
  
  if (!currentChallenge) return null;
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders clinical-container">
      <h2 className="text-2xl font-pixel-heading text-clinical-light mb-6">
        {currentChallenge.content.title}
      </h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-pixel mb-2 text-text-primary">Patient Information</h3>
        <p className="bg-surface-dark p-4 rounded pixel-borders-thin text-text-primary font-pixel">
          {currentChallenge.content.patientInfo}
        </p>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-pixel mb-2 text-text-primary">Challenge Details</h3>
        <p className="bg-surface-dark p-4 rounded pixel-borders-thin text-text-primary font-pixel">
          {currentChallenge.content.description}
        </p>
      </div>
      
      <PixelButton
        className="bg-clinical hover:bg-clinical-light text-white"
        onClick={() => setStage('challenge')}
      >
        Begin Challenge
      </PixelButton>
    </div>
  );
}