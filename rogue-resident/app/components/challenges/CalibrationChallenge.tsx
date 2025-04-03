// app/components/challenges/content/CalibrationChallenge.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { Character } from '../../../types/character';
import { DialogueStage } from '../../../hooks/useDialogueFlow';
import ConversationFormat from '../formats/ConversationFormat';

// Define challenge data
const CALIBRATION_DIALOGUE: Record<Character, DialogueStage[]> = {
  'kapoor': [
    // Your existing dialogue stages, removed for brevity
    // This would be the exact same content from KapoorCalibration
  ],
  'jesse': [
    // Alternative dialogue for Jesse teaching calibration
    // Not implemented yet, but structured for future expansion
  ]
};

interface CalibrationChallengeProps {
  character: Character;
}

export default function CalibrationChallenge({ character }: CalibrationChallengeProps) {
  // Use the conversation format with our dialogue data
  return (
    <ConversationFormat
      character={character}
      dialogueStages={CALIBRATION_DIALOGUE[character] || CALIBRATION_DIALOGUE['kapoor']}
      onComplete={(results) => {
        // Process completion, similar to logic in KapoorCalibration
      }}
    />
  );
}