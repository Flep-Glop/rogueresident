// app/hooks/useDialogueFlow.ts
/**
 * Simplified Dialogue Flow Hook
 * 
 * Stripped down to absolute essentials to establish the core architecture
 * before layering in more sophisticated features.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDialogueStateMachine } from '../core/dialogue/DialogueStateMachine';
import { useEventBus } from '../core/events/CentralEventBus';
import { createKapoorCalibrationFlow } from '../core/dialogue/DialogueConverter';

// Legacy stage definition for backward compatibility
export interface DialogueStage {
  id: string;
  text: string;
  contextNote?: string;
  equipment?: {
    itemId: string;
    description?: string;
    alt?: string;
  };
  options?: DialogueOption[];
  nextStageId?: string;
  type?: string;
  isCriticalPath?: boolean;
  isConclusion?: boolean;
  isMandatory?: boolean;
}

// Option structure
export interface DialogueOption {
  id: string;
  text: string;
  responseText?: string;
  approach?: 'humble' | 'precision' | 'confidence';
  nextStageId?: string;
  insightGain?: number;
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  isCriticalPath?: boolean;
  triggersBackstory?: boolean;
}

// View model for dialogue option
export interface DialogueOptionView extends DialogueOption {}

// Props for dialogue flow hook
export interface UseDialogueFlowProps {
  stages?: DialogueStage[];
  characterId: string;
  nodeId?: string;
  dialogueId?: string;
  onComplete?: (results: any) => void;
  onOptionSelected?: (option: DialogueOptionView, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  enableMemory?: boolean;
  enableTelemetry?: boolean;
}

/**
 * Minimal dialogue flow hook to establish architecture without triggering React loops
 */
export function useDialogueFlow({
  stages,
  characterId,
  nodeId = 'unknown',
  dialogueId,
  onComplete,
  onOptionSelected,
  onStageChange,
  enableMemory = true,
  enableTelemetry = true
}: UseDialogueFlowProps) {
  // Core state
  const [currentStageId, setCurrentStageId] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<DialogueStage>({ id: 'loading', text: 'Loading...' });
  const [showResponse, setShowResponse] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);
  const [backstoryText, setBackstoryText] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Memoized values and refs
  const flowIdRef = useRef<string>(dialogueId || `dialogue-${characterId}-${Date.now()}`);
  const visitedStageIdsRef = useRef<string[]>([]);
  const selectedOptionRef = useRef<DialogueOption | null>(null);
  const prevStageIdRef = useRef<string>('');
  
  // Get state machine API - minimal approach to avoid selector issues
  const stateMachine = useDialogueStateMachine.getState();
  
  // Initialize flow once
  useEffect(() => {
    if (hasInitialized) return;
    
    // Create Kapoor flow for simplicity - just to get basic dialogue working
    if (characterId === 'kapoor' && nodeId) {
      try {
        const flow = createKapoorCalibrationFlow(nodeId);
        stateMachine.initializeFlow(flow);
        setHasInitialized(true);
        console.log(`[DialogueFlow] Initialized Kapoor flow`);
      } catch (err) {
        console.error(`[DialogueFlow] Error initializing flow:`, err);
      }
    }
  }, [characterId, nodeId, hasInitialized]);
  
  // Update state based on state machine
  useEffect(() => {
    const checkState = () => {
      const currentState = stateMachine.currentState;
      if (!currentState) return;
      
      // Update current stage ID if changed
      if (currentState.id !== currentStageId) {
        prevStageIdRef.current = currentStageId;
        setCurrentStageId(currentState.id);
        
        // Track visited stages
        if (!visitedStageIdsRef.current.includes(currentState.id)) {
          visitedStageIdsRef.current.push(currentState.id);
        }
        
        // Call stage change callback
        if (onStageChange && prevStageIdRef.current) {
          onStageChange(currentState.id, prevStageIdRef.current);
        }
      }
      
      // Update current stage
      setCurrentStage({
        id: currentState.id,
        text: currentState.text || '',
        contextNote: currentState.contextNote,
        equipment: currentState.equipment,
        options: currentState.options,
        isConclusion: currentState.isConclusion,
        isCriticalPath: currentState.isCriticalPath
      });
      
      // Update UI state
      setShowResponse(stateMachine.showResponse);
      setShowBackstory(stateMachine.showBackstory);
      setBackstoryText(stateMachine.backstoryText);
      
      // Update selected option
      selectedOptionRef.current = stateMachine.selectedOption;
    };
    
    // Check initial state
    checkState();
    
    // Set up interval to periodically check state
    // This is a fallback approach to avoid direct selector issues
    const intervalId = setInterval(checkState, 500);
    
    return () => clearInterval(intervalId);
  }, [currentStageId, onStageChange, stateMachine]);
  
  // Handle option selection
  const handleOptionSelect = useCallback((option: DialogueOptionView) => {
    try {
      stateMachine.selectOption(option.id);
      
      // Call option selected callback
      if (onOptionSelected) {
        onOptionSelected(option, currentStageId);
      }
    } catch (err) {
      console.error(`[DialogueFlow] Error selecting option:`, err);
    }
  }, [currentStageId, onOptionSelected, stateMachine]);
  
  // Handle continue button
  const handleContinue = useCallback(() => {
    try {
      stateMachine.advanceState();
    } catch (err) {
      console.error(`[DialogueFlow] Error advancing state:`, err);
    }
  }, [stateMachine]);
  
  // Jump to specific stage
  const jumpToStage = useCallback((stageId: string) => {
    try {
      stateMachine.jumpToState(stageId);
    } catch (err) {
      console.error(`[DialogueFlow] Error jumping to state:`, err);
    }
  }, [stateMachine]);
  
  // Complete dialogue flow
  const completeDialogue = useCallback(() => {
    try {
      stateMachine.completeFlow();
      
      // Call complete callback
      if (onComplete) {
        onComplete({
          insightGained: 0,
          relationshipChange: 0,
          knowledgeGained: {},
          visitedStates: [...visitedStageIdsRef.current]
        });
      }
    } catch (err) {
      console.error(`[DialogueFlow] Error completing flow:`, err);
    }
  }, [onComplete, stateMachine]);
  
  // Return minimal interface
  return {
    currentStage,
    currentStageId,
    selectedOption: selectedOptionRef.current,
    showResponse,
    showBackstory,
    backstoryText,
    handleOptionSelect,
    handleContinue,
    jumpToStage,
    isProgressionValid: true, // Simplified
    completeDialogue,
    visitedStageIds: visitedStageIdsRef.current
  };
}

export default useDialogueFlow;