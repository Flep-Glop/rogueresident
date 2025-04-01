// app/types/encounterTypes.ts
import { KnowledgeRequirement } from '../utils/knowledgeRequirements';

// Supported characters in the game
export type GameCharacter = 'kapoor' | 'quinn' | 'jesse';

// Character data interface
export interface CharacterData {
  id: GameCharacter;
  name: string;
  title: string;
  sprite: string;
  primaryColor: string;
  textClass: string;
  bgClass: string;
  introText: string;
  approachStyle: string;
}

// Response option in character dialogue
export interface DialogueResponseOption {
  id: string;
  text: string;
  responseText: string;
  insightGain?: number;
  knowledgeGain?: {
    domain: 'clinical' | 'technical' | 'theoretical' | 'general';
    conceptId?: string;
    amount: number;
  };
  requiresKnowledge?: KnowledgeRequirement;
  relationshipChange?: number; // -2 to +2
}

// Encounter node types for the map
export type EncounterNodeType = 
  | 'kapoor-calibration'  // Dr. Kapoor's LINAC calibration
  | 'jesse-repair'        // Technician Jesse's equipment repair
  | 'quinn-experiment'    // Dr. Quinn's experimental setup
  | 'storage-closet'      // Item collection
  | 'boss-ionix';         // Ionix boss encounter

// Encounter configuration
export interface EncounterConfig {
  type: EncounterNodeType;
  character?: GameCharacter;
  title: string;
  description: string;
  insightReward: number;
  knowledgeRewards?: Array<{
    domain: 'clinical' | 'technical' | 'theoretical' | 'general';
    conceptId?: string;
    amount: number;
  }>;
}

// Simplified node map with just 3 nodes
export const SIMPLIFIED_NODES: EncounterConfig[] = [
  {
    type: 'kapoor-calibration',
    character: 'kapoor',
    title: 'LINAC Output Calibration',
    description: 'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
    insightReward: 50
  },
  {
    type: 'quinn-experiment',
    character: 'quinn',
    title: 'Experimental Detection',
    description: 'Dr. Quinn is testing a modified radiation detector with unusual results.',
    insightReward: 50
  },
  {
    type: 'boss-ionix',
    character: 'quinn',
    title: 'Ionix Anomaly',
    description: 'An experimental ion chamber is exhibiting unexpected behavior.',
    insightReward: 100
  }
];