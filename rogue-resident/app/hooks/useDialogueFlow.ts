// app/hooks/useDialogueFlow.ts
/**
 * Enhanced Dialogue Flow Hook
 * 
 * A resilient React integration for the dialogue system with proper lifecycle management.
 * Based on the flow management patterns from narrative-rich games that ensure continuity
 * even during component remounting scenarios.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDialogueStateMachine, createKapoorCalibrationFlow, createJesseEquipmentFlow } from '@/app/core/dialogue/DialogueStateMachine';
import { useEventBus, safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useJournalStore } from '@/app/store/journalStore';

// Required interfaces to match existing imports
export interface DialogueStage {
  id: string;
  type: string;
  text: string;
  options?: DialogueOption[];
  responseText?: string;
  isConclusion?: boolean;
}

export interface DialogueOption {
  id: string;
  text: string;
  nextStageId?: string;
  responseText?: string;
}

export interface DialogueOptionView extends DialogueOption {
  isSelected?: boolean;
  isDisabled?: boolean;
}

// NEW: Dialogue progression status tracking object
interface DialogueProgressionStatus {
  // Basic progression tracking
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
  
  // For debugging
  lastEvent: {
    type: string;
    timestamp: number;
  } | null;
}

/**
 * React hook for dialogue flow management with enhanced reliability
 */
export function useDialogueFlow(nodeId: string, character: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track instance and status across renders
  const instanceIdRef = useRef<string>(`dialogue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const progressionStatusRef = useRef<DialogueProgressionStatus>({
    nodeId,
    characterId: character,
    started: false,
    completed: false,
    journalAcquired: false,
    errorCount: 0,
    recoveryAttempted: false,
    startTime: null,
    endTime: null,
    lastEvent: null
  });
  
  // Get dialogue state machine interface
  const dialogueState = useDialogueStateMachine();
  const journalStore = useJournalStore();
  
  // Track mounted state to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  // Update metadata safely
  const updateMetadata = useCallback((updates: Partial<DialogueProgressionStatus>) => {
    Object.assign(progressionStatusRef.current, updates);
  }, []);
  
  // Safe state updater
  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);
  
  // Initialize dialogue flow
  useEffect(() => {
    console.log(`[DialogueFlow] Initializing ${character} flow for node ${nodeId}`);
    
    // Mark as mounted
    isMountedRef.current = true;
    
    // Skip if already initialized
    if (progressionStatusRef.current.started) {
      return;
    }
    
    // Set initial loading state
    safeSetState(setIsLoading, true);
    safeSetState(setError, null);
    
    // Update progression tracking
    updateMetadata({
      nodeId,
      characterId: character,
      started: true,
      startTime: Date.now(),
      lastEvent: {
        type: 'initialization',
        timestamp: Date.now()
      }
    });
    
    // Determine which flow to use
    try {
      let flow;
      
      switch (character) {
        case 'kapoor':
          flow = createKapoorCalibrationFlow(nodeId);
          break;
        case 'jesse':
          flow = createJesseEquipmentFlow(nodeId);
          break;
        default:
          throw new Error(`Unknown character: ${character}`);
      }
      
      // Initialize flow in state machine
      dialogueState.initializeFlow(flow);
      
      // Log initialization
      console.log(`[DialogueFlow] Initialized ${character} flow`);
      
      // Register cleanup to complete dialogue when component unmounts
      cleanupFunctionRef.current = () => {
        try {
          if (dialogueState.activeFlow && !progressionStatusRef.current.completed) {
            console.log(`[DialogueFlow] Unmounting without completion, cleaning up ${character} flow`);
            
            // Attempt to complete the flow properly
            safeDispatch(
              GameEventType.DIALOGUE_COMPLETED,
              {
                flowId: dialogueState.activeFlow.id,
                character,
                nodeId,
                completed: false,
                reason: 'component_unmounted'
              },
              'useDialogueFlow_cleanup'
            );
            
            // Mark as completed for tracking
            updateMetadata({
              completed: true,
              endTime: Date.now(),
              lastEvent: {
                type: 'forced_cleanup',
                timestamp: Date.now()
              }
            });
          }
        } catch (error) {
          console.error('[DialogueFlow] Error during cleanup:', error);
        }
      };
      
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
          timestamp: Date.now()
        }
      });
      
      // Try to recover by forcing manual cleanup
      safeDispatch(
        GameEventType.DIALOGUE_COMPLETED,
        {
          flowId: character + '_recovery',
          character,
          nodeId,
          completed: false,
          reason: 'initialization_error'
        },
        'useDialogueFlow_error_recovery'
      );
    }
    
    // Cleanup function
    return () => {
      console.log(`[DialogueFlow] Unmounting ${character} flow`);
      
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
  }, [nodeId, character, dialogueState, safeSetState, updateMetadata]);
  
  // Handle dialogue option selection
  const selectOption = useCallback((optionId: string) => {
    try {
      if (!dialogueState.activeFlow) {
        console.error('[DialogueFlow] Cannot select option, no active flow');
        return;
      }
      
      dialogueState.selectOption(optionId);
      
      // Track event
      updateMetadata({
        lastEvent: {
          type: 'option_selected',
          timestamp: Date.now()
        }
      });
      
      // Log option selection for UI events
      safeDispatch(
        GameEventType.UI_DIALOGUE_ADVANCED,
        {
          componentId: 'dialogue_system',
          action: 'option-selected',
          metadata: {
            optionId,
            character
          }
        }
      );
      
    } catch (error) {
      console.error('[DialogueFlow] Error selecting option:', error);
      updateMetadata({ errorCount: progressionStatusRef.current.errorCount + 1 });
    }
  }, [dialogueState, character, updateMetadata]);
  
  // Handle dialogue advancement
  const advanceDialogue = useCallback(() => {
    try {
      if (!dialogueState.activeFlow) {
        console.error('[DialogueFlow] Cannot advance dialogue, no active flow');
        return;
      }
      
      dialogueState.advanceState();
      
      // Track event
      updateMetadata({
        lastEvent: {
          type: 'dialogue_advanced',
          timestamp: Date.now()
        }
      });
      
      // Log advancement for UI events
      safeDispatch(
        GameEventType.UI_DIALOGUE_ADVANCED,
        {
          componentId: 'dialogue_system',
          action: 'continue',
          metadata: {
            character,
            currentNodeId: dialogueState.currentNodeId
          }
        }
      );
      
    } catch (error) {
      console.error('[DialogueFlow] Error advancing dialogue:', error);
      updateMetadata({ errorCount: progressionStatusRef.current.errorCount + 1 });
    }
  }, [dialogueState, character, updateMetadata]);
  
  // Complete dialogue flow
  const completeDialogue = useCallback(() => {
    try {
      if (!dialogueState.activeFlow) {
        console.error('[DialogueFlow] Cannot complete dialogue, no active flow');
        return;
      }
      
      dialogueState.completeFlow();
      
      // Mark as completed for tracking
      updateMetadata({
        completed: true,
        endTime: Date.now(),
        lastEvent: {
          type: 'dialogue_completed',
          timestamp: Date.now()
        }
      });
      
      console.log(`[DialogueFlow] Completed ${character} flow`);
      
    } catch (error) {
      console.error('[DialogueFlow] Error completing dialogue:', error);
      updateMetadata({ errorCount: progressionStatusRef.current.errorCount + 1 });
      
      // Special recovery for the important Kapoor journal flow
      if (character === 'kapoor' && !progressionStatusRef.current.journalAcquired) {
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
                character: 'kapoor',
                source: 'dialogue_hook_recovery',
                forced: true
              }
            );
          }
        } catch (recoveryError) {
          console.error('[DialogueFlow] Critical path recovery failed:', recoveryError);
        }
      }
    }
  }, [dialogueState, character, updateMetadata, journalStore]);
  
  // Return the interface for dialogue flow control
  return {
    isLoading,
    error,
    
    // State from dialogue state machine
    isActive: dialogueState.isActive,
    currentText: dialogueState.getCurrentText(),
    options: dialogueState.getAvailableOptions(),
    showResponse: dialogueState.showResponse,
    showBackstory: dialogueState.showBackstory,
    backstoryText: dialogueState.backstoryText,
    
    // Actions
    selectOption,
    advanceDialogue,
    completeDialogue,
    
    // Status information
    status: progressionStatusRef.current,
    instanceId: instanceIdRef.current
  };
}