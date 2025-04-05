// app/hooks/useDialogueFlow.ts
/**
 * Streamlined Dialogue Flow Hook
 * 
 * A declarative API for dialogue management that shields components
 * from the complexity of the underlying state machine.
 * 
 * Drawing inspiration from Pyre's dialogue system, this approach
 * separates state management from presentation concerns and
 * provides a clear, predictable interface for dialogue components.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  useDialogueStateMachine, 
  DialogueState, 
  createDialogueFlow
} from '../core/dialogue/DialogueStateMachine';
import { useNarrativeTransaction } from '../core/dialogue/NarrativeTransaction';
import { useEventBus, GameEventType } from '../core/events/CentralEventBus';

// Dialogue option for game UI
export interface DialogueOption {
  id: string;
  text: string;
  nextStageId?: string;
  insightGain?: number;
  approach?: 'humble' | 'precision' | 'confidence';
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  responseText?: string;
  triggersBackstory?: boolean;
  isCriticalPath?: boolean;
  condition?: (context: any) => boolean;
}

// Dialogue stage for game UI
export interface DialogueStage {
  id: string;
  text: string;
  contextNote?: string;
  equipment?: {
    itemId: string;
    alt?: string;
    description?: string;
  };
  options?: DialogueOption[];
  nextStageId?: string;
  isConclusion?: boolean;
  isCriticalPath?: boolean;
  isMandatory?: boolean;
  maxVisits?: number;
  type?: 'intro' | 'question' | 'response' | 'backstory' | 'conclusion' | 'critical-moment';
  onEnter?: (context: any) => void;
  onExit?: (context: any) => void;
}

interface DialogueFlowOptions {
  initialStageId?: string;
  stages: DialogueStage[];
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  onOptionSelected?: (option: DialogueOption) => void;
  characterId?: string;
  nodeId?: string;
}

/**
 * A streamlined hook for dialogue flow management
 */
export function useDialogueFlow({
  initialStageId = 'intro',
  stages,
  onStageChange,
  onOptionSelected,
  characterId = 'unknown',
  nodeId = 'unknown',
}: DialogueFlowOptions) {
  // Local tracking to avoid unnecessary renders
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const [isProgressionValid, setIsProgressionValid] = useState(true);
  const [progressionHistory, setProgressionHistory] = useState<string[]>([]);
  
  // Track initialization status
  const isInitializedRef = useRef(false);
  
  // Access the dialogue state machine
  const stateMachine = useDialogueStateMachine();
  
  // Convert stages for state machine consumption - only done once at init
  const convertAndInitialize = useCallback(() => {
    // Skip if already initialized
    if (isInitializedRef.current) return;
    
    console.log(`[DialogueFlow] Initializing flow for ${characterId}, node ${nodeId}`);
    
    // Convert stages to state machine format
    const states: Record<string, DialogueState> = {};
    
    // Transform stages to states
    stages.forEach(stage => {
      states[stage.id] = {
        id: stage.id,
        type: stage.type || 'question',
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
          isCriticalPath: option.isCriticalPath,
          condition: option.condition
        })),
        nextStateId: stage.nextStageId,
        isConclusion: stage.isConclusion,
        isCriticalPath: stage.isCriticalPath,
        isMandatory: stage.isMandatory,
        maxVisits: stage.maxVisits,
        onEnter: stage.onEnter,
        onExit: stage.onExit
      };
    });
    
    // Create the flow
    const flow = createDialogueFlow(
      `dialogue-${nodeId}-${characterId}`,
      states,
      initialStageId,
      {
        characterId,
        nodeId,
        playerScore: 0,
        selectedOptionIds: [],
        knowledgeGained: {},
        visitedStateIds: [initialStageId],
        criticalPathProgress: {},
        transactionIds: {}
      }
    );
    
    // Initialize the flow in the state machine
    stateMachine.initializeFlow(flow);
    isInitializedRef.current = true;
    
    // Log initialization
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'initialized',
      metadata: {
        characterId,
        nodeId,
        initialStageId,
        stageCount: stages.length
      }
    });
  }, [stages, initialStageId, characterId, nodeId, stateMachine]);
  
  // Initialize on mount
  useEffect(() => {
    convertAndInitialize();
    
    // Cleanup on unmount - dispatch tracking event if not completed
    return () => {
      if (isInitializedRef.current && stateMachine.activeFlow) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'unmountedWithoutCompletion',
          metadata: {
            characterId,
            nodeId,
            currentStageId
          }
        });
      }
    };
  }, [convertAndInitialize, characterId, nodeId, currentStageId, stateMachine]);
  
  // Sync with state machine state changes
  useEffect(() => {
    if (!stateMachine.currentState || !isInitializedRef.current) return;
    
    const machineStageId = stateMachine.currentState.id;
    
    // Only update if changed
    if (machineStageId !== currentStageId) {
      console.log(`[DialogueFlow] Syncing from state machine: ${currentStageId} -> ${machineStageId}`);
      
      // Update current stage ID
      setCurrentStageId(machineStageId);
      
      // Track critical path stages for analytics
      const stage = stages.find(s => s.id === machineStageId);
      if (stage?.isCriticalPath) {
        setProgressionHistory(prev => {
          if (prev.includes(`stage-${machineStageId}`)) return prev;
          return [...prev, `stage-${machineStageId}`];
        });
        
        // Log critical path progress
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'criticalPathStageReached',
          metadata: {
            stageId: machineStageId,
            characterId,
            nodeId
          }
        });
      }
      
      // Call the onStageChange callback
      if (onStageChange) {
        onStageChange(machineStageId, currentStageId);
      }
    }
    
    // Update progression validity status
    const progressionStatus = stateMachine.getProgressionStatus();
    const newIsValid = progressionStatus.criticalPathsCompleted && !progressionStatus.loopDetected;
    
    if (isProgressionValid !== newIsValid) {
      setIsProgressionValid(newIsValid);
      
      // Log progression status change
      if (!newIsValid) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'progressionIssueDetected',
          metadata: {
            characterId,
            nodeId,
            progressionStatus
          }
        });
      }
    }
  }, [stateMachine.currentState, currentStageId, onStageChange, stages, characterId, nodeId, isProgressionValid]);
  
  // Get the current stage object
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);
  
  // Handle player selecting a dialogue option
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Skip if no state machine is active
    if (!stateMachine.activeFlow) {
      console.warn('[DialogueFlow] Cannot select option without active flow');
      return;
    }
    
    // Track critical path options
    if (option.isCriticalPath) {
      setProgressionHistory(prev => {
        if (prev.includes(`option-${option.id}`)) return prev;
        return [...prev, `option-${option.id}`];
      });
    }
    
    // Call the onOptionSelected callback
    if (onOptionSelected) {
      onOptionSelected(option);
    }
    
    // Forward to state machine
    stateMachine.selectOption(option.id);
    
    // Log option selection
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentStageId,
      character: characterId,
      flowId: `dialogue-${nodeId}`,
      insightGain: option.insightGain || 0,
      isCriticalPath: option.isCriticalPath || false
    });
  }, [onOptionSelected, stateMachine, currentStageId, characterId, nodeId]);
  
  // Progress dialogue to next state
  const handleContinue = useCallback(() => {
    // Skip if no state machine is active
    if (!stateMachine.activeFlow) {
      console.warn('[DialogueFlow] Cannot continue without active flow');
      return false;
    }
    
    // Log continue action
    console.log(`[DialogueFlow] Continuing from stage: ${currentStageId}`);
    
    // If actively typing, skip to the end
    if (stateMachine.showBackstory) {
      stateMachine.dispatch({ type: 'SET_BACKSTORY_VISIBILITY', visible: false });
      return true;
    } else if (stateMachine.showResponse) {
      stateMachine.dispatch({ type: 'SET_RESPONSE_VISIBILITY', visible: false });
      return true;
    }
    
    // Continue to next state
    stateMachine.advanceState();
    return true;
  }, [stateMachine, currentStageId]);
  
  // Show backstory segment from outside the state machine 
  const showBackstorySegment = useCallback((text: string) => {
    stateMachine.dispatch({ 
      type: 'SET_BACKSTORY_VISIBILITY', 
      visible: true,
      text
    });
  }, [stateMachine]);
  
  // Jump to specific stage
  const jumpToStage = useCallback((stageId: string) => {
    // Skip if no state machine is active
    if (!stateMachine.activeFlow) {
      console.warn('[DialogueFlow] Cannot jump to stage without active flow');
      return;
    }
    
    // Jump to the specified state
    stateMachine.jumpToState(stageId);
    
    // Log stage jump
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'jumpToStage',
      metadata: {
        fromStageId: currentStageId,
        toStageId: stageId,
        characterId,
        nodeId
      }
    });
  }, [stateMachine, currentStageId, characterId, nodeId]);
  
  // Start a narrative transaction
  const startTransaction = useCallback((
    type: 'journal_acquisition' | 'knowledge_revelation' | 'character_introduction' | 'boss_encounter',
    metadata: Record<string, any>
  ) => {
    const transactionId = useNarrativeTransaction.getState().startTransaction(
      type,
      metadata,
      characterId,
      nodeId
    );
    
    return transactionId;
  }, [characterId, nodeId]);
  
  // Complete a transaction
  const completeTransaction = useCallback((transactionId: string) => {
    return useNarrativeTransaction.getState().completeTransaction(transactionId);
  }, []);
  
  return {
    // Core state
    currentStage: getCurrentStage(),
    currentStageId,
    selectedOption: stateMachine.selectedOption,
    showResponse: stateMachine.showResponse,
    showBackstory: stateMachine.showBackstory,
    backstoryText: stateMachine.backstoryText,
    
    // Actions
    handleOptionSelect,
    handleContinue,
    showBackstorySegment,
    setCurrentStageId: jumpToStage,
    
    // Progression tracking
    isProgressionValid,
    progressionHistory,
    dialogueStateMachine: stateMachine, // For advanced use cases
    
    // Transaction management
    startTransaction,
    completeTransaction
  };
}

export default useDialogueFlow;