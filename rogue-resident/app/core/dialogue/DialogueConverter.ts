// app/core/dialogue/DialogueConverter.ts
/**
 * Dialogue Converter
 * 
 * A transformation system for converting between different dialogue representation formats.
 * This implements the "transformation, not translation" approach described in the migration
 * guide, creating a clean architectural break while preserving content investments.
 * 
 * Inspired by Supergiant's content pipeline evolution between Pyre and Hades.
 */

import { DialogueStage, DialogueOptionView } from '../../hooks/useDialogueFlow';
import { 
  DialogueState, 
  DialogueOption, 
  DialogueContext,
  DialogueFlow,
  createDialogueFlow
} from './DialogueStateMachine';
import { 
  AuthoredDialogue, 
  AuthoredDialogueNode, 
  AuthoredDialogueOption,
  convertAuthoredDialogue
} from './DialogueAuthoringFormat';

/**
 * Convert legacy dialogue stages to state machine compatible states
 * 
 * @param stages Legacy dialogue stages
 * @returns Record of state machine states
 */
export function convertLegacyStagesToStates(
  stages: DialogueStage[]
): Record<string, DialogueState> {
  const states: Record<string, DialogueState> = {};
  
  // Find initial state ID
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
  
  return states;
}

/**
 * Convert legacy stages to a dialogue flow
 * 
 * @param stages Legacy dialogue stages
 * @param characterId Character identifier
 * @param dialogueId Dialogue identifier
 * @param nodeId Current node ID for context
 * @returns Complete dialogue flow
 */
export function convertLegacyStagesToFlow(
  stages: DialogueStage[],
  characterId: string,
  dialogueId: string = `legacy-${characterId}-${Date.now()}`,
  nodeId: string = 'unknown'
): DialogueFlow {
  // Convert stages to states
  const states = convertLegacyStagesToStates(stages);
  
  // Find initial state ID
  const initialStateId = stages[0]?.id || 'intro';
  
  // Extract critical path stages
  const criticalPathStages = stages
    .filter(stage => stage.isCriticalPath)
    .map(stage => stage.id);
  
  // Create and return the flow
  return createDialogueFlow(
    dialogueId,
    states,
    initialStateId,
    {
      characterId,
      nodeId,
      playerScore: 0,
      selectedOptionIds: [],
      knowledgeGained: {},
      visitedStateIds: [initialStateId],
      criticalPathProgress: {},
      transactionIds: {}
    },
    undefined,
    criticalPathStages
  );
}

/**
 * Create a Kapoor calibration flow for the journal acquisition path
 * 
 * @param nodeId Current node ID
 * @returns Dialogue flow for Kapoor calibration
 */
export function createKapoorCalibrationFlow(nodeId: string): DialogueFlow {
  // This would typically load from authored dialogue
  // For now, create a minimal version that guarantees progression
  return createDialogueFlow(
    'kapoor-calibration',
    {
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2.",
        options: [
          { 
            id: "humble-intro",
            text: "I'm looking forward to learning the procedures.", 
            nextStateId: 'journal-presentation',
            responseText: "A positive attitude toward learning is the foundation of good practice.",
            relationshipChange: 1
          },
          { 
            id: "confident-intro",
            text: "I've done calibrations before during my internship.", 
            nextStateId: 'journal-presentation',
            responseText: "Previous experience is useful, but each facility has specific protocols.",
            relationshipChange: -1
          }
        ]
      },
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency.",
        isCriticalPath: true,
        isConclusion: true
      }
    },
    'intro',
    {
      characterId: 'kapoor',
      nodeId,
      playerScore: 0,
      selectedOptionIds: [],
      knowledgeGained: {},
      visitedStateIds: ['intro'],
      criticalPathProgress: {},
      transactionIds: {}
    },
    undefined,
    ['journal-presentation']
  );
}

/**
 * Convert state to view model for rendering
 * 
 * @param state Dialogue state
 * @param context Additional context
 * @returns View model for rendering
 */
export function convertStateToView(
  state: DialogueState,
  context?: DialogueContext
): {
  id: string;
  text: string;
  contextNote?: string;
  equipment?: any;
  options?: DialogueOptionView[];
  isConclusion?: boolean;
  isCriticalPath?: boolean;
} {
  if (!state) {
    return {
      id: 'loading',
      text: 'Loading dialogue...'
    };
  }
  
  // Convert options if present
  let options: DialogueOptionView[] | undefined;
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
  
  // Return view model
  return {
    id: state.id,
    text: state.text || '',
    contextNote: state.contextNote,
    equipment: state.equipment,
    options,
    isConclusion: state.isConclusion,
    isCriticalPath: state.isCriticalPath
  };
}

export default {
  convertLegacyStagesToStates,
  convertLegacyStagesToFlow,
  createKapoorCalibrationFlow,
  convertStateToView
};