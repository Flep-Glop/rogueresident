// app/hooks/useDialogueFlow.ts
/**
 * Enhanced useDialogueFlow hook
 * 
 * A refined implementation that separates UI concerns from state management,
 * following the pattern used in narrative-driven roguelikes where dialogue
 * state is centralized but UI interactions remain flexible.
 */

import { useState, useEffect, useRef } from 'react';
import { useEventBus, GameEventType } from '../core/events/CentralEventBus';
import { useDialogueStateMachine } from '../core/dialogue/DialogueStateMachine';
import { shallow } from 'zustand/shallow';

// Type imports
import type { DialogueStage, DialogueOption } from '../core/events/EventTypes';
import type { DialogueState, DialogueContext } from '../core/dialogue/DialogueStateMachine';

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
  selectedOption: DialogueOption | null;
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
  
  // Get event bus and state machine singletons
  const eventBus = useEventBus.getState();
  const stateMachine = useDialogueStateMachine.getState();
  
  // Create internal dialogue flow ID for tracking
  const dialogueFlowIdRef = useRef(`dialogue-${characterId}-${Date.now()}`);
  const initializedRef = useRef(false);
  
  // Get current state using Zustand's selector pattern for performance
  // This is the key part of the Zustand subscription pattern - only subscribing
  // to specific pieces of state to minimize re-renders
  const {
    currentState,
    context,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText
  } = useDialogueStateMachine(state => ({
    currentState: state.currentState,
    context: state.context,
    selectedOption: state.selectedOption,
    showResponse: state.showResponse,
    showBackstory: state.showBackstory,
    backstoryText: state.backstoryText
  }), shallow); // Using shallow equality to prevent unnecessary re-renders
  
  // Map stages to their IDs for lookup
  const stageMapRef = useRef<Record<string, DialogueStage>>({});
  if (Object.keys(stageMapRef.current).length === 0) {
    stages.forEach(stage => { 
      stageMapRef.current[stage.id] = stage; 
    });
  }
  
  // Track current stage state
  const initialStageId = stages[0]?.id || 'intro';
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const prevStageIdRef = useRef('');
  
  // Current stage based on mapping
  const currentStage = stageMapRef.current[currentStageId] || stages[0];
  
  // Initialize dialogue flow
  useEffect(() => {
    if (initializedRef.current) return;
    
    // Convert our stages to state machine format
    const states: Record<string, DialogueState> = {};
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
        type: stateType as any,
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
      initialStateId,
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
  
  // Subscribe to state changes - properly typed subscription with cleanup
  useEffect(() => {
    // This is the key part of the subscription pattern:
    // 1. We use a typed selector to only get the state ID
    // 2. We provide a typed callback to handle changes
    // 3. We store the unsubscribe function to clean up properly
    const unsubState = useDialogueStateMachine.subscribe(
      state => state.currentState?.id,
      (stateId: string | undefined) => {
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
    
    // Clean up subscription when the component unmounts
    // This prevents memory leaks and stale callbacks
    return () => {
      unsubState();
    };
  }, [currentStageId, onStageChange]);
  
  // Handle option selection
  const handleOptionSelect = (option: DialogueOption) => {
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
  };
  
  // Handle continue button
  const handleContinue = () => {
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
  };
  
  // Jump to a specific stage
  const jumpToStage = (stageId: string) => {
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
  };
  
  // Get validation status for progression
  const progressionStatus = stateMachine.getProgressionStatus();
  const isProgressionValid = progressionStatus.criticalPathsCompleted;
  
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
    dialogueStateMachine: {
      dispatch: stateMachine.dispatch,
      getAvailableOptions: stateMachine.getAvailableOptions,
      getProgressionStatus: stateMachine.getProgressionStatus
    }
  };
}

export type { DialogueStage, DialogueOption };

export default useDialogueFlow;