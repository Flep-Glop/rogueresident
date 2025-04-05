// app/utils/dialogueLoader.ts
/**
 * Dialogue Loader Utility
 * 
 * A utility for loading dialogue content from the centralized repository.
 * This provides a simple API for accessing dialogue content throughout the game.
 */

import { DialogueStage } from '../hooks/useDialogueFlow';
import { CharacterId } from '../types/challenge';
import { 
  getDialogueContent, 
  getDialogueById, 
  getCriticalPathStages,
  DialogueRegistry
} from '../content/dialogues';

/**
 * Loading state for dialogue content
 */
export type DialogueLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Load dialogue content for a specific character and type
 * 
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue to load
 * @returns Object containing dialogue stages and loading state
 */
export function loadDialogueContent(characterId: CharacterId, dialogueType: string): {
  stages: DialogueStage[];
  loadingState: DialogueLoadingState;
  error?: string;
} {
  try {
    const dialogueContent = getDialogueContent(characterId, dialogueType);
    
    if (!dialogueContent) {
      console.warn(`No dialogue content found for ${characterId}, type: ${dialogueType}`);
      return {
        stages: [],
        loadingState: 'error',
        error: `Dialogue content not found for ${characterId}, type: ${dialogueType}`
      };
    }
    
    return {
      stages: dialogueContent,
      loadingState: 'loaded'
    };
  } catch (error) {
    console.error(`Error loading dialogue content: ${error}`);
    return {
      stages: [],
      loadingState: 'error',
      error: `Failed to load dialogue: ${error}`
    };
  }
}

/**
 * Load dialogue content by specific ID
 * 
 * @param dialogueId Unique dialogue identifier
 * @returns Object containing dialogue content and metadata
 */
export function loadDialogueById(dialogueId: string): {
  dialogueData: DialogueRegistry | null;
  loadingState: DialogueLoadingState;
  error?: string;
} {
  try {
    const dialogueData = getDialogueById(dialogueId);
    
    if (!dialogueData) {
      return {
        dialogueData: null,
        loadingState: 'error',
        error: `Dialogue with ID "${dialogueId}" not found`
      };
    }
    
    return {
      dialogueData,
      loadingState: 'loaded'
    };
  } catch (error) {
    console.error(`Error loading dialogue by ID: ${error}`);
    return {
      dialogueData: null,
      loadingState: 'error',
      error: `Failed to load dialogue by ID: ${error}`
    };
  }
}

/**
 * Get the critical path stages for a dialogue
 * 
 * @param dialogueId Dialogue identifier
 * @returns Array of critical path stage IDs
 */
export function loadCriticalPathStages(dialogueId: string): string[] {
  return getCriticalPathStages(dialogueId);
}

/**
 * Check if a dialogue stage is on the critical path
 * 
 * @param dialogueId Dialogue identifier
 * @param stageId Stage identifier
 * @returns Boolean indicating if the stage is on the critical path
 */
export function isStageOnCriticalPath(dialogueId: string, stageId: string): boolean {
  const criticalPaths = getCriticalPathStages(dialogueId);
  return criticalPaths.includes(stageId);
}

/**
 * Get a specific stage from a dialogue by ID
 * 
 * @param dialogueId Dialogue identifier
 * @param stageId Stage identifier to find
 * @returns The requested dialogue stage or null if not found
 */
export function getDialogueStage(dialogueId: string, stageId: string): DialogueStage | null {
  const dialogue = getDialogueById(dialogueId);
  if (!dialogue) return null;
  
  return dialogue.stages.find(stage => stage.id === stageId) || null;
}

export default {
  loadDialogueContent,
  loadDialogueById,
  loadCriticalPathStages,
  isStageOnCriticalPath,
  getDialogueStage
};