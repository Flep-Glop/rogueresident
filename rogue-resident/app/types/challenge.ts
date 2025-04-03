// app/types/challenge.ts
export type ChallengeContent = 'calibration' | 'patient_case' | 'equipment_qa' | 'lecture';
export type ChallengeFormat = 'conversation' | 'interactive' | 'procedural';
export type CharacterId = 'kapoor' | 'quinn' | 'jesse' | 'garcia';

export interface ChallengeNode {
  id: string;
  title: string;
  description: string;
  content: ChallengeContent;
  format: ChallengeFormat;
  character: CharacterId;
  position: { x: number; y: number };
  connections: string[];
  insightReward: number;
  
  // Knowledge constellation integration
  requiredConcepts?: string[];
  taughtConcepts?: string[];
}