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
 * A hook that manages dialogue flow using the formal DialogueStateMachine
 * 
 * This is the simplified version that exclusively uses the state machine,
 * removing the legacy code paths for better reliability and maintainability.
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
  
  // Important refs for state tracking
  const visitedStagesRef = useRef<Set<string>>(new Set([initialStageId]));
  const criticalPathProgressRef = useRef<Record<string, boolean>>({});
  const progressionValidatedRef = useRef<boolean>(false);
  
  // Access the dialogue state machine
  const stateMachine = useDialogueStateMachine();
  
  // Helper to convert stages format to state machine states
  const convertStagesToStates = useCallback(() => {
    const states: Record<string, DialogueState> = {};
    
    stages.forEach(stage => {
      states[stage.id] = {
        id: stage.id,
        type: stage.type || 'question',
        text: stage.text,
        options: stage.options,
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
      // Convert stages to state machine format
      const states = convertStagesToStates();
      
      // Initialize the flow
      stateMachine.initializeFlow({
        id: `dialogue-${nodeId || Math.random().toString(36).substring(7)}`,
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
        progressionCheckpoints: stages
          .filter(stage => stage.isCriticalPath)
          .map(stage => stage.id),
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
          hasCriticalPaths: stages.some(s => s.isCriticalPath)
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
            visitedStages: Array.from(visitedStagesRef.current),
            criticalPathProgress: criticalPathProgressRef.current
          }
        });
      }
    };
  }, [stateMachine, convertStagesToStates, initialStageId, characterId, nodeId, currentStageId]);
  
  // Sync with state machine state changes
  useEffect(() => {
    if (!stateMachine.currentState) return;
    
    const machineStageId = stateMachine.currentState.id;
    
    // If state machine's stage differs from our local state, sync them
    if (machineStageId !== currentStageId) {
      setCurrentStageId(machineStageId);
      
      // Track stage visit
      visitedStagesRef.current.add(machineStageId);
      
      // Check if this is a critical path stage
      const stage = stages.find(s => s.id === machineStageId);
      if (stage?.isCriticalPath) {
        criticalPathProgressRef.current[`stage-${machineStageId}`] = true;
        
        // Update progression history for analytics
        setProgressionHistory(prev => [...prev, `stage-${machineStageId}`]);
        
        // Log critical path progress
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'criticalPathStageReached',
          metadata: {
            stageId: machineStageId,
            characterId,
            nodeId,
            visitCount: Object.keys(visitedStagesRef.current).length
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
    setIsProgressionValid(!progressionStatus.progressionBlocked);
    
    // Auto-repair progression issues
    if (progressionStatus.progressionBlocked && !progressionValidatedRef.current) {
      console.warn(`[useDialogueFlow] Progression issue detected:`, progressionStatus);
      
      // Log the issue
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'dialogueFlow',
        action: 'progressionBlockDetected',
        metadata: {
          characterId,
          nodeId,
          currentStageId: machineStageId,
          progressionStatus,
          visitedStages: Array.from(visitedStagesRef.current)
        }
      });
      
      // After a delay, attempt repair
      setTimeout(() => {
        // Verify if issue persists before attempting repair
        const currentStatus = stateMachine.getProgressionStatus();
        if (currentStatus.progressionBlocked) {
          console.log(`[useDialogueFlow] Attempting progression repair`);
          stateMachine.forceProgressionRepair();
        }
      }, 1000);
    }
    
    // Mark critical progression points
    if ((stateMachine.currentState.isConclusion || stateMachine.currentState.isCriticalPath)
        && characterId === 'kapoor') {
      
      progressionValidatedRef.current = true;
      
      // For journal presentation specifically, ensure proper validation
      if (machineStageId === 'journal-presentation') {
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
      }
    }
  }, [
    stateMachine.currentState, currentStageId, onStageChange, 
    stages, characterId, nodeId, progressionHistory
  ]);
  
  // Get the current stage object
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);
  
  // Handle player selecting a dialogue option
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Track critical path options
    if (option.isCriticalPath) {
      criticalPathProgressRef.current[`option-${option.id}`] = true;
      setProgressionHistory(prev => [...prev, `option-${option.id}`]);
    }
    
    // Call the onOptionSelected callback
    if (onOptionSelected) {
      onOptionSelected(option);
    }
    
    // Forward to state machine
    stateMachine.selectOption(option.id);
    
    // Log option selection through event system
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentStageId,
      character: characterId,
      flowId: `dialogue-${nodeId}`,
      insightGain: option.insightGain || 0,
      isCriticalPath: option.isCriticalPath || false
    });
  }, [onOptionSelected, stateMachine, currentStageId, characterId, nodeId]);
  
  // Progress dialogue
  const handleContinue = useCallback(() => {
    stateMachine.advanceState();
    return true;
  }, [stateMachine]);
  
  // Show backstory segment
  const showBackstorySegment = useCallback((text: string) => {
    // This would need to be implemented in the state machine
    console.log('Showing backstory segment:', text);
  }, []);
  
  // Jump to specific stage
  const jumpToStage = useCallback((stageId: string) => {
    // Track stage visit
    visitedStagesRef.current.add(stageId);
    
    // Forward to state machine
    stateMachine.jumpToState(stageId);
    
    // Log through event system
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
  }, [currentStageId, stateMachine, characterId, nodeId]);
  
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