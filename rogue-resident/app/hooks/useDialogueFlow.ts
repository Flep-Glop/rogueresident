// app/hooks/useDialogueFlow.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDialogueStateMachine, DialogueState } from '../core/dialogue/DialogueStateMachine';
import { useEventBus, GameEventType } from '../core/events/CentralEventBus';

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
 * A streamlined hook that manages dialogue flow using the formal DialogueStateMachine.
 * 
 * Enhanced with reentrant safety guards and optimized render logic to prevent 
 * infinite update loops and stack overflows.
 */
export function useDialogueFlow({
  initialStageId = 'intro',
  stages,
  onStageChange,
  onOptionSelected,
  characterId = 'unknown',
  nodeId = 'unknown',
}: DialogueFlowOptions) {
  // Track local UI state synchronized with the state machine
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const [isProgressionValid, setIsProgressionValid] = useState(true);
  const [progressionHistory, setProgressionHistory] = useState<string[]>([]);
  
  // Important refs for state tracking to prevent update loops
  const visitedStagesRef = useRef<Set<string>>(new Set([initialStageId]));
  const progressionValidatedRef = useRef<boolean>(false);
  const prevProgressionStatusRef = useRef<boolean>(true);
  const isUpdatingRef = useRef<boolean>(false);
  
  // Access the dialogue state machine
  const stateMachine = useDialogueStateMachine();
  
  // Helper to convert stages format to state machine states
  const convertStagesToStates = useCallback(() => {
    const states: Record<string, DialogueState> = {};
    
    stages.forEach(stage => {
      // Map DialogueStage to DialogueState
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
          knowledgeGain: option.knowledgeGain ? {
            conceptId: option.knowledgeGain.conceptId,
            domainId: option.knowledgeGain.domainId,
            amount: option.knowledgeGain.amount
          } : undefined,
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
    
    return states;
  }, [stages]);
  
  // Initialize state machine on mount
  useEffect(() => {
    // Only initialize if not already active
    if (!stateMachine.activeFlow) {
      console.log(`[DialogueFlow] Initializing dialogue flow for ${characterId}`);
      
      // Convert stages to state machine format
      const states = convertStagesToStates();
      
      // Critical path checkpoints for progression validation
      const criticalCheckpoints = stages
        .filter(stage => stage.isCriticalPath)
        .map(stage => stage.id);
      
      // Initialize the flow
      stateMachine.initializeFlow({
        id: `dialogue-${nodeId}-${characterId}`,
        initialStateId: initialStageId,
        states,
        context: {
          characterId,
          nodeId,
          playerScore: 0,
          selectedOptionIds: [],
          knowledgeGained: {},
          visitedStateIds: [initialStageId],
          loopDetection: { [initialStageId]: 1 },
          criticalPathProgress: {}
        },
        progressionCheckpoints: criticalCheckpoints,
      });
      
      // Track initial stage visit
      visitedStagesRef.current.add(initialStageId);
      
      // Log initialization through event system
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'dialogueFlow',
        action: 'initialized',
        metadata: {
          characterId,
          nodeId,
          initialStageId,
          hasCriticalPaths: criticalCheckpoints.length > 0
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      // Log if dialogue was abandoned without completing
      if (stateMachine.activeFlow && !progressionValidatedRef.current) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'unmountedWithoutValidation',
          metadata: {
            characterId,
            nodeId,
            currentStageId,
            visitedStages: Array.from(visitedStagesRef.current)
          }
        });
      }
    };
  }, [
    stateMachine, 
    convertStagesToStates, 
    initialStageId, 
    characterId, 
    nodeId, 
    currentStageId
  ]);
  
  // Sync with state machine state changes - ENHANCED WITH RECURSION PROTECTION
  useEffect(() => {
    // Skip if we're already updating or if no state machine state exists
    if (isUpdatingRef.current || !stateMachine.currentState) return;
    
    // Set updating flag to prevent re-entrancy
    isUpdatingRef.current = true;
    
    try {
      const machineStageId = stateMachine.currentState.id;
      
      // If state machine's stage differs from our local state, sync them
      if (machineStageId !== currentStageId) {
        console.log(`[DialogueFlow] Syncing from state machine: ${currentStageId} -> ${machineStageId}`);
        
        // Update current stage ID
        setCurrentStageId(machineStageId);
        
        // Track stage visit
        visitedStagesRef.current.add(machineStageId);
        
        // Check if this is a critical path stage
        const stage = stages.find(s => s.id === machineStageId);
        if (stage?.isCriticalPath) {
          // Update progression history for analytics
          setProgressionHistory(prev => {
            // Only add if not already present (prevents duplicates)
            if (prev.includes(`stage-${machineStageId}`)) return prev;
            return [...prev, `stage-${machineStageId}`];
          });
          
          // Log critical path progress - with safe event dispatch
          setTimeout(() => {
            if (stage?.isCriticalPath) {
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
          }, 0);
        }
        
        // Call the onStageChange callback
        if (onStageChange) {
          onStageChange(machineStageId, currentStageId);
        }
      }
      
      // Update progression validity status - CRITICAL LOOP PREVENTION
      const progressionStatus = stateMachine.getProgressionStatus();
      const newIsValid = !progressionStatus.progressionBlocked;
      
      // Only update if changed to prevent infinite render loops
      if (prevProgressionStatusRef.current !== newIsValid) {
        prevProgressionStatusRef.current = newIsValid;
        setIsProgressionValid(newIsValid);
      }
      
      // Auto-repair progression issues with minimal delay
      if (progressionStatus.progressionBlocked && !progressionValidatedRef.current) {
        console.warn(`[DialogueFlow] Progression issue detected:`, progressionStatus);
        
        // Log the issue using a safe event dispatch pattern
        setTimeout(() => {
          useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
            componentId: 'dialogueFlow',
            action: 'progressionBlockDetected',
            metadata: {
              characterId,
              nodeId,
              currentStageId: machineStageId,
              progressionStatus
            }
          });
        }, 0);
        
        // Immediate repair for critical flows - ensures safe delay
        if (characterId === 'kapoor') {
          console.log(`[DialogueFlow] Attempting immediate progression repair`);
          setTimeout(() => {
            stateMachine.forceProgressionRepair();
          }, 100);
        }
      }
      
      // Mark critical progression points
      if ((stateMachine.currentState.isConclusion || stateMachine.currentState.isCriticalPath)
          && characterId === 'kapoor') {
        
        progressionValidatedRef.current = true;
        
        // Special validation for journal presentation
        if (machineStageId === 'journal-presentation') {
          // Use safe event dispatching
          setTimeout(() => {
            useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'dialogueFlow',
              action: 'journalStageValidated',
              metadata: {
                characterId,
                nodeId,
                visitedStages: Array.from(visitedStagesRef.current),
                progressionHistory
              }
            });
          }, 0);
        }
      }
    } finally {
      // Important - always clear updating flag even if errors occur
      isUpdatingRef.current = false;
    }
  }, [
    stateMachine.currentState, 
    currentStageId, 
    onStageChange, 
    stages, 
    characterId, 
    nodeId, 
    progressionHistory
  ]);
  
  // Get the current stage object
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);
  
  // Handle player selecting a dialogue option - WITH RE-ENTRANCY PROTECTION
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Prevent re-entrancy
    if (isUpdatingRef.current) {
      console.warn('[DialogueFlow] Prevented reentrant option selection');
      return;
    }
    
    // Set updating flag
    isUpdatingRef.current = true;
    
    try {
      // Track critical path options
      if (option.isCriticalPath) {
        setProgressionHistory(prev => {
          // Prevent duplicates
          if (prev.includes(`option-${option.id}`)) return prev;
          return [...prev, `option-${option.id}`];
        });
      }
      
      // Call the onOptionSelected callback
      if (onOptionSelected) {
        onOptionSelected(option);
      }
      
      // Forward to state machine - crucial for progression
      stateMachine.selectOption(option.id);
      
      // Log option selection through event system - use safe dispatching
      setTimeout(() => {
        useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
          optionId: option.id,
          stageId: currentStageId,
          character: characterId,
          flowId: `dialogue-${nodeId}`,
          insightGain: option.insightGain || 0,
          isCriticalPath: option.isCriticalPath || false
        });
      }, 0);
    } finally {
      // Always clear the updating flag
      isUpdatingRef.current = false;
    }
  }, [onOptionSelected, stateMachine, currentStageId, characterId, nodeId]);
  
  // Progress dialogue - WITH RE-ENTRANCY PROTECTION
  const handleContinue = useCallback(() => {
    // Prevent re-entrancy
    if (isUpdatingRef.current) {
      console.warn('[DialogueFlow] Prevented reentrant continue');
      return false;
    }
    
    // Set updating flag
    isUpdatingRef.current = true;
    
    try {
      console.log(`[DialogueFlow] Continuing dialogue from state: ${currentStageId}`);
      stateMachine.advanceState();
      return true;
    } finally {
      // Use a short timeout to allow state updates to settle
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  }, [stateMachine, currentStageId]);
  
  // Show backstory segment
  const showBackstorySegment = useCallback((text: string) => {
    // Prevent when updating
    if (isUpdatingRef.current) return;
    
    // Set backstory text in state machine
    set({ backstoryText: text, showBackstory: true });
  }, []);
  
  // Jump to specific stage - WITH RE-ENTRANCY PROTECTION
  const jumpToStage = useCallback((stageId: string) => {
    // Prevent re-entrancy
    if (isUpdatingRef.current) {
      console.warn('[DialogueFlow] Prevented reentrant stage jump');
      return;
    }
    
    // Set updating flag
    isUpdatingRef.current = true;
    
    try {
      console.log(`[DialogueFlow] Jumping to stage: ${stageId}`);
      
      // Track stage visit
      visitedStagesRef.current.add(stageId);
      
      // Forward to state machine - critical for progression
      stateMachine.jumpToState(stageId);
      
      // Log through event system - use safe dispatching
      setTimeout(() => {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'jumpToStage',
          metadata: {
            fromStageId: currentStageId,
            toStageId: stageId,
            characterId,
            nodeId,
            reason: 'explicit_call'
          }
        });
      }, 0);
    } finally {
      // Allow changes to settle before clearing flag
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  }, [currentStageId, stateMachine, characterId, nodeId]);
  
  // Simplified API for setting backstory directly
  const set = useCallback((updates: Partial<{
    backstoryText: string;
    showBackstory: boolean;
  }>) => {
    if ('backstoryText' in updates) {
      stateMachine.backstoryText = updates.backstoryText || '';
    }
    
    if ('showBackstory' in updates) {
      // Prevent update loops by batching this operation
      setTimeout(() => {
        if (stateMachine.showBackstory !== updates.showBackstory) {
          // IMPORTANT: Directly access the set function from the store to modify state
          // This is a safe access pattern that won't cause infinite loops
          useDialogueStateMachine.setState(state => ({
            ...state,
            showBackstory: updates.showBackstory
          }));
        }
      }, 0);
    }
  }, [stateMachine]);
  
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
    visitedStages: Array.from(visitedStagesRef.current),
    dialogueStateMachine: stateMachine,
    
    // State inspection
    getProgressionStatus: stateMachine.getProgressionStatus
  };
}

export default useDialogueFlow;