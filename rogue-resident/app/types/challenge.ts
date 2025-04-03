// app/types/challenge.ts
export type ChallengeContent = 
  | 'calibration'    // Equipment calibration procedure
  | 'patient_case'   // Clinical treatment planning case
  | 'equipment_qa'   // Quality assurance for equipment 
  | 'lecture'        // Educational lecture/concept explanation
  | 'safety'         // Radiation safety procedure
  | 'storage';       // Legacy support for storage closet

export type ChallengeFormat = 
  | 'conversation'   // Dialogue-driven learning through character interaction
  | 'interactive'    // Interactive equipment manipulation and step sequencing
  | 'procedural';    // Ordered procedure step sequencing

export type CharacterId = 'kapoor' | 'quinn' | 'jesse' | 'garcia';

// Split equipment types for better type checking across components
export type BaseEquipmentType = 
  // QA equipment types
  | 'linac'             // Linear accelerator
  | 'ct'                // CT simulator
  | 'brachytherapy'     // Brachytherapy afterloader
  | 'dosimetry';        // Dosimetry equipment
  
export type InteractiveEquipmentType = 
  // Interactive equipment types  
  | 'ionization_chamber'  // Farmer chamber and dosimetry
  | 'linac_console'       // Treatment console
  | 'patient_positioning'; // Patient setup

export type EquipmentType = BaseEquipmentType | InteractiveEquipmentType;

export type ProcedureType = 
  | 'daily'           // Daily QA procedures
  | 'monthly'         // Monthly QA procedures
  | 'annual'          // Annual QA procedures
  | 'commissioning';  // Equipment commissioning

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
  
  // Optional challenge-specific properties
  equipmentType?: EquipmentType;
  procedureType?: ProcedureType;
  caseId?: string;  // For specific patient cases
  
  // Knowledge constellation integration
  requiredConcepts?: string[];
  taughtConcepts?: string[];
}

// Type guard functions for equipment types
export function isBaseEquipment(type: EquipmentType | undefined): type is BaseEquipmentType {
  return type === 'linac' || type === 'ct' || type === 'brachytherapy' || type === 'dosimetry';
}

export function isInteractiveEquipment(type: EquipmentType | undefined): type is InteractiveEquipmentType {
  return type === 'ionization_chamber' || type === 'linac_console' || type === 'patient_positioning';
}

// Challenge factory type for more extensible challenge creation
export type ChallengeFactory = {
  createChallenge: (node: ChallengeNode) => React.ReactNode;
};