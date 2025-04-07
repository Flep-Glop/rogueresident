// app/utils/dialogueLoader.ts
/**
 * Enhanced Dialogue Loader
 * 
 * A robust utility for loading dialogue content and transforming it into 
 * state machine format. This serves as the bridge between authored content and runtime
 * representation, ensuring consistent dialogue behavior throughout the game.
 * 
 * This implementation follows Supergiant's pattern of transformative loading,
 * where content is converted on-demand rather than maintaining parallel systems.
 */

import { DialogueStage } from '../hooks/useDialogueFlow';
import { DialogueState, DialogueFlow, createDialogueFlow } from '../core/dialogue/DialogueStateMachine';
import { AuthoredDialogueNode, AuthoredDialogue, convertAuthoredDialogue } from '../core/dialogue/DialogueAuthoringFormat';
import { CharacterId } from '../types/challenge';
import { 
  getDialogueContent, 
  getDialogueById, 
  getCriticalPathStages,
  DialogueRegistry
} from '../data/dialogues';

/**
 * Loading state for dialogue content
 */
export type DialogueLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Result of a dialogue loading operation
 */
export interface DialogueLoadingResult<T> {
  data: T | null;
  loadingState: DialogueLoadingState;
  error?: string;
}

/**
 * Load dialogue content for a specific character and type
 * Supports both legacy DialogueStage format and state machine format
 * 
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue to load
 * @param nodeId Current node ID for context
 * @returns Object containing dialogue content and loading state
 */
export function loadDialogueContent(
  characterId: CharacterId, 
  dialogueType: string,
  nodeId?: string
): DialogueLoadingResult<DialogueStage[]> {
  try {
    const dialogueContent = getDialogueContent(characterId, dialogueType);
    
    if (!dialogueContent) {
      console.warn(`No dialogue content found for ${characterId}, type: ${dialogueType}`);
      return {
        data: null,
        loadingState: 'error',
        error: `Dialogue content not found for ${characterId}, type: ${dialogueType}`
      };
    }
    
    return {
      data: dialogueContent,
      loadingState: 'loaded'
    };
  } catch (error) {
    console.error(`Error loading dialogue content: ${error}`);
    return {
      data: null,
      loadingState: 'error',
      error: `Failed to load dialogue: ${error}`
    };
  }
}

/**
 * Load dialogue as a state machine flow - preferred method for new implementations
 * 
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue to load
 * @param nodeId Current node ID for context
 * @returns Object containing dialogue flow and loading state
 */
export function loadDialogueAsFlow(
  characterId: CharacterId, 
  dialogueType: string,
  nodeId: string = 'unknown'
): DialogueLoadingResult<DialogueFlow> {
  try {
    // First try to get authored dialogue in the new format
    const authoredDialogue = getAuthoredDialogue(characterId, dialogueType);
    
    if (authoredDialogue) {
      // Convert authored dialogue to state machine format
      const { states, initialStateId, progressionCheckpoints } = convertAuthoredDialogue(authoredDialogue);
      
      // Create dialogue flow from converted content
      const flow = createDialogueFlow(
        `${characterId}-${dialogueType}`,
        states,
        initialStateId,
        {
          characterId,
          nodeId
        }
      );
      
      return {
        data: flow,
        loadingState: 'loaded'
      };
    }
    
    // Fall back to legacy format for backward compatibility
    const legacyContent = getDialogueContent(characterId, dialogueType);
    
    if (!legacyContent) {
      return {
        data: null,
        loadingState: 'error',
        error: `Dialogue content not found for ${characterId}, type: ${dialogueType}`
      };
    }
    
    // Convert legacy content to state machine format
    const flow = convertLegacyToFlow(legacyContent, characterId, dialogueType, nodeId);
    
    return {
      data: flow,
      loadingState: 'loaded'
    };
  } catch (error) {
    console.error(`Error loading dialogue as flow: ${error}`);
    return {
      data: null,
      loadingState: 'error',
      error: `Failed to load dialogue as flow: ${error}`
    };
  }
}

/**
 * Convert legacy dialogue stages to a state machine flow
 * 
 * @param stages Legacy dialogue stages
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue
 * @param nodeId Current node ID
 * @returns DialogueFlow object
 */
function convertLegacyToFlow(
  stages: DialogueStage[],
  characterId: CharacterId,
  dialogueType: string,
  nodeId: string
): DialogueFlow {
  // Map legacy stages to state machine states
  const states: Record<string, DialogueState> = {};
  
  // Find critical path stages
  const criticalPaths = stages
    .filter(stage => stage.isCriticalPath)
    .map(stage => stage.id);
  
  // Find initial stage ID
  const initialStateId = stages[0]?.id || 'intro';
  
  // Convert each stage to a state
  stages.forEach(stage => {
    // Determine state type
    let stateType: 'intro' | 'question' | 'response' | 'backstory' | 'conclusion' | 'critical-moment' | 'transition' = 
      stage.type === 'backstory' ? 'backstory' :
      stage.isConclusion ? 'conclusion' :
      stage.isCriticalPath ? 'critical-moment' :
      stage.options && stage.options.length > 0 ? 'question' :
      stage.id === initialStateId ? 'intro' : 'transition';
    
    // Map options to state machine format
    const options = stage.options?.map(option => ({
      id: option.id,
      text: option.text,
      responseText: option.responseText,
      nextStateId: option.nextStageId,
      insightGain: option.insightGain,
      relationshipChange: option.relationshipChange,
      knowledgeGain: option.knowledgeGain,
      triggersBackstory: option.triggersBackstory,
      isCriticalPath: option.isCriticalPath
    }));
    
    // Add the state
    states[stage.id] = {
      id: stage.id,
      type: stateType,
      text: stage.text,
      contextNote: stage.contextNote,
      equipment: stage.equipment,
      options,
      nextStateId: stage.nextStageId,
      isConclusion: stage.isConclusion,
      isCriticalPath: stage.isCriticalPath,
      isMandatory: stage.isMandatory
    };
  });
  
  // Create the flow using the helper function
  return createDialogueFlow(
    `${characterId}-${dialogueType}`,
    states,
    initialStateId,
    {
      characterId,
      nodeId
    }
  );
}

/**
 * Get authored dialogue in the new format, if available
 * 
 * @param characterId Character identifier
 * @param dialogueType Type of dialogue
 * @returns Authored dialogue or null if not found
 */
function getAuthoredDialogue(characterId: CharacterId, dialogueType: string): AuthoredDialogue | null {
  // This would be implemented to retrieve authored dialogue from the content system
  // For now, returning null to fall back to legacy content
  return null;
}

/**
 * Load dialogue content by specific ID
 * 
 * @param dialogueId Unique dialogue identifier
 * @returns Object containing dialogue content and metadata
 */
export function loadDialogueById(dialogueId: string): DialogueLoadingResult<DialogueRegistry> {
  try {
    const dialogueData = getDialogueById(dialogueId);
    
    if (!dialogueData) {
      return {
        data: null,
        loadingState: 'error',
        error: `Dialogue with ID "${dialogueId}" not found`
      };
    }
    
    return {
      data: dialogueData,
      loadingState: 'loaded'
    };
  } catch (error) {
    console.error(`Error loading dialogue by ID: ${error}`);
    return {
      data: null,
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

/**
 * Create a conversion function for generating stage view models
 * This is useful for bridging the gap during migration
 * 
 * @param characterId Character identifier
 * @param enableMemory Whether to enable memory integration
 * @returns Function to convert state to view model
 */
export function createStateViewTransformer(characterId: CharacterId, enableMemory: boolean = true) {
  return function transformStateToView(state: DialogueState, context?: any) {
    if (!state) {
      return {
        id: 'loading',
        text: 'Loading dialogue...'
      };
    }
    
    // TODO: Apply memory system here if enabled
    
    // Convert options if present
    let options = undefined;
    if (state.options && state.options.length > 0) {
      options = state.options.map(option => ({
        id: option.id,
        text: option.text,
        responseText: option.responseText,
        nextStageId: option.nextStateId,
        insightGain: option.insightGain,
        relationshipChange: option.relationshipChange,
        knowledgeGain: option.knowledgeGain,
        isCriticalPath: option.isCriticalPath,
        triggersBackstory: option.triggersBackstory
      }));
    }
    
    // Create view model
    return {
      id: state.id,
      text: state.text || '',
      contextNote: state.contextNote,
      equipment: state.equipment,
      options,
      isCriticalPath: state.isCriticalPath,
      isConclusion: state.isConclusion
    };
  };
}

export default {
  loadDialogueContent,
  loadDialogueAsFlow,
  loadDialogueById,
  loadCriticalPathStages,
  isStageOnCriticalPath,
  getDialogueStage,
  createStateViewTransformer
};