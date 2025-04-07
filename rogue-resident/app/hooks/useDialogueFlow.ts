// app/hooks/useDialogueFlow.ts
/**
 * Enhanced useDialogueFlow hook
 * 
 * A refined implementation that separates UI concerns from state management,
 * following the pattern used in narrative-driven roguelikes where dialogue
 * state is centralized but UI interactions remain flexible.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEventBus, GameEventType } from '../core/events';
import { 
  useDialogueStateMachine, 
  DialogueContext,
  DialogueOption as StateMachineOption 
} from '../core/dialogue/DialogueStateMachine';

// Define types that were previously imported
export interface DialogueStage {
  id: string;
  text: string;
  options?: DialogueOption[];
  nextStageId?: string;
  isConclusion?: boolean;
  isCriticalPath?: boolean;
  isMandatory?: boolean;
  type?: string;
  onEnter?: (context: DialogueContext) => void;
  onExit?: (context: DialogueContext) => void;
}

export interface DialogueOption {
  id: string;
  text: string;
  responseText?: string;
  nextStageId?: string;
  insightGain?: number;
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  triggersBackstory?: boolean;
  isCriticalPath?: boolean;
  condition?: (context: DialogueContext) => boolean;
}

// Interface for hook properties
interface UseDialogueFlowProps {
  stages: DialogueStage[];
  onOptionSelected?: (option: DialogueOption, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  characterId: string;
  nodeId?: string;
}

// Interface for hook return value
interface UseDialogueFlowReturn {
  // Current state
  currentStage: DialogueStage;
  currentStageId: string;
  selectedOption: StateMachineOption | null;
  showResponse: boolean;
  showBackstory: boolean;
  backstoryText: string;
  
  // Actions
  handleOptionSelect: (option: DialogueOption) => void;
  handleContinue: () => void;
  jumpToStage: (stageId: string) => void;
  
  // Helpers
  isProgressionValid: boolean;
  dialogueStateMachine: {
    dispatch: (action: any) => void;
    getAvailableOptions: () => any[];
    getProgressionStatus: () => any;
  };
}

/**
 * Enhanced hook for dialogue system integration
 * 
 * This hook creates a bridge between your UI dialogue flow and the
 * centralized state management system, with optimized subscriptions
 * that prevent unnecessary re-renders.
 */
export function useDialogueFlow({
  stages,
  onOptionSelected,
  onStageChange,
  characterId,
  nodeId = 'unknown'
}: UseDialogueFlowProps): UseDialogueFlowReturn {
  // Validate input
  if (!stages || stages.length === 0) {
    throw new Error('useDialogueFlow requires dialogue stages');
  }
  
  // Get event bus singleton
  const eventBus = useEventBus.getState();
  
  // Create internal dialogue flow ID for tracking
  const dialogueFlowIdRef = useRef(`dialogue-${characterId}-${Date.now()}`);
  const initializedRef = useRef(false);
  
  // Get state machine functions without creating a new object each time
  // We separate the functions from the state to avoid infinite loops
  const stateMachine = useDialogueStateMachine.getState();
  
  // Get current state using individual selectors for each piece of state
  // This is the KEY FIX to prevent infinite loops - individual selectors 
  // rather than one object selector
  const currentState = useDialogueStateMachine(state => state.currentState);
  const context = useDialogueStateMachine(state => state.context);
  const selectedOption = useDialogueStateMachine(state => state.selectedOption);
  const showResponse = useDialogueStateMachine(state => state.showResponse);
  const showBackstory = useDialogueStateMachine(state => state.showBackstory);
  const backstoryText = useDialogueStateMachine(state => state.backstoryText);
  
  // Map stages to their IDs for lookup - memoize to prevent needless updates
  const stageMapRef = useRef<Record<string, DialogueStage>>({});
  useEffect(() => {
    const stageMap: Record<string, DialogueStage> = {};
    stages.forEach(stage => { 
      stageMap[stage.id] = stage; 
    });
    stageMapRef.current = stageMap;
  }, [stages]);
  
  // Track current stage state
  const initialStageId = stages[0]?.id || 'intro';
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const prevStageIdRef = useRef('');
  
  // Current stage based on mapping
  const currentStage = stageMapRef.current[currentStageId] || stages[0];
  
  // Initialize dialogue flow
  useEffect(() => {
    if (initializedRef.current) return;
    
    console.log(`[DialogueFlow] Initializing flow for ${characterId}`);
    
    // Convert our stages to state machine format
    const states: Record<string, any> = {};
    const criticalPathIds: string[] = [];
    
    stages.forEach(stage => {
      const stateType = stage.type || 
                       (stage.options && stage.options.length > 0 ? 'question' : 'intro');
      
      // Track critical path IDs
      if (stage.isCriticalPath) {
        criticalPathIds.push(stage.id);
      }
      
      // Create state definition
      states[stage.id] = {
        id: stage.id,
        type: stateType,
        text: stage.text,
        options: stage.options?.map(option => ({
          id: option.id,
          text: option.text,
          responseText: option.responseText,
          nextStateId: option.nextStageId,
          insightGain: option.insightGain,
          relationshipChange: option.relationshipChange,
          knowledgeGain: option.knowledgeGain,
          triggersBackstory: option.triggersBackstory,
          isCriticalPath: option.isCriticalPath
        })),
        nextStateId: stage.nextStageId,
        isConclusion: stage.isConclusion,
        isCriticalPath: stage.isCriticalPath,
        isMandatory: stage.isMandatory
      };
    });
    
    // Create initial context
    const initialContext: DialogueContext = {
      characterId,
      nodeId,
      playerScore: 0,
      selectedOptionIds: [],
      knowledgeGained: {},
      visitedStateIds: [initialStageId],
      criticalPathProgress: {},
      transactionIds: {}
    };
    
    // Initialize in state machine
    stateMachine.initializeFlow({
      id: dialogueFlowIdRef.current,
      initialStateId: initialStageId,
      states,
      context: initialContext,
      progressionCheckpoints: criticalPathIds,
      onComplete: (finalContext) => {
        console.log(`Dialogue flow completed with score: ${finalContext.playerScore}`);
      }
    });
    
    // Mark as initialized
    initializedRef.current = true;
    
    // Dispatch dialogue started event
    eventBus.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: dialogueFlowIdRef.current,
      initialStageId,
      stages,
      characterId,
      nodeId
    });
    
    // Cleanup on unmount
    return () => {
      // Only dispatch completion if we initialized
      if (initializedRef.current) {
        eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
          flowId: dialogueFlowIdRef.current,
          completed: false,
          reason: 'component_unmounted',
          character: characterId,
          nodeId
        });
      }
    };
  }, [
    stateMachine, eventBus, stages, characterId, nodeId, 
    initialStageId
  ]);
  
  // Subscribe to state changes and handle state ID updates
  useEffect(() => {
    // Set up the subscription to just the state ID, not the whole state
    const unsubStateId = useDialogueStateMachine.subscribe(
      state => state.currentState?.id,
      (stateId) => {
        if (stateId && stateId !== currentStageId) {
          // Keep previous state ID for transitions
          prevStageIdRef.current = currentStageId;
          setCurrentStageId(stateId);
          
          // Call onStageChange if provided
          if (onStageChange) {
            onStageChange(stateId, prevStageIdRef.current);
          }
        }
      }
    );
    
    return () => {
      unsubStateId();
    };
  }, [currentStageId, onStageChange]);
  
  // Memoize handlers to prevent unnecessary recreations
  
  // Handle option selection
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Dispatch UI event first
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'option-selected',
      metadata: {
        optionId: option.id,
        stageId: currentStageId,
        insightGain: option.insightGain,
        relationshipChange: option.relationshipChange,
        character: characterId
      }
    });
    
    // Select option in state machine
    stateMachine.selectOption(option.id);
    
    // Call callback if provided
    if (onOptionSelected) {
      onOptionSelected(option, currentStageId);
    }
    
    // Dispatch detailed event with full context
    eventBus.dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentStageId,
      character: characterId,
      flowId: dialogueFlowIdRef.current,
      insightGain: option.insightGain,
      relationshipChange: option.relationshipChange,
      knowledgeGain: option.knowledgeGain,
      isCriticalPath: option.isCriticalPath
    });
  }, [
    eventBus, stateMachine, currentStageId, characterId, 
    onOptionSelected
  ]);
  
  // Handle continue button
  const handleContinue = useCallback(() => {
    // Dispatch UI event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'continue',
      metadata: {
        stageId: currentStageId,
        character: characterId
      }
    });
    
    // Advance state in state machine
    stateMachine.advanceState();
  }, [eventBus, stateMachine, currentStageId, characterId]);
  
  // Jump to a specific stage
  const jumpToStage = useCallback((stageId: string) => {
    if (!stageMapRef.current[stageId]) {
      console.error(`Cannot jump to unknown stage: ${stageId}`);
      return;
    }
    
    // Dispatch UI event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'jump-to-stage',
      metadata: {
        fromStageId: currentStageId,
        toStageId: stageId,
        character: characterId
      }
    });
    
    // Jump to state in state machine
    stateMachine.jumpToState(stageId);
  }, [eventBus, stateMachine, currentStageId, characterId]);
  
  // Calculate progression status without triggering a new render
  const getProgressionStatus = stateMachine.getProgressionStatus;
  const progressionStatus = getProgressionStatus();
  const isProgressionValid = progressionStatus.criticalPathsCompleted;
  
  // Get a stable reference to the state machine API
  const stateMachineAPI = useRef({
    dispatch: stateMachine.dispatch,
    getAvailableOptions: stateMachine.getAvailableOptions,
    getProgressionStatus: stateMachine.getProgressionStatus
  }).current;
  
  // Return needed state and methods
  return {
    currentStage,
    currentStageId,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText,
    
    handleOptionSelect,
    handleContinue,
    jumpToStage,
    
    isProgressionValid,
    dialogueStateMachine: stateMachineAPI
  };
}

export default useDialogueFlow;