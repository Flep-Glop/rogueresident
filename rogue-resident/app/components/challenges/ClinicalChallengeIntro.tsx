'use client';
import { useChallengeStore } from '../../store/challengeStore';

export default function ClinicalChallengeIntro() {
  const { currentChallenge, setStage } = useChallengeStore();
  
  if (!currentChallenge) return null;
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-blue-50 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">
        {currentChallenge.content.title}
      </h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Patient Information</h3>
        <p className="bg-white p-4 rounded border border-blue-200">
          {currentChallenge.content.patientInfo}
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Challenge Details</h3>
        <p className="bg-white p-4 rounded border border-blue-200">
          {currentChallenge.content.description}
        </p>
      </div>
      
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setStage('challenge')}
      >
        Begin Challenge
      </button>
    </div>
  );
}