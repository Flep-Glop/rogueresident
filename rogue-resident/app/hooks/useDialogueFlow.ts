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
  isCriticalPath?: boolean; // Added for progression tracking
  condition?: (context: any) => boolean; // Added for conditional options
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
  isCriticalPath?: boolean; // Added for progression tracking
  isMandatory?: boolean; // Added for progression tracking
  maxVisits?: number; // Added for loop detection
  type?: 'intro' | 'question' | 'response' | 'backstory' | 'conclusion' | 'critical-moment';
  onEnter?: (context: any) => void;
  onExit?: (context: any) => void;
}

interface DialogueFlowOptions {
  initialStageId?: string;
  stages: DialogueStage[];
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  onOptionSelected?: (option: DialogueOption) => void;
  characterId?: string; // Added for telemetry
  nodeId?: string; // Added for telemetry
  useStateMachine?: boolean; // Optional flag to use formal state machine
}

/**
 * A hook that manages dialogue flow, stages, and responses
 * for narrative-driven game interactions, with enhanced progression reliability
 * 
 * Combines the simplicity of the original hook with progression guarantees
 * and self-healing capabilities powered by a formal state machine
 */
export function useDialogueFlow({
  initialStageId = 'intro',
  stages,
  onStageChange,
  onOptionSelected,
  characterId = 'unknown',
  nodeId = 'unknown',
  useStateMachine = true // Default to using state machine for reliability
}: DialogueFlowOptions) {
  // Original hook state - maintain for compatibility
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);
  const [backstoryText, setBackstoryText] = useState('');
  
  // New state for enhanced functionality
  const [isProgressionValid, setIsProgressionValid] = useState(true);
  const [progressionHistory, setProgressionHistory] = useState<string[]>([]);
  
  // Important refs for tracking state between renders
  const visitedStagesRef = useRef<Set<string>>(new Set([initialStageId]));
  const stageVisitCountRef = useRef<Record<string, number>>({});
  const criticalPathProgressRef = useRef<Record<string, boolean>>({});
  const progressionValidatedRef = useRef<boolean>(false);
  
  // Access formal state machine - this is the engine powering our reliability
  const stateMachine = useDialogueStateMachine();
  
  // Initialize formal state machine if enabled
  useEffect(() => {
    if (!useStateMachine) return;
    
    // Only initialize if not already active
    if (!stateMachine.activeFlow) {
      // Convert our stages format to state machine format
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
      stageVisitCountRef.current[initialStageId] = 1;
      
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
  }, [
    useStateMachine, stateMachine, stages, initialStageId, 
    characterId, nodeId, currentStageId
  ]);
  
  // Sync with state machine state changes (if enabled)
  useEffect(() => {
    if (!useStateMachine || !stateMachine.currentState) return;
    
    const machineStageId = stateMachine.currentState.id;
    
    // If state machine's stage differs from our local state, sync them
    if (machineStageId !== currentStageId) {
      setCurrentStageId(machineStageId);
      
      // Sync other state properties
      setShowResponse(stateMachine.showResponse);
      setSelectedOption(stateMachine.selectedOption);
      setShowBackstory(stateMachine.showBackstory);
      setBackstoryText(stateMachine.backstoryText);
      
      // Track stage visit
      visitedStagesRef.current.add(machineStageId);
      stageVisitCountRef.current[machineStageId] = 
        (stageVisitCountRef.current[machineStageId] || 0) + 1;
      
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
            visitCount: stageVisitCountRef.current[machineStageId]
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
    
    // PROGRESSION GUARANTEE: Check for loops or blocked progression
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
    
    // CRITICAL VALIDATION: Mark stages that represent critical progression points
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
    useStateMachine, stateMachine.currentState, stateMachine.showResponse,
    stateMachine.selectedOption, stateMachine.showBackstory, stateMachine.backstoryText,
    currentStageId, onStageChange, stages, characterId, nodeId, progressionHistory
  ]);
  
  // Get the current stage object - simple utility
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);
  
  const currentStage = getCurrentStage();
  
  // Handle player selecting a dialogue option
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    // Common state updates
    setSelectedOption(option);
    setShowResponse(Boolean(option.responseText));
    
    // Track critical path options
    if (option.isCriticalPath) {
      criticalPathProgressRef.current[`option-${option.id}`] = true;
      setProgressionHistory(prev => [...prev, `option-${option.id}`]);
    }
    
    // Call the onOptionSelected callback
    if (onOptionSelected) {
      onOptionSelected(option);
    }
    
    // Forward to state machine if enabled
    if (useStateMachine) {
      stateMachine.selectOption(option.id);
    }
    
    // Log option selection through event system
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentStageId,
      character: characterId,
      flowId: `dialogue-${nodeId}`,
      insightGain: option.insightGain || 0,
      isCriticalPath: option.isCriticalPath || false
    });
  }, [
    onOptionSelected, useStateMachine, stateMachine, 
    currentStageId, characterId, nodeId
  ]);
  
  // Progress dialogue after response
  const handleContinue = useCallback(() => {
    // If showing backstory, return to main dialogue first
    if (showBackstory) {
      setShowBackstory(false);
      
      // Forward to state machine if enabled
      if (useStateMachine) {
        stateMachine.advanceState();
      }
      
      return;
    }
    
    // If showing response, transition to next dialogue stage
    if (showResponse) {
      setShowResponse(false);
      
      // Handle via state machine if enabled
      if (useStateMachine) {
        stateMachine.advanceState();
        return true;
      }
      
      // Original logic - normal progression to next stage
      const prevStageId = currentStageId;
      const nextStageId = selectedOption?.nextStageId || currentStage.nextStageId;
      
      if (nextStageId) {
        // Track stage visit
        visitedStagesRef.current.add(nextStageId);
        stageVisitCountRef.current[nextStageId] = 
          (stageVisitCountRef.current[nextStageId] || 0) + 1;
        
        // Update state
        setCurrentStageId(nextStageId);
        setSelectedOption(null);
        
        if (onStageChange) {
          onStageChange(nextStageId, prevStageId);
        }
        
        return true;
      }
      
      return false;
    }
    
    // If state machine is enabled, use it for advancing state
    if (useStateMachine) {
      stateMachine.advanceState();
      return true;
    }
    
    // Original behavior - if no response and no state machine, just return false
    return false;
  }, [
    showBackstory, showResponse, currentStage, currentStageId,
    selectedOption, onStageChange, useStateMachine, stateMachine
  ]);
  
  // Enable showing backstory segments
  const showBackstorySegment = useCallback((text: string) => {
    setBackstoryText(text);
    setShowBackstory(true);
  }, []);
  
  // Jump directly to a specific stage
  const jumpToStage = useCallback((stageId: string) => {
    // Track stage visit
    visitedStagesRef.current.add(stageId);
    stageVisitCountRef.current[stageId] = 
      (stageVisitCountRef.current[stageId] || 0) + 1;
    
    // Update local state
    setCurrentStageId(stageId);
    setSelectedOption(null);
    setShowResponse(false);
    setShowBackstory(false);
    
    // Forward to state machine if enabled
    if (useStateMachine) {
      stateMachine.jumpToState(stageId);
    }
    
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
  }, [currentStageId, useStateMachine, stateMachine, characterId, nodeId]);
  
  // Get progression status for external systems
  const getProgressionStatus = useCallback(() => {
    if (useStateMachine) {
      return stateMachine.getProgressionStatus();
    }
    
    // Simplified status for non-state machine mode
    return {
      isCompleted: visitedStagesRef.current.size > 0,
      criticalPathsCompleted: true, // Optimistic assumption
      missingCheckpoints: [],
      potentialLoops: Object.entries(stageVisitCountRef.current)
        .filter(([id, count]) => count > 2)
        .map(([id]) => id),
      progressionBlocked: false
    };
  }, [useStateMachine, stateMachine]);
  
  // For advanced cases that need direct state machine access
  const getDialogueStateMachine = useCallback(() => {
    return useStateMachine ? stateMachine : null;
  }, [useStateMachine, stateMachine]);
  
  // Return a hybrid API that combines the original simplicity with the new capabilities
  return {
    // Original API
    currentStage,
    currentStageId,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText,
    handleOptionSelect,
    handleContinue,
    showBackstorySegment,
    setCurrentStageId: jumpToStage,
    
    // Extended API
    isProgressionValid,
    progressionHistory,
    visitedStages: Array.from(visitedStagesRef.current),
    dialogueStateMachine: getDialogueStateMachine(),
    getProgressionStatus,
    
    // For debugging - remove in production
    DEBUG_visitCounts: stageVisitCountRef.current,
    DEBUG_criticalPathProgress: criticalPathProgressRef.current
  };
}

export default useDialogueFlow;