// app/hooks/useDialogueFlow.ts
/**
 * Chamber Pattern Implementation for Dialogue Flow Hook
 * 
 * This refactored hook implements the Chamber Transition Pattern:
 * 1. Returns primitive values instead of objects
 * 2. Uses stable function references
 * 3. Makes atomic state updates
 * 4. Isolates rendering state from data state
 * 5. Manages lifecycle properly to prevent memory leaks
 * 
 * Design Philosophy:
 * - Dialogue models the flow of learning and connection
 * - Characters develop meaningful relationships with the player
 * - Every interaction should contribute to narrative momentum
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  useDialogueStateMachine, 
  useDialogueValue, 
  useDialogueValues,
  useDialogueFunctions,
  createKapoorCalibrationFlow, 
  createJesseEquipmentFlow 
} from '@/app/core/dialogue/DialogueStateMachine';
import { useEventBus, safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useJournalStore } from '@/app/store/journalStore';
import { usePrimitiveStoreValue } from '@/app/core/utils/storeHooks';
import { shallow } from 'zustand/shallow';

// ===== CORE TYPES =====

// Dialogue stages and options with view-specific properties
export interface DialogueStage {
  id: string;
  text: string;
  type?: 'standard' | 'backstory' | 'conclusion' | 'critical-moment';
  contextNote?: string;
  isMandatory?: boolean;
  isCriticalPath?: boolean;
  isConclusion?: boolean;
  options?: DialogueOption[];
  equipment?: {
    itemId: string;
    alt: string;
    description: string;
  };
  nextStageId?: string;
  responseText?: string;
}

export interface DialogueOption {
  id: string;
  text: string;
  nextStageId: string;
  responseText?: string;
  approach?: 'humble' | 'precision' | 'confidence';
  insightGain?: number;
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  triggersBackstory?: boolean;
  isCriticalPath?: boolean;
}

export interface DialogueOptionView extends DialogueOption {
  // View-specific properties
  isSelected?: boolean;
  isDisabled?: boolean;
  highlighted?: boolean;
}

// Flow progression tracking - Used internally, not for rendering
interface DialogueProgressionStatus {
  // Core tracking
  nodeId: string | null;
  characterId: string | null;
  started: boolean;
  completed: boolean;
  
  // Critical path tracking
  journalAcquired: boolean;
  errorCount: number;
  recoveryAttempted: boolean;
  
  // Timing information
  startTime: number | null;
  endTime: number | null;
  interactionCount: number;
  
  // For debugging
  lastEvent: {
    type: string;
    timestamp: number;
    details?: any;
  } | null;
}

// Hook parameters
interface DialogueFlowParams {
  characterId: string;
  nodeId?: string;
  dialogueId?: string;
  stages?: DialogueStage[];
  onOptionSelected?: (option: DialogueOptionView, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
}

// Hook return interface - primitives and stable functions only
interface DialogueFlowResult {
  // State - primitives only
  isLoading: boolean;
  error: string | null;
  currentStageId: string;
  showResponse: boolean;
  showBackstory: boolean;
  backstoryText: string;
  instanceId: string;
  
  // Data access functions - primitive returns only
  getCurrentStage: () => DialogueStage | null;
  getSelectedOption: () => DialogueOptionView | null;
  
  // Actions - stable function references
  handleOptionSelect: (option: DialogueOptionView) => void;
  handleContinue: () => void;
  completeDialogue: () => void;
  
  // Status - formatted primitive values
  status: {
    started: boolean;
    completed: boolean;
    errorCount: number;
  };
}

/**
 * Enhanced React hook for dialogue flow management with Chamber Pattern
 * 
 * This hook implements the Chamber Transition Pattern for optimal
 * rendering performance while maintaining robust dialogue functionality.
 */
export function useDialogueFlow({
  characterId,
  nodeId,
  dialogueId = `${characterId}-dialogue`,
  stages,
  onOptionSelected,
  onStageChange
}: DialogueFlowParams): DialogueFlowResult {
  // ===== REFERENCES AND LIFECYCLE =====
  // Generate stable instance ID
  const instanceIdRef = useRef<string>(`dialogue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  // Cleanup function reference
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  // Track component mount state
  const isMountedRef = useRef(true);
  // Track progression status
  const progressionStatusRef = useRef<DialogueProgressionStatus>({
    nodeId: nodeId || null,
    characterId,
    started: false,
    completed: false,
    journalAcquired: false,
    errorCount: 0,
    recoveryAttempted: false,
    startTime: null,
    endTime: null,
    interactionCount: 0,
    lastEvent: null
  });
  
  // ===== LOCAL STATE =====
  // Only for values not directly tied to dialogue state machine
  const [localState, setLocalState] = useState({
    isLoading: true,
    error: null as string | null,
    currentStage: null as DialogueStage | null,
    selectedOption: null as DialogueOptionView | null
  });
  
  // ===== PRIMITIVE STORE VALUES =====
  // Extract only primitives from dialogue state machine
  const dialogueValues = useDialogueValues(state => ({
    activeFlowId: state.activeFlowId,
    currentStateId: state.currentStateId,
    showResponse: state.showResponse,
    showBackstory: state.showBackstory,
    backstoryText: state.backstoryText,
    isActive: state.isActive,
    errorState: state.errorState
  }));
  
  // Journal state as primitive
  const hasJournal = usePrimitiveStoreValue(
    useJournalStore,
    state => state.hasJournal,
    false
  );
  
  // ===== STABLE FUNCTION REFERENCES =====
  // Get dialogue action functions with stable references
  const dialogueFunctions = useDialogueFunctions();
  
  // Journal functions with stable references
  const initializeJournal = usePrimitiveStoreValue(
    useJournalStore,
    state => state.initializeJournal,
    (tier) => console.warn(`initializeJournal not available for ${tier}`)
  );
  
  // Event bus dispatch with stable reference
  const eventBusDispatch = usePrimitiveStoreValue(
    useEventBus,
    state => state.dispatch,
    () => console.warn('Event bus dispatch not available')
  );
  
  // ===== SAFE STATE UPDATERS =====
  // Safe updater for local state
  const updateLocalState = useCallback((updates: Partial<typeof localState>) => {
    if (isMountedRef.current) {
      setLocalState(prev => ({ ...prev, ...updates }));
    }
  }, []);
  
  // Safe updater for progression status
  const updateProgressionStatus = useCallback((updates: Partial<DialogueProgressionStatus>) => {
    if (isMountedRef.current) {
      progressionStatusRef.current = {
        ...progressionStatusRef.current,
        ...updates
      };
    }
  }, []);
  
  // ===== DIALOGUE CONTENT INITIALIZATION =====
  // Create and memoize dialogue stages with fallback mechanisms
  const dialogueStages = useMemo(() => {
    // If custom stages are provided, use them
    if (stages) {
      return stages;
    }
    
    try {
      // Otherwise create from factory function based on character
      switch (characterId) {
        case 'kapoor': {
          const flow = createKapoorCalibrationFlow(nodeId || dialogueId);
          return flow.stages || [];
        }
        case 'jesse': {
          const flow = createJesseEquipmentFlow(nodeId || dialogueId);
          return flow.stages || [];
        }
        default:
          throw new Error(`Unknown character: ${characterId}`);
      }
    } catch (error) {
      console.error(`Error creating dialogue for ${characterId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateLocalState({ error: errorMessage });
      updateProgressionStatus({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'dialogue_creation_error',
          timestamp: Date.now(),
          details: { error: errorMessage }
        }
      });
      
      // Return minimal emergency dialogue to prevent UI breakage
      return [
        {
          id: 'error-fallback',
          text: "I'm having trouble processing this information. Let me try again.",
          options: [
            {
              id: 'retry',
              text: 'Please continue',
              nextStageId: 'error-conclusion'
            }
          ]
        },
        {
          id: 'error-conclusion',
          text: "Let's move on and try something else.",
          isConclusion: true
        }
      ];
    }
  }, [characterId, nodeId, dialogueId, stages, updateLocalState, updateProgressionStatus]);
  
  // ===== INITIALIZATION EFFECT =====
  // Initialize dialogue flow on mount and handle cleanup on unmount
  useEffect(() => {
    console.log(`[DialogueFlow] Initializing ${characterId} flow for node ${nodeId || 'custom'}`);
    
    // Mark as mounted
    isMountedRef.current = true;
    
    // Skip if already initialized with the same parameters
    if (progressionStatusRef.current.started && 
        progressionStatusRef.current.characterId === characterId &&
        progressionStatusRef.current.nodeId === nodeId) {
      return;
    }
    
    // Start loading
    updateLocalState({ isLoading: true, error: null });
    
    // Update progression tracking
    updateProgressionStatus({
      nodeId: nodeId || null,
      characterId,
      started: true,
      startTime: Date.now(),
      lastEvent: {
        type: 'initialization',
        timestamp: Date.now(),
        details: { dialogueId, nodeId }
      }
    });
    
    // Initialize the flow
    try {
      if (dialogueStages.length === 0) {
        throw new Error('No dialogue stages available');
      }
      
      // Set the first stage
      const initialStage = dialogueStages[0];
      updateLocalState({
        currentStage: initialStage,
        isLoading: false
      });
      
      // If using dialogue state machine, initialize flow there too
      if (dialogueFunctions.initializeFlow) {
        try {
          // Create compatible flow format
          const flow = {
            id: dialogueId,
            initialStateId: initialStage.id,
            states: dialogueStages.reduce((acc, stage) => {
              acc[stage.id] = {
                id: stage.id,
                type: (stage.type as any) || 'standard',
                text: stage.text,
                options: stage.options,
                isConclusion: stage.isConclusion,
                isCriticalPath: stage.isCriticalPath,
                nextStateId: stage.nextStageId
              };
              return acc;
            }, {} as Record<string, any>),
            context: {
              characterId,
              nodeId: nodeId || dialogueId,
              playerScore: 0,
              selectedOptionIds: [],
              knowledgeGained: {},
              visitedStateIds: []
            },
            progressionCheckpoints: dialogueStages
              .filter(s => s.isCriticalPath)
              .map(s => s.id)
          };
          
          dialogueFunctions.initializeFlow(flow);
        } catch (machineError) {
          console.warn(`[DialogueFlow] State machine initialization failed, operating standalone:`, machineError);
        }
      }
      
      console.log(`[DialogueFlow] Initialized with ${dialogueStages.length} stages`);
    } catch (error) {
      console.error(`[DialogueFlow] Initialization error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update error state
      updateLocalState({
        error: errorMessage,
        isLoading: false
      });
      
      // Update tracking
      updateProgressionStatus({
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'initialization_error',
          timestamp: Date.now(),
          details: { error: errorMessage }
        }
      });
      
      // Report error to event system
      try {
        safeDispatch(
          GameEventType.DIALOGUE_ERROR,
          {
            dialogueId,
            characterId,
            nodeId: nodeId || null,
            error: errorMessage,
            reason: 'initialization_error'
          },
          'useDialogueFlow_error'
        );
      } catch (e) {
        console.error('Failed to dispatch error event:', e);
      }
    }
    
    // Cleanup function for unmount
    return () => {
      console.log(`[DialogueFlow] Unmounting ${characterId} flow`);
      
      // Mark as unmounted first to prevent state updates
      isMountedRef.current = false;
      
      // Run any cleanup we registered
      if (cleanupFunctionRef.current) {
        try {
          cleanupFunctionRef.current();
        } catch (cleanupError) {
          console.error('[DialogueFlow] Cleanup error:', cleanupError);
        }
      }
    };
  }, [
    characterId, 
    nodeId, 
    dialogueId, 
    dialogueStages, 
    dialogueFunctions, 
    updateLocalState, 
    updateProgressionStatus
  ]);
  
  // ===== SYNC WITH DIALOGUE STATE MACHINE =====
  // Keep local stage in sync with dialogue state machine
  useEffect(() => {
    if (!dialogueValues.currentStateId || localState.isLoading) return;
    
    // Find the corresponding stage by ID
    const currentStage = dialogueStages.find(s => s.id === dialogueValues.currentStateId);
    if (currentStage && currentStage !== localState.currentStage) {
      updateLocalState({ currentStage });
      
      // Call stage change callback if provided
      if (onStageChange && localState.currentStage) {
        onStageChange(currentStage.id, localState.currentStage.id);
      }
    }
  }, [
    dialogueValues.currentStateId, 
    dialogueStages, 
    localState.currentStage, 
    localState.isLoading,
    onStageChange, 
    updateLocalState
  ]);
  
  // ===== ACTION HANDLERS =====
  // Handle dialogue option selection
  const handleOptionSelect = useCallback((option: DialogueOptionView) => {
    if (!isMountedRef.current || !localState.currentStage) return;
    
    try {
      // Update local state
      updateLocalState({ selectedOption: option });
      
      // Call external handler if provided
      if (onOptionSelected) {
        onOptionSelected(option, localState.currentStage.id);
      }
      
      // Update dialogue state machine
      if (dialogueFunctions.selectOption) {
        dialogueFunctions.selectOption(option.id);
      }
      
      // Track event
      updateProgressionStatus({
        interactionCount: progressionStatusRef.current.interactionCount + 1,
        lastEvent: {
          type: 'option_selected',
          timestamp: Date.now(),
          details: { optionId: option.id, stageId: localState.currentStage.id }
        }
      });
      
      // Log option selection
      try {
        safeDispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'dialogue_system',
            action: 'option_selected',
            metadata: {
              optionId: option.id,
              character: characterId,
              stageId: localState.currentStage.id
            }
          },
          'dialogue_flow_option_selection'
        );
      } catch (error) {
        console.debug('Failed to dispatch option selection event:', error);
      }
    } catch (error) {
      console.error('[DialogueFlow] Error selecting option:', error);
      
      updateProgressionStatus({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'option_selection_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
    }
  }, [
    localState.currentStage, 
    dialogueFunctions, 
    characterId, 
    onOptionSelected, 
    updateLocalState, 
    updateProgressionStatus
  ]);

  // CRITICAL FIX: Forward-declare completeDialogue to avoid circular reference
  const completeDialogue = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      // Mark as completed for tracking
      updateProgressionStatus({
        completed: true,
        endTime: Date.now(),
        lastEvent: {
          type: 'dialogue_completed',
          timestamp: Date.now(),
          details: { stageId: localState.currentStage?.id }
        }
      });
      
      // Complete in state machine if available
      if (dialogueFunctions.completeFlow) {
        dialogueFunctions.completeFlow();
      }
      
      // Signal completion via event system
      try {
        safeDispatch(
          GameEventType.DIALOGUE_COMPLETED,
          {
            dialogueId,
            characterId,
            nodeId: nodeId || null,
            completed: true,
            reason: 'natural_completion'
          },
          'useDialogueFlow_completion'
        );
      } catch (error) {
        console.error('Failed to dispatch completion event:', error);
      }
      
      console.log(`[DialogueFlow] Completed ${characterId} flow`);
    } catch (error) {
      console.error('[DialogueFlow] Error completing dialogue:', error);
      
      updateProgressionStatus({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'dialogue_completion_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
      
      // Special recovery for the important Kapoor journal flow
      if (characterId === 'kapoor' && !progressionStatusRef.current.journalAcquired && !hasJournal) {
        try {
          console.warn('[DialogueFlow] Attempting critical path recovery for journal acquisition');
          
          // Try to force journal acquisition directly
          if (typeof initializeJournal === 'function') {
            console.warn('[DialogueFlow] Forcing journal acquisition');
            initializeJournal('technical');
            
            updateProgressionStatus({ 
              journalAcquired: true,
              recoveryAttempted: true,
              lastEvent: {
                type: 'journal_recovery',
                timestamp: Date.now()
              }
            });
            
            // Log emergency recovery action
            try {
              safeDispatch(
                GameEventType.JOURNAL_ACQUIRED,
                {
                  tier: 'technical',
                  character: characterId,
                  source: 'dialogue_hook_recovery',
                  forced: true
                },
                'critical_path_recovery'
              );
            } catch (error) {
              console.debug('Failed to dispatch journal acquisition event:', error);
            }
          }
        } catch (recoveryError) {
          console.error('[DialogueFlow] Critical path recovery failed:', recoveryError);
        }
      }
    }
  }, [
    dialogueId, 
    characterId, 
    nodeId, 
    localState.currentStage, 
    dialogueFunctions, 
    hasJournal, 
    initializeJournal, 
    updateProgressionStatus
  ]);
  
  // Handle dialogue continuation
  const handleContinue = useCallback(() => {
    if (!isMountedRef.current || !localState.currentStage) return;
    
    try {
      // Determine the next stage ID
      let nextStageId = '';
      
      // If showing response, find the next stage from selected option
      if (dialogueValues.showResponse || dialogueValues.showBackstory) {
        // Use state machine's advance
        if (dialogueFunctions.advanceState) {
          dialogueFunctions.advanceState();
          return; // State machine will handle the transition
        }
        
        // Otherwise handle manually
        if (localState.selectedOption?.nextStageId) {
          nextStageId = localState.selectedOption.nextStageId;
        }
      }
      // If not showing response, check for direct next stage
      else if (localState.currentStage.nextStageId) {
        nextStageId = localState.currentStage.nextStageId;
      }
      // If we're at a conclusion, complete the dialogue
      else if (localState.currentStage.isConclusion) {
        completeDialogue();
        return;
      }
      // Otherwise, we can't advance
      else {
        console.warn(`[DialogueFlow] No next stage defined for ${localState.currentStage.id}`);
        return;
      }
      
      // Find the next stage
      if (nextStageId) {
        const nextStage = dialogueStages.find(s => s.id === nextStageId);
        if (nextStage) {
          // Call onStageChange callback if provided
          if (onStageChange) {
            onStageChange(nextStageId, localState.currentStage.id);
          }
          
          // Update local state
          updateLocalState({
            currentStage: nextStage,
            selectedOption: null
          });
          
          // Update state machine if available
          if (dialogueFunctions.advanceToStage) {
            dialogueFunctions.advanceToStage(nextStageId);
          }
          
          // Log advancement
          try {
            safeDispatch(
              GameEventType.UI_BUTTON_CLICKED,
              {
                componentId: 'dialogue_system',
                action: 'advance_stage',
                metadata: {
                  fromStage: localState.currentStage.id,
                  toStage: nextStageId,
                  character: characterId
                }
              },
              'dialogue_flow_stage_advancement'
            );
          } catch (error) {
            console.debug('Failed to dispatch stage advancement event:', error);
          }
        } else {
          console.error(`[DialogueFlow] Next stage ${nextStageId} not found`);
        }
      }
      
      // Track event
      updateProgressionStatus({
        interactionCount: progressionStatusRef.current.interactionCount + 1,
        lastEvent: {
          type: 'dialogue_advanced',
          timestamp: Date.now(),
          details: { stageId: localState.currentStage.id }
        }
      });
    } catch (error) {
      console.error('[DialogueFlow] Error advancing dialogue:', error);
      
      updateProgressionStatus({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'dialogue_advancement_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
    }
  }, [
    localState.currentStage,
    localState.selectedOption,
    dialogueValues.showResponse,
    dialogueValues.showBackstory,
    dialogueFunctions,
    dialogueStages,
    characterId,
    onStageChange,
    updateLocalState,
    updateProgressionStatus,
    completeDialogue
  ]);
  
  // ===== ACCESSOR FUNCTIONS =====
  // Get current stage safely
  const getCurrentStage = useCallback((): DialogueStage | null => {
    return localState.currentStage;
  }, [localState.currentStage]);
  
  // Get selected option safely
  const getSelectedOption = useCallback((): DialogueOptionView | null => {
    return localState.selectedOption;
  }, [localState.selectedOption]);
  
  // ===== RETURN INTERFACE =====
  // Return only primitives and stable function references
  return {
    // State as primitives
    isLoading: localState.isLoading,
    error: localState.error,
    currentStageId: localState.currentStage?.id || '',
    showResponse: dialogueValues.showResponse,
    showBackstory: dialogueValues.showBackstory,
    backstoryText: dialogueValues.backstoryText,
    instanceId: instanceIdRef.current,
    
    // Data access functions
    getCurrentStage,
    getSelectedOption,
    
    // Actions with stable references
    handleOptionSelect,
    handleContinue,
    completeDialogue,
    
    // Status as formatted primitives
    status: {
      started: progressionStatusRef.current.started,
      completed: progressionStatusRef.current.completed,
      errorCount: progressionStatusRef.current.errorCount
    }
  };
}