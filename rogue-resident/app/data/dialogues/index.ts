// app/content/dialogues/index.ts
/**
 * Dialogue Content System
 * 
 * A centralized repository for all dialogue content in the game.
 * This system separates dialogue content from presentation logic,
 * making it easier to edit, localize, and analyze dialogue flows.
 * 
 * Inspired by Supergiant's approach to narrative management in Hades,
 * where dialogue content is stored in a centralized system that enables
 * rapid iteration and extensive variation.
 */

import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';
import kapoorCalibrationDialogue from './calibrations/kapoor-calibration';
import jesseEquipmentDialogue from './calibrations/jesse-equipment';
import quinnTheoryDialogue from './calibrations/quinn-theory';

// Type definition for dialogue registries
export interface DialogueRegistry {
  id: string;
  character: CharacterId;
  type: 'calibration' | 'challenge' | 'tutorial' | 'boss' | 'story';
  stages: DialogueStage[];
  metadata: {
    title: string;
    description: string;
    tags: string[];
    version: string;
    lastUpdated: string;
    criticalPaths: string[];  // IDs of stages that are critical for progression
  };
}

// Master registry of all dialogues
const dialogueRegistry: Record<string, DialogueRegistry> = {
  'kapoor-calibration': {
    id: 'kapoor-calibration',
    character: 'kapoor',
    type: 'calibration',
    stages: kapoorCalibrationDialogue,
    metadata: {
      title: 'Kapoor Calibration Session',
      description: 'Initial calibration session with Dr. Kapoor that introduces the player to medical physics concepts.',
      tags: ['calibration', 'kapoor', 'journal-acquisition', 'tutorial'],
      version: '1.0.0',
      lastUpdated: '2025-03-31',
      criticalPaths: ['journal-presentation', 'correct-ptp', 'correct-tolerance', 'correct-clinical']
    }
  },
  'jesse-equipment': {
    id: 'jesse-equipment',
    character: 'jesse',
    type: 'calibration',
    stages: jesseEquipmentDialogue,
    metadata: {
      title: 'Jesse Equipment Tutorial',
      description: 'Equipment tutorial with Technician Jesse that introduces basic QA concepts.',
      tags: ['equipment', 'jesse', 'qa', 'tutorial'],
      version: '1.0.0',
      lastUpdated: '2025-03-31',
      criticalPaths: ['equipment-safety', 'qa-fundamentals']
    }
  },
  'quinn-theory': {
    id: 'quinn-theory',
    character: 'quinn',
    type: 'calibration',
    stages: quinnTheoryDialogue,
    metadata: {
      title: 'Quinn Theoretical Discussion',
      description: 'Theoretical discussion with Dr. Quinn that introduces advanced physics concepts.',
      tags: ['theory', 'quinn', 'advanced', 'quantum'],
      version: '1.0.0',
      lastUpdated: '2025-03-31',
      criticalPaths: ['quantum-understanding', 'theoretical-foundation']
    }
  }
};

/**
 * Get dialogue content for a specific character and type
 * 
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue to retrieve
 * @returns Dialogue stages array or null if not found
 */
export function getDialogueContent(characterId: CharacterId, dialogueType: string): DialogueStage[] | null {
  // Find matching dialogue in registry
  const dialogueEntry = Object.values(dialogueRegistry).find(entry => 
    entry.character === characterId && entry.type === dialogueType
  );
  
  return dialogueEntry?.stages || null;
}

/**
 * Get dialogue by specific ID
 * 
 * @param dialogueId Unique dialogue identifier
 * @returns Dialogue registry entry or null if not found
 */
export function getDialogueById(dialogueId: string): DialogueRegistry | null {
  return dialogueRegistry[dialogueId] || null;
}

/**
 * Get all critical path stage IDs for a dialogue
 * 
 * @param dialogueId Dialogue identifier
 * @returns Array of critical path stage IDs
 */
export function getCriticalPathStages(dialogueId: string): string[] {
  return dialogueRegistry[dialogueId]?.metadata.criticalPaths || [];
}

/**
 * Get all dialogues for a specific character
 * 
 * @param characterId Character identifier
 * @returns Array of dialogue registry entries
 */
export function getCharacterDialogues(characterId: CharacterId): DialogueRegistry[] {
  return Object.values(dialogueRegistry).filter(entry => 
    entry.character === characterId
  );
}

/**
 * Get all dialogues by type
 * 
 * @param type Dialogue type to filter by
 * @returns Array of dialogue registry entries
 */
export function getDialoguesByType(type: string): DialogueRegistry[] {
  return Object.values(dialogueRegistry).filter(entry => 
    entry.type === type
  );
}

// Expose dialogue registry for development tools
if (process.env.NODE_ENV !== 'production') {
  (window as any).dialogueRegistry = dialogueRegistry;
}

export default dialogueRegistry;