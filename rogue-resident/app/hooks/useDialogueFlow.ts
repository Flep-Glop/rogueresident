// app/hooks/useDialogueFlow.ts
/**
 * Streamlined Dialogue Flow Hook
 * 
 * A declarative API for dialogue management that shields components
 * from the complexity of the underlying state machine.
 * 
 * This revised implementation follows the one-way data flow pattern to
 * prevent circular dependencies and race conditions. Now it acts as a 
 * connector between UI components and the state management layer rather
 * than trying to own both responsibilities.
 * 
 * Pattern inspired by how Supergiant's Pyre and Hades handle conversation systems,
 * where content definition is cleanly separated from progression management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useEventBus, GameEventType } from '../core/events/CentralEventBus';
import { useDialogueStateMachine } from '../core/dialogue/DialogueStateMachine';

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
  // Event bus for dispatching events
  const eventBus = useEventBus();
  
  // Local tracking to avoid unnecessary renders
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const [isProgressionValid, setIsProgressionValid] = useState(true);
  const [progressionHistory, setProgressionHistory] = useState<string[]>([]);
  const [flowId, setFlowId] = useState<string>(`dialogue-${nodeId}-${characterId}`);
  
  // Access the dialogue state machine for state observation only
  const stateMachine = useDialogueStateMachine();
  
  // Track subscription cleanup references
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  
  // Initialize dialogue flow
  const initializeFlow = useCallback(() => {
    console.log(`[DialogueFlow] Initializing flow for ${characterId}, node ${nodeId}`);
    
    // Dispatch initialization event to start the dialogue flow
    eventBus.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId,
      initialStageId,
      stages: stages.map(stage => ({
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
      })),
      characterId,
      nodeId
    });
    
    // Log initialization
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'initialized',
      metadata: {
        characterId,
        nodeId,
        initialStageId,
        stageCount: stages.length
      }
    });
  }, [eventBus, flowId, initialStageId, stages, characterId, nodeId]);
  
  // Set up subscriptions for state sync
  const setupSubscriptions = useCallback(() => {
    // Clear any existing subscriptions
    unsubscribeRefs.current.forEach(unsub => unsub());
    unsubscribeRefs.current = [];
    
    // Subscribe to state machine state changes
    const unsubState = useDialogueStateMachine.subscribe(
      state => state.currentState?.id,
      (stateId) => {
        if (!stateId) return;
        
        // Only update if changed
        if (stateId !== currentStageId) {
          console.log(`[DialogueFlow] Syncing from state machine: ${currentStageId} -> ${stateId}`);
          
          // Update current stage ID
          setCurrentStageId(stateId);
          
          // Track critical path stages for analytics
          const stage = stages.find(s => s.id === stateId);
          if (stage?.isCriticalPath) {
            setProgressionHistory(prev => {
              if (prev.includes(`stage-${stateId}`)) return prev;
              return [...prev, `stage-${stateId}`];
            });
            
            // Log critical path progress
            eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'dialogueFlow',
              action: 'criticalPathStageReached',
              metadata: {
                stageId,
                characterId,
                nodeId
              }
            });
          }
          
          // Call the onStageChange callback
          if (onStageChange) {
            onStageChange(stateId, currentStageId);
          }
        }
      }
    );
    unsubscribeRefs.current.push(unsubState);
    
    // Subscribe to progression status changes
    const unsubProgression = useDialogueStateMachine.subscribe(
      state => {
        // Only run if there's an active flow
        if (!state.activeFlow) return null;
        
        const status = state.getProgressionStatus();
        return {
          criticalPathsCompleted: status.criticalPathsCompleted,
          loopDetected: status.loopDetected
        };
      },
      (status) => {
        if (!status) return;
        
        const newIsValid = status.criticalPathsCompleted && !status.loopDetected;
        
        if (isProgressionValid !== newIsValid) {
          setIsProgressionValid(newIsValid);
          
          // Log progression status change
          if (!newIsValid) {
            eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'dialogueFlow',
              action: 'progressionIssueDetected',
              metadata: {
                characterId,
                nodeId,
                progressionStatus: status
              }
            });
          }
        }
      }
    );
    unsubscribeRefs.current.push(unsubProgression);
    
    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];
    };
  }, [eventBus, currentStageId, onStageChange, stages, characterId, nodeId, isProgressionValid]);
  
  // Initialize on mount and clean up on unmount
  useEffect(() => {
    // Generate a stable flowId
    const newFlowId = `dialogue-${nodeId}-${characterId}-${Date.now()}`;
    setFlowId(newFlowId);
    
    // Initialize flow
    initializeFlow();
    
    // Set up subscriptions
    const cleanupSubscriptions = setupSubscriptions();
    
    // Cleanup on unmount
    return () => {
      // Clean up subscriptions
      cleanupSubscriptions();
      
      // Dispatch completion event
      eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
        flowId: newFlowId,
        completed: false, // Not a normal completion
        reason: 'component_unmounted',
        character: characterId,
        nodeId
      });
    };
  }, [eventBus, initializeFlow, setupSubscriptions, characterId, nodeId]);
  
  // Get the current stage object
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);
  
  // Handle player selecting a dialogue option
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Track critical path options
    if (option.isCriticalPath) {
      setProgressionHistory(prev => {
        if (prev.includes(`option-${option.id}`)) return prev;
        return [...prev, `option-${option.id}`];
      });
    }
    
    // Call the onOptionSelected callback if provided
    if (onOptionSelected) {
      onOptionSelected(option);
    }
    
    // Dispatch option selection event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'option-selected',
      metadata: {
        optionId: option.id,
        stageId: currentStageId,
        flowId
      }
    });
    
    // Also dispatch the main option selection event for broader system handling
    eventBus.dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentStageId,
      character: characterId,
      flowId,
      insightGain: option.insightGain || 0,
      relationshipChange: option.relationshipChange || 0,
      isCriticalPath: option.isCriticalPath || false,
      knowledgeGain: option.knowledgeGain
    });
  }, [eventBus, onOptionSelected, currentStageId, characterId, flowId]);
  
  // Progress dialogue to next state
  const handleContinue = useCallback(() => {
    // Dispatch continue event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'continue',
      metadata: {
        stageId: currentStageId,
        flowId
      }
    });
    
    return true;
  }, [eventBus, currentStageId, flowId]);
  
  // Show backstory segment
  const showBackstorySegment = useCallback((text: string) => {
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'show-backstory',
      metadata: {
        text,
        stageId: currentStageId,
        flowId
      }
    });
  }, [eventBus, currentStageId, flowId]);
  
  // Jump to specific stage
  const jumpToStage = useCallback((stageId: string) => {
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueFlow',
      action: 'jump-to-stage',
      metadata: {
        fromStageId: currentStageId,
        toStageId: stageId,
        flowId
      }
    });
    
    // Log stage jump
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'jumpToStage',
      metadata: {
        fromStageId: currentStageId,
        toStageId: stageId,
        characterId,
        nodeId
      }
    });
  }, [eventBus, currentStageId, characterId, nodeId, flowId]);
  
  // Start a narrative transaction
  const startTransaction = useCallback((
    type: 'journal_acquisition' | 'knowledge_revelation' | 'character_introduction' | 'boss_encounter',
    metadata: Record<string, any>
  ) => {
    // Dispatch transaction event instead of directly calling
    const transactionId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'startTransaction',
      metadata: {
        transactionId,
        transactionType: type,
        characterId,
        nodeId,
        additionalData: metadata
      }
    });
    
    return transactionId;
  }, [eventBus, characterId, nodeId]);
  
  // Complete a transaction
  const completeTransaction = useCallback((transactionId: string) => {
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'completeTransaction',
      metadata: {
        transactionId,
        characterId,
        nodeId
      }
    });
    
    return true;
  }, [eventBus, characterId, nodeId]);
  
  return {
    // Core state - read from state machine
    currentStage: getCurrentStage(),
    currentStageId,
    selectedOption: stateMachine.selectedOption,
    showResponse: stateMachine.showResponse,
    showBackstory: stateMachine.showBackstory,
    backstoryText: stateMachine.backstoryText,
    
    // Actions - dispatch events instead of mutating state
    handleOptionSelect,
    handleContinue,
    showBackstorySegment,
    setCurrentStageId: jumpToStage,
    
    // Progression tracking
    isProgressionValid,
    progressionHistory,
    
    // Transaction management
    startTransaction,
    completeTransaction,
    
    // For debugging only
    flowId
  };
}

export default useDialogueFlow;