// app/hooks/useDialogueFlow.ts
/**
 * Enhanced Dialogue Flow Hook
 * 
 * A resilient React integration for the dialogue system with proper lifecycle management.
 * Designed to handle narrative persistence across component boundaries and state transitions.
 * 
 * Philosophical approach:
 * - Narrative continuity should transcend component lifecycles
 * - Character interactions build on a foundation of emotional momentum
 * - Dialogue serves both gameplay and storytelling simultaneously
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDialogueStateMachine, createKapoorCalibrationFlow, createJesseEquipmentFlow } from '@/app/core/dialogue/DialogueStateMachine';
import { useEventBus, safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useJournalStore } from '@/app/store/journalStore';

// Comprehensive interface definitions that match actual usage patterns
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

// Flow progression tracking
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

// All possible dialogue hook parameters in one interface
interface DialogueFlowParams {
  characterId: string;
  nodeId?: string;
  dialogueId?: string;
  stages?: DialogueStage[];
  onOptionSelected?: (option: DialogueOptionView, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
}

/**
 * React hook for dialogue flow management with enhanced reliability
 * 
 * This hook serves as the narrative backbone of character interactions,
 * handling state transitions with graceful fallbacks for edge cases.
 */
export function useDialogueFlow({
  characterId,
  nodeId,
  dialogueId = `${characterId}-dialogue`,
  stages,
  onOptionSelected,
  onStageChange
}: DialogueFlowParams) {
  // Core state management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<DialogueStage | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<DialogueOptionView | null>(null);
  const [showResponse, setShowResponse] = useState<boolean>(false);
  const [showBackstory, setShowBackstory] = useState<boolean>(false);
  const [backstoryText, setBackstoryText] = useState<string>('');
  
  // Use refs to track instance and status across renders
  const instanceIdRef = useRef<string>(`dialogue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
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
  
  // Get dialogue state machine interface
  const dialogueState = useDialogueStateMachine();
  const journalStore = useJournalStore();
  
  // Track mounted state to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  // Update metadata safely
  const updateMetadata = useCallback((updates: Partial<DialogueProgressionStatus>) => {
    if (isMountedRef.current) {
      progressionStatusRef.current = {
        ...progressionStatusRef.current,
        ...updates
      };
    }
  }, []);
  
  // Type-safe state updater to avoid React 18 batching issues
  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (isMountedRef.current) {
      setter(() => value);
    }
  }, []);
  
  // Initialize dialogue flow
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
    
    // Set initial loading state
    safeSetState(setIsLoading, true);
    safeSetState(setError, null);
    
    // Update progression tracking
    updateMetadata({
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
      // Handle both predefined and custom flows
      if (stages) {
        // Custom stages provided - use direct initialization
        if (stages.length > 0) {
          // Set the first stage
          const initialStage = stages[0];
          safeSetState(setCurrentStage, initialStage);
          safeSetState(setCurrentStageId, initialStage.id);
          
          console.log(`[DialogueFlow] Initialized custom flow with ${stages.length} stages`);
        } else {
          throw new Error('Empty stages array provided');
        }
      } else {
        // Use predefined flow from state machine
        let flow;
        
        switch (characterId) {
          case 'kapoor':
            flow = createKapoorCalibrationFlow(nodeId || dialogueId);
            break;
          case 'jesse':
            flow = createJesseEquipmentFlow(nodeId || dialogueId);
            break;
          default:
            throw new Error(`Unknown character: ${characterId}`);
        }
        
        // Initialize flow in state machine
        const initialStageId = dialogueState.initializeFlow(flow);
        
        // Get the initial stage and set it
        const initialStage = flow.stages.find(s => s.id === initialStageId);
        if (initialStage) {
          safeSetState(setCurrentStage, initialStage);
          safeSetState(setCurrentStageId, initialStageId);
        } else {
          throw new Error(`Initial stage ${initialStageId} not found in flow`);
        }
        
        console.log(`[DialogueFlow] Initialized predefined ${characterId} flow`);
      }
      
      // Complete loading
      safeSetState(setIsLoading, false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[DialogueFlow] Initialization error:`, error);
      
      // Update error state
      safeSetState(setError, errorMessage);
      safeSetState(setIsLoading, false);
      
      // Update tracking
      updateMetadata({
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'initialization_error',
          timestamp: Date.now(),
          details: { error: errorMessage }
        }
      });
      
      // Try to recover by forcing manual cleanup
      safeDispatch(
        GameEventType.DIALOGUE_ERROR,
        {
          dialogueId: dialogueId,
          characterId,
          nodeId: nodeId || null,
          error: errorMessage,
          reason: 'initialization_error'
        },
        'useDialogueFlow_error'
      );
    }
    
    // Cleanup function
    return () => {
      console.log(`[DialogueFlow] Unmounting ${characterId} flow`);
      
      // Mark as unmounted first
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
    stages, 
    dialogueState, 
    safeSetState, 
    updateMetadata
  ]);
  
  // Handle dialogue option selection
  const handleOptionSelect = useCallback((option: DialogueOptionView) => {
    try {
      if (!currentStage) {
        console.error('[DialogueFlow] Cannot select option, no current stage');
        return;
      }
      
      // Update state
      safeSetState(setSelectedOption, option);
      safeSetState(setShowResponse, true);
      
      // Call external handler if provided
      if (onOptionSelected) {
        onOptionSelected(option, currentStageId);
      }
      
      // Track event
      updateMetadata({
        interactionCount: progressionStatusRef.current.interactionCount + 1,
        lastEvent: {
          type: 'option_selected',
          timestamp: Date.now(),
          details: { optionId: option.id, stageId: currentStageId }
        }
      });
      
      // Log option selection using UI_BUTTON_CLICKED
      safeDispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'dialogue_system',
          action: 'option_selected',
          metadata: {
            optionId: option.id,
            character: characterId,
            stageId: currentStageId
          }
        },
        'dialogue_flow_option_selection'
      );
      
    } catch (error) {
      console.error('[DialogueFlow] Error selecting option:', error);
      updateMetadata({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'option_selection_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
    }
  }, [currentStage, currentStageId, characterId, onOptionSelected, safeSetState, updateMetadata]);
  
  // Handle dialogue advancement
  const handleContinue = useCallback(() => {
    try {
      if (!currentStage) {
        console.error('[DialogueFlow] Cannot advance dialogue, no current stage');
        return;
      }
      
      // If showing response, move to next stage
      if (showResponse) {
        // Find the selected option (should exist)
        if (!selectedOption) {
          console.error('[DialogueFlow] No selected option found');
          return;
        }
        
        // Find the next stage
        const nextStageId = selectedOption.nextStageId;
        
        // If we have stages, use them to find the next stage
        if (stages) {
          const nextStage = stages.find(s => s.id === nextStageId);
          if (nextStage) {
            // Trigger the onStageChange callback if provided
            if (onStageChange) {
              onStageChange(nextStageId, currentStageId);
            }
            
            // Update state
            safeSetState(setCurrentStage, nextStage);
            safeSetState(setCurrentStageId, nextStageId);
            safeSetState(setShowResponse, false);
            safeSetState(setSelectedOption, null);
            
            // Handle backstory if needed
            if (selectedOption.triggersBackstory) {
              // Find the backstory stage
              const backstoryStage = stages.find(s => s.id === `backstory-${nextStageId}`);
              if (backstoryStage) {
                safeSetState(setBackstoryText, backstoryStage.text);
                safeSetState(setShowBackstory, true);
              }
            }
          } else {
            console.error(`[DialogueFlow] Next stage ${nextStageId} not found`);
          }
        }
        // Otherwise use the state machine
        else if (dialogueState.activeFlow) {
          dialogueState.advanceToStage(nextStageId);
          
          // Sync our state with the state machine
          safeSetState(setCurrentStageId, nextStageId);
          const nextStage = dialogueState.activeFlow.stages.find(s => s.id === nextStageId);
          if (nextStage) {
            safeSetState(setCurrentStage, nextStage);
          }
          
          safeSetState(setShowResponse, false);
          safeSetState(setSelectedOption, null);
          
          // Trigger the onStageChange callback if provided
          if (onStageChange) {
            onStageChange(nextStageId, currentStageId);
          }
        }
        
        // Log advancement
        safeDispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'dialogue_system',
            action: 'advance_stage',
            metadata: {
              fromStage: currentStageId,
              toStage: nextStageId,
              character: characterId
            }
          },
          'dialogue_flow_stage_advancement'
        );
      }
      // If showing backstory, hide it
      else if (showBackstory) {
        safeSetState(setShowBackstory, false);
        safeSetState(setBackstoryText, '');
      }
      // Otherwise just hide the response
      else {
        safeSetState(setShowResponse, false);
      }
      
      // Track event
      updateMetadata({
        interactionCount: progressionStatusRef.current.interactionCount + 1,
        lastEvent: {
          type: 'dialogue_advanced',
          timestamp: Date.now(),
          details: { stageId: currentStageId }
        }
      });
      
    } catch (error) {
      console.error('[DialogueFlow] Error advancing dialogue:', error);
      updateMetadata({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'dialogue_advancement_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
    }
  }, [
    currentStage, 
    currentStageId, 
    selectedOption, 
    showResponse, 
    showBackstory,
    stages, 
    dialogueState, 
    characterId, 
    onStageChange, 
    safeSetState, 
    updateMetadata
  ]);
  
  // Complete dialogue flow
  const completeDialogue = useCallback(() => {
    try {
      // Mark as completed for tracking
      updateMetadata({
        completed: true,
        endTime: Date.now(),
        lastEvent: {
          type: 'dialogue_completed',
          timestamp: Date.now(),
          details: { stageId: currentStageId }
        }
      });
      
      // Signal completion via event system
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
      
      console.log(`[DialogueFlow] Completed ${characterId} flow`);
      
    } catch (error) {
      console.error('[DialogueFlow] Error completing dialogue:', error);
      updateMetadata({ 
        errorCount: progressionStatusRef.current.errorCount + 1,
        lastEvent: {
          type: 'dialogue_completion_error',
          timestamp: Date.now(),
          details: { error: String(error) }
        }
      });
      
      // Special recovery for the important Kapoor journal flow
      if (characterId === 'kapoor' && !progressionStatusRef.current.journalAcquired) {
        try {
          console.warn('[DialogueFlow] Attempting critical path recovery for journal acquisition');
          
          // Try to force journal acquisition directly
          if (!journalStore.hasJournal) {
            console.warn('[DialogueFlow] Forcing journal acquisition');
            journalStore.initializeJournal('technical');
            
            updateMetadata({ 
              journalAcquired: true,
              recoveryAttempted: true,
              lastEvent: {
                type: 'journal_recovery',
                timestamp: Date.now()
              }
            });
            
            // Log emergency recovery action
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
          }
        } catch (recoveryError) {
          console.error('[DialogueFlow] Critical path recovery failed:', recoveryError);
        }
      }
    }
  }, [dialogueId, characterId, nodeId, currentStageId, updateMetadata, journalStore]);
  
  // Return the interface for dialogue flow control
  return {
    // State
    isLoading,
    error,
    currentStage,
    currentStageId,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText,
    
    // Actions
    handleOptionSelect,
    handleContinue,
    completeDialogue,
    
    // Status information for debugging
    status: progressionStatusRef.current,
    instanceId: instanceIdRef.current
  };
}