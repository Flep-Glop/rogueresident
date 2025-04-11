// app/core/dialogue/DialogueStateMachine.ts

/**
 * Refactored Dialogue State Machine
 * 
 * Implements the Chamber Transition Pattern:
 * 1. Atomic state updates
 * 2. Primitive value extraction
 * 3. Stable function references
 * 4. Clear state ownership
 * 
 * This hybrid implementation maintains both Zustand store and class-based
 * interfaces, but with optimized rendering characteristics.
 */

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { safeDispatch } from '../events/CentralEventBus';
import { GameEventType } from '../events/EventTypes';
import { useCallback, useMemo } from 'react';

// ========== Core Types ==========

// Dialogue state types with clear ownership boundaries
export type DialogueStateType = 
  | 'intro'              // Introduction phase
  | 'question'           // Player is being asked a question
  | 'response'           // Character is responding to player choice
  | 'backstory'          // Character is sharing deeper context
  | 'conclusion'         // Wrapping up the interaction
  | 'critical-moment'    // Special progression-critical dialogue 
  | 'transition';        // Between states

// Dialogue state representation
export interface DialogueState {
  id: string;
  type: DialogueStateType;
  text?: string;
  options?: DialogueOption[];
  nextStateId?: string;
  isConclusion?: boolean;
  isCriticalPath?: boolean;
  isMandatory?: boolean;
  maxVisits?: number;
  noAutoAdvance?: boolean; // Flag to prevent auto-advancement for player choice moments
  onEnter?: (context: DialogueContext) => void;
  onExit?: (context: DialogueContext) => void;
}

// Pure data object for dialogue options
export interface DialogueOption {
  id: string;
  text: string;
  responseText?: string;
  nextStateId?: string;
  insightGain?: number;
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  triggersBackstory?: boolean;
  isCriticalPath?: boolean;
  condition?: (context: DialogueContext) => boolean;
}

// Dialogue context provides shared state across the flow
export interface DialogueContext {
  characterId: string;
  nodeId: string;
  playerScore: number;
  selectedOptionIds: string[];
  knowledgeGained: Record<string, number>;
  visitedStateIds: string[];
  criticalPathProgress: Record<string, boolean>;
  [key: string]: any;
}

// Complete dialogue flow definition
export interface DialogueFlow {
  id: string;
  initialStateId: string;
  stages?: DialogueStage[];  // For backward compatibility
  states: Record<string, DialogueState>;
  context: DialogueContext;
  progressionCheckpoints: string[];
  onComplete?: (context: DialogueContext) => void;
}

// Simple dialogue stage (used in earlier versions)
export interface DialogueStage {
  id: string;
  text: string;
  type?: string;
  contextNote?: string;
  options?: DialogueStageOption[];
  isConclusion?: boolean;
  isCriticalPath?: boolean;
  nextStageId?: string;
}

// Simple dialogue option (used in earlier versions)
export interface DialogueStageOption {
  id: string;
  text: string;
  nextStageId: string;
  responseText?: string;
  insightGain?: number;
  relationshipChange?: number;
  triggersBackstory?: boolean;
  isCriticalPath?: boolean;
}

// Progress status for telemetry and validation
export interface DialogueProgressionStatus {
  isComplete: boolean;
  criticalPathsCompleted: boolean;
  missingCheckpoints: string[];
  loopDetected: boolean;
  lastVisitedStateId?: string;
}

// ========== Action Types ==========

// Dialogue action types for state updates
type DialogueAction = 
  | { type: 'INITIALIZE_FLOW'; flow: DialogueFlow }
  | { type: 'SELECT_OPTION'; optionId: string }
  | { type: 'ADVANCE_STATE' }
  | { type: 'ADVANCE_TO_STATE'; stateId: string }
  | { type: 'COMPLETE_FLOW' }
  | { type: 'SET_RESPONSE_VISIBILITY'; visible: boolean }
  | { type: 'SET_BACKSTORY_VISIBILITY'; visible: boolean; text?: string }
  | { type: 'UPDATE_CONTEXT'; update: Partial<DialogueContext> };

// ========== Core Store ==========

// State machine store interface with primitive properties
interface DialogueStateMachineState {
  // Core state - primitives and normalized objects
  activeFlowId: string | null;
  currentStateId: string | null;
  selectedOptionId: string | null;
  showResponse: boolean;
  showBackstory: boolean;
  backstoryText: string;
  isActive: boolean;
  currentNodeId: string | null;
  errorState: string | null;
  
  // References to actual data (not for direct rendering)
  activeFlow: DialogueFlow | null;
  currentState: DialogueState | null;
  context: DialogueContext | null;
  selectedOption: DialogueOption | null;
  
  // Flow control with stable function references
  dispatch: (action: DialogueAction) => void;
  initializeFlow: (flow: DialogueFlow) => string | null;
  selectOption: (optionId: string) => void;
  advanceState: () => void;
  advanceToStage: (stateId: string) => void;
  completeFlow: () => void;
  
  // State selectors with primitive returns
  getAvailableOptions: () => DialogueOption[];
  getCurrentText: () => string;
  isInCriticalState: () => boolean;
  
  // Progression validation
  getProgressionStatus: () => DialogueProgressionStatus;
}

// Simplified event logging with error handling
function logEvent(eventType: string, data: any) {
  try {
    console.log(`[DialogueEvent] ${eventType}:`, data);
    
    // Dispatch to central event bus for important events
    if (['DIALOGUE_STARTED', 'DIALOGUE_COMPLETED', 'DIALOGUE_ERROR'].includes(eventType)) {
      const gameEventType = 
        eventType === 'DIALOGUE_STARTED' ? GameEventType.DIALOGUE_STARTED :
        eventType === 'DIALOGUE_COMPLETED' ? GameEventType.DIALOGUE_COMPLETED :
        GameEventType.DIALOGUE_ERROR;
      
      safeDispatch(gameEventType, data, 'DialogueStateMachine');
    }
  } catch (error) {
    console.error(`[DialogueEvent] Failed to log event ${eventType}:`, error);
  }
}

/**
 * Zustand store for reactive state management in components
 * Optimized for primitive extraction and stable references
 */
export const useDialogueStateMachine = create<DialogueStateMachineState>((set, get) => ({
  // Initial primitive state
  activeFlowId: null,
  currentStateId: null,
  selectedOptionId: null,
  showResponse: false,
  showBackstory: false,
  backstoryText: '',
  isActive: false,
  currentNodeId: null,
  errorState: null,
  
  // Reference data (not for direct rendering)
  activeFlow: null,
  currentState: null,
  context: null,
  selectedOption: null,
  
  // Unified dispatch function for state updates
  dispatch: (action: DialogueAction) => {
    console.log(`[DialogueMachine] Dispatching: ${action.type}`);
    
    try {
      switch (action.type) {
        case 'INITIALIZE_FLOW':
          get().initializeFlow(action.flow);
          break;
        case 'SELECT_OPTION':
          get().selectOption(action.optionId);
          break;
        case 'ADVANCE_STATE':
          get().advanceState();
          break;
        case 'ADVANCE_TO_STATE':
          get().advanceToStage(action.stateId);
          break;
        case 'COMPLETE_FLOW':
          get().completeFlow();
          break;
        case 'SET_RESPONSE_VISIBILITY':
          set({ showResponse: action.visible });
          break;
        case 'SET_BACKSTORY_VISIBILITY':
          set(state => ({
            showBackstory: action.visible,
            backstoryText: action.text !== undefined ? action.text : state.backstoryText
          }));
          break;
        case 'UPDATE_CONTEXT':
          set(state => {
            if (!state.context) return state;
            
            // Create new context object with updates
            const updatedContext = {
              ...state.context,
              ...action.update
            };
            
            return { context: updatedContext };
          });
          break;
      }
    } catch (error) {
      console.error(`[DialogueMachine] Error in dispatch for action ${action.type}:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
    }
  },
  
  initializeFlow: (flow: DialogueFlow): string | null => {
    try {
      // Validate flow has required properties
      if (!flow || !flow.initialStateId || !flow.states || !flow.context) {
        throw new Error('Invalid dialogue flow: missing required properties');
      }
      
      // Find initial state
      const initialState = flow.states[flow.initialStateId];
      
      if (!initialState) {
        throw new Error(`Initial state ${flow.initialStateId} not found in flow ${flow.id}`);
      }
      
      // Process the dialogue state graph to mark all states with options 
      // as noAutoAdvance if not explicitly specified
      const processedStates = Object.fromEntries(
        Object.entries(flow.states).map(([id, state]) => {
          const hasOptions = state.options && state.options.length > 0;
          const inferredType = state.type || (hasOptions ? 'question' : 'intro');
          
          return [
            id,
            { 
              ...state, 
              type: inferredType,
              // Mark states with options to not auto-advance unless explicitly allowed
              noAutoAdvance: hasOptions ? (state.noAutoAdvance ?? true) : !!state.noAutoAdvance
            }
          ];
        })
      );
      
      // Create a defensive copy of the context
      const safeContext = {
        ...flow.context,
        visitedStateIds: [...(flow.context.visitedStateIds || []), flow.initialStateId],
        criticalPathProgress: { ...(flow.context.criticalPathProgress || {}) },
      };
      
      // Set state atomically to prevent multiple rerenders
      set({
        // Store reference data
        activeFlow: {
          ...flow,
          context: safeContext,
          states: processedStates
        },
        currentState: processedStates[flow.initialStateId],
        context: safeContext,
        selectedOption: null,
        
        // Update primitive values for rendering
        activeFlowId: flow.id,
        currentStateId: flow.initialStateId,
        selectedOptionId: null,
        showResponse: false,
        showBackstory: false,
        backstoryText: '',
        isActive: true,
        currentNodeId: flow.context.nodeId || null,
        errorState: null
      });
      
      // Call onEnter for initial state (outside of render cycle)
      if (initialState.onEnter && safeContext) {
        try {
          initialState.onEnter(safeContext);
        } catch (error) {
          console.error(`[DialogueMachine] Error in onEnter for ${initialState.id}:`, error);
        }
      }
      
      // Log the start of this dialogue flow
      logEvent('DIALOGUE_STARTED', {
        flowId: flow.id,
        character: flow.context.characterId,
        initialState: initialState.id
      });
      
      return flow.initialStateId;
    } catch (error) {
      console.error(`[DialogueMachine] Error initializing flow:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
      return null;
    }
  },
  
  selectOption: (optionId: string) => {
    try {
      const { currentState, context, activeFlow } = get();
      
      if (!currentState || !context || !activeFlow) {
        console.warn(`[DialogueMachine] Cannot select option without active flow`);
        return;
      }
      
      // Find the selected option in the current state's options
      const option = currentState.options?.find(o => o.id === optionId);
      
      if (!option) {
        console.error(`Option ${optionId} not found in state ${currentState.id}`);
        return;
      }
      
      // Create updated context with option effects
      const updatedContext = { ...context };
      
      // Update player score if relationshipChange is defined
      if (option.relationshipChange !== undefined) {
        updatedContext.playerScore += option.relationshipChange;
      }
      
      // Add option to selection history
      updatedContext.selectedOptionIds = [...updatedContext.selectedOptionIds, optionId];
      
      // Track critical path progress
      if (option.isCriticalPath) {
        updatedContext.criticalPathProgress = {
          ...updatedContext.criticalPathProgress,
          [`option-${optionId}`]: true
        };
      }
      
      // Apply knowledge gain if any
      if (option.knowledgeGain) {
        const { conceptId, amount } = option.knowledgeGain;
        updatedContext.knowledgeGained = {
          ...updatedContext.knowledgeGained,
          [conceptId]: (updatedContext.knowledgeGained[conceptId] || 0) + amount
        };
      }
      
      // Check for backstory
      let backstoryText = '';
      if (option.triggersBackstory && updatedContext.playerScore >= 2) {
        // Find backstory state - typically named with a backstory prefix
        const backstoryId = `backstory-${option.id.split('-')[1] || 'default'}`;
        const backstoryState = Object.values(activeFlow.states)
          .find(s => s.id === backstoryId);
        
        if (backstoryState && backstoryState.text) {
          backstoryText = backstoryState.text;
        }
      }
      
      // Update state atomically
      set({
        context: updatedContext,
        selectedOption: option,
        selectedOptionId: optionId,
        showResponse: Boolean(option.responseText),
        showBackstory: Boolean(option.triggersBackstory && updatedContext.playerScore >= 2),
        backstoryText: backstoryText
      });
      
      // Log the option selection
      logEvent('DIALOGUE_OPTION_SELECTED', {
        optionId,
        flowId: activeFlow.id,
        stageId: currentState.id,
        character: context.characterId,
        insightGain: option.insightGain || 0,
        relationshipChange: option.relationshipChange || 0,
        knowledgeGain: option.knowledgeGain
      });
      
      // Log knowledge gain if applicable
      if (option.knowledgeGain) {
        logEvent('KNOWLEDGE_GAINED', {
          conceptId: option.knowledgeGain.conceptId,
          amount: option.knowledgeGain.amount,
          domainId: option.knowledgeGain.domainId,
          character: context.characterId
        });
      }
    } catch (error) {
      console.error(`[DialogueMachine] Error selecting option:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
    }
  },
  
  advanceState: () => {
    try {
      const { currentState, activeFlow, selectedOption, showResponse, showBackstory } = get();
      
      if (!activeFlow || !currentState) {
        console.warn(`[DialogueMachine] Cannot advance state without active flow`);
        return;
      }
      
      // If showing response or backstory, clear it first but persist the selectedOption
      if (showResponse || showBackstory) {
        set({ 
          showResponse: false,
          showBackstory: false 
        });
        
        // Add small delay before next state transition to avoid collision
        setTimeout(() => {
          const currentFlow = get().activeFlow;
          if (currentFlow) {  // Verify flow still exists
            get().advanceState();  // Continue the advance after UI update cycle
          }
        }, 50);
        
        return;
      }
      
      // Determine next state
      let nextStateId: string | undefined;
      
      // Priority: selected option > current state
      if (selectedOption?.nextStateId) {
        nextStateId = selectedOption.nextStateId;
      } else if (currentState.nextStateId && !currentState.noAutoAdvance) {
        nextStateId = currentState.nextStateId;
      }
      
      // If we have a next state, jump to it
      if (nextStateId) {
        get().advanceToStage(nextStateId);
      } 
      // Otherwise, if at conclusion, complete the flow
      else if (currentState.isConclusion) {
        get().completeFlow();
      } else {
        console.warn(`[DialogueMachine] No next state defined for ${currentState.id}`);
      }
    } catch (error) {
      console.error(`[DialogueMachine] Error advancing state:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
    }
  },
  
  advanceToStage: (stateId: string) => {
    try {
      const { activeFlow, currentState, context, currentStateId } = get();
      
      if (!activeFlow || !context) {
        console.warn(`[DialogueMachine] Cannot jump to state without active flow`);
        return;
      }
      
      // Find the target state
      const targetState = activeFlow.states[stateId];
      
      if (!targetState) {
        console.error(`Target state ${stateId} not found in flow ${activeFlow.id}`);
        return;
      }
      
      // Call onExit for current state if it exists
      if (currentState?.onExit) {
        try {
          currentState.onExit(context);
        } catch (error) {
          console.error(`[DialogueMachine] Error in onExit for ${currentState.id}:`, error);
        }
      }
      
      // Update state visitation tracking 
      const updatedContext = { ...context };
      
      // Update visited states
      if (!updatedContext.visitedStateIds.includes(stateId)) {
        updatedContext.visitedStateIds = [...updatedContext.visitedStateIds, stateId];
      }
      
      // Track critical path progress
      if (targetState.isCriticalPath) {
        updatedContext.criticalPathProgress = {
          ...updatedContext.criticalPathProgress,
          [`state-${stateId}`]: true
        };
      }
      
      // Update state atomically
      set({
        currentState: targetState,
        context: updatedContext,
        selectedOption: null,
        
        // Update primitives
        currentStateId: stateId,
        selectedOptionId: null,
        showResponse: false,
        showBackstory: false
      });
      
      // Log state transition
      logEvent('DIALOGUE_STATE_CHANGED', {
        fromState: currentStateId,
        toState: stateId,
        flowId: activeFlow.id
      });
      
      // Call onEnter for new state (outside render cycle)
      if (targetState.onEnter) {
        try {
          const currentContext = get().context;
          if (currentContext) {
            targetState.onEnter(currentContext);
          }
        } catch (error) {
          console.error(`[DialogueMachine] Error in onEnter for ${targetState.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[DialogueMachine] Error jumping to state:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
    }
  },
  
  completeFlow: () => {
    try {
      const { activeFlow, context } = get();
      
      if (!activeFlow || !context) {
        console.warn(`[DialogueMachine] Cannot complete flow without active flow`);
        return;
      }
      
      // Call the onComplete callback if it exists
      if (activeFlow.onComplete) {
        try {
          activeFlow.onComplete(context);
        } catch (error) {
          console.error(`[DialogueMachine] Error in flow completion callback:`, error);
        }
      }
      
      // Log completion event
      logEvent('DIALOGUE_COMPLETED', {
        flowId: activeFlow.id,
        character: context.characterId,
        completed: true,
        result: {
          playerScore: context.playerScore,
          visitedStates: context.visitedStateIds,
          selectedOptions: context.selectedOptionIds
        }
      });
      
      // Reset state atomically
      set({
        activeFlow: null,
        currentState: null,
        context: null,
        selectedOption: null,
        activeFlowId: null,
        currentStateId: null,
        selectedOptionId: null,
        showResponse: false,
        showBackstory: false,
        backstoryText: '',
        isActive: false,
        currentNodeId: null
      });
    } catch (error) {
      console.error(`[DialogueMachine] Error completing flow:`, error);
      set({ errorState: error instanceof Error ? error.message : String(error) });
    }
  },
  
  getAvailableOptions: () => {
    try {
      const { currentState, context } = get();
      
      if (!currentState?.options || !context) {
        return [];
      }
      
      // Filter options based on conditions
      return currentState.options.filter(option => {
        if (!option.condition) return true;
        try {
          return option.condition(context);
        } catch (error) {
          console.error(`[DialogueMachine] Error evaluating option condition for ${option.id}:`, error);
          return false;
        }
      });
    } catch (error) {
      console.error(`[DialogueMachine] Error getting available options:`, error);
      return [];
    }
  },
  
  getCurrentText: () => {
    try {
      const { currentState, selectedOption, showResponse } = get();
      
      if (!currentState) return '';
      
      if (showResponse && selectedOption?.responseText) {
        return selectedOption.responseText;
      }
      
      return currentState.text || '';
    } catch (error) {
      console.error(`[DialogueMachine] Error getting current text:`, error);
      return '';
    }
  },
  
  isInCriticalState: () => {
    try {
      const { currentState } = get();
      return Boolean(currentState?.isCriticalPath);
    } catch (error) {
      console.error(`[DialogueMachine] Error checking critical state:`, error);
      return false;
    }
  },
  
  getProgressionStatus: () => {
    try {
      const { activeFlow, context } = get();
      
      // Default status
      const defaultStatus: DialogueProgressionStatus = {
        isComplete: false,
        criticalPathsCompleted: false,
        missingCheckpoints: [],
        loopDetected: false
      };
      
      if (!activeFlow || !context) return defaultStatus;
      
      // Identify critical paths that must be visited
      const criticalStateIds = Object.entries(activeFlow.states)
        .filter(([_, state]) => state.isCriticalPath)
        .map(([id]) => id);
      
      // Check which critical states have been visited
      const missingCriticalStates = criticalStateIds.filter(id => 
        !context.visitedStateIds.includes(id)
      );
      
      // Check if all checkpoints have been hit
      const missingCheckpoints = activeFlow.progressionCheckpoints.filter(id => 
        !context.visitedStateIds.includes(id)
      );
      
      return {
        isComplete: context.visitedStateIds.length > 0,
        criticalPathsCompleted: missingCriticalStates.length === 0,
        missingCheckpoints,
        loopDetected: false, 
        lastVisitedStateId: context.visitedStateIds[context.visitedStateIds.length - 1]
      };
    } catch (error) {
      console.error(`[DialogueMachine] Error getting progression status:`, error);
      return {
        isComplete: false,
        criticalPathsCompleted: false,
        missingCheckpoints: [],
        loopDetected: false
      };
    }
  }
}));

// ========== Selection Hooks ==========

/**
 * Hook to extract a single primitive value from dialogue state
 * Use for rendering optimization
 */
export function useDialogueValue<T>(selector: (state: DialogueStateMachineState) => T, defaultValue: T): T {
  // CRITICAL FIX: Wrap selector in useCallback for stable reference
  const stableSelector = useCallback(selector, []);
  
  // Wrap in try-catch for stability
  try {
    const value = useDialogueStateMachine(stableSelector);
    return value === undefined ? defaultValue : value;
  } catch (error) {
    console.error('[DialogueMachine] Error in useDialogueValue:', error);
    return defaultValue;
  }
}

/**
 * Hook for extracting multiple primitive values
 * Optimized with shallow comparison
 */
export function useDialogueValues<T extends object>(
  selector: (state: DialogueStateMachineState) => T
): T {
  // CRITICAL FIX: Wrap selector in useMemo for stable reference
  const stableSelector = useMemo(() => selector, []);
  
  // Use shallow comparison to prevent unnecessary re-renders
  return useDialogueStateMachine(stableSelector, shallow);
}

/**
 * Hook for accessing stable function references
 */
export function useDialogueFunctions() {
  // CRITICAL FIX: Use a memoized selector for stable references
  const functionSelector = useMemo(() => 
    (state: DialogueStateMachineState) => ({
      initializeFlow: state.initializeFlow,
      selectOption: state.selectOption,
      advanceState: state.advanceState,
      advanceToStage: state.advanceToStage,
      completeFlow: state.completeFlow
    }), 
  []);
  
  return useDialogueStateMachine(functionSelector, shallow);
}

// ========== Flow Utilities ==========

/**
 * Factory function for dialogue flow creation with proper defaults
 */
export function createDialogueFlow(
  id: string,
  states: Record<string, DialogueState>,
  initialStateId: string,
  context: Partial<DialogueContext> = {},
  onComplete?: (context: DialogueContext) => void
): DialogueFlow {
  // Initialize the context with defaults
  const defaultContext: DialogueContext = {
    characterId: 'unknown',
    nodeId: 'unknown',
    playerScore: 0,
    selectedOptionIds: [],
    knowledgeGained: {},
    visitedStateIds: [],
    criticalPathProgress: {},
    ...context
  };
  
  // Extract progression checkpoints
  const progressionCheckpoints = Object.entries(states)
    .filter(([_, state]) => state.isCriticalPath)
    .map(([id]) => id);
  
  // Process states to infer auto-advance settings
  const processedStates: Record<string, DialogueState> = {};
  
  Object.entries(states).forEach(([id, state]) => {
    const hasOptions = state.options && state.options.length > 0;
    
    // States with options should default to noAutoAdvance=true
    const inferredNoAutoAdvance = hasOptions ? (state.noAutoAdvance ?? true) : !!state.noAutoAdvance;
    
    processedStates[id] = {
      ...state,
      noAutoAdvance: inferredNoAutoAdvance
    };
  });
  
  return {
    id,
    initialStateId,
    states: processedStates,
    context: defaultContext,
    progressionCheckpoints,
    onComplete
  };
}

/**
 * Helper function to determine journal tier based on performance
 */
export function determineJournalTier(context: DialogueContext): 'base' | 'technical' | 'annotated' {
  const { playerScore } = context;
  
  if (playerScore >= 3) {
    return 'annotated';
  } else if (playerScore >= 0) {
    return 'technical';
  } else {
    return 'base';
  }
}

/**
 * Creates a Kapoor calibration flow with the proper dialogue structure
 */
export function createKapoorCalibrationFlow(nodeId: string): DialogueFlow & { stages?: DialogueStage[] } {
  // Create the flow
  const flow = createDialogueFlow(
    'kapoor-calibration',
    {
      // Core states
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
        options: [
          { 
            id: "humble-intro",
            text: "I'm looking forward to learning the procedures.", 
            nextStateId: 'basics',
            responseText: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals.",
            relationshipChange: 1
          },
          { 
            id: "confident-intro",
            text: "I've done calibrations before during my internship.", 
            nextStateId: 'basics',
            responseText: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely.",
            relationshipChange: -1
          }
        ],
        nextStateId: 'basics'
      },
      
      // Add a 'basics' state to receive transitions from intro
      'basics': {
        id: 'basics',
        type: 'question',
        text: "Let's begin by verifying the calibration constants. Accuracy in measurement is the foundation of patient safety.",
        options: [
          {
            id: "protocol-question",
            text: "Could you walk me through the protocol?",
            nextStateId: 'journal-presentation',
            responseText: "Certainly. First, we must understand how to properly document our findings.",
            relationshipChange: 1
          },
          {
            id: "confident-approach",
            text: "I'd like to try the calibration myself.",
            nextStateId: 'journal-presentation',
            responseText: "Enthusiasm is commendable, but proper documentation must precede action.",
            relationshipChange: 0
          }
        ]
      },
      
      // Critical journal presentation state
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
        isCriticalPath: true,
        isConclusion: true
      }
    },
    'intro',
    { characterId: 'kapoor', nodeId }
  );
  
  // Legacy stages format for backward compatibility
  const stages: DialogueStage[] = [
    {
      id: 'intro',
      text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
      options: [
        { 
          id: "humble-intro",
          text: "I'm looking forward to learning the procedures.", 
          nextStageId: 'basics',
          responseText: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals.",
          relationshipChange: 1
        },
        { 
          id: "confident-intro",
          text: "I've done calibrations before during my internship.", 
          nextStageId: 'basics',
          responseText: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely.",
          relationshipChange: -1
        }
      ]
    },
    {
      id: 'basics',
      text: "Let's begin by verifying the calibration constants. Accuracy in measurement is the foundation of patient safety.",
      options: [
        {
          id: "protocol-question",
          text: "Could you walk me through the protocol?",
          nextStageId: 'journal-presentation',
          responseText: "Certainly. First, we must understand how to properly document our findings.",
          relationshipChange: 1
        },
        {
          id: "confident-approach",
          text: "I'd like to try the calibration myself.",
          nextStageId: 'journal-presentation',
          responseText: "Enthusiasm is commendable, but proper documentation must precede action.",
          relationshipChange: 0
        }
      ]
    },
    {
      id: 'journal-presentation',
      type: 'critical-moment',
      text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
      isConclusion: true,
      isCriticalPath: true
    }
  ];
  
  return { ...flow, stages };
}

/**
 * Creates a Jesse equipment tutorial flow
 */
export function createJesseEquipmentFlow(nodeId: string): DialogueFlow & { stages?: DialogueStage[] } {
  // Create the flow
  const flow = createDialogueFlow(
    'jesse-equipment',
    {
      // Example intro state
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Hey there! Let me show you around the equipment lab. We've got some strict safety protocols, but once you get the hang of it, you'll be all set.",
        options: [
          { 
            id: "safety-first",
            text: "I'd like to learn the safety protocols first.", 
            nextStateId: 'safety',
            responseText: "Smart choice! That's always the right place to start.",
            relationshipChange: 1
          },
          { 
            id: "hands-on",
            text: "Can we jump right into the hands-on work?", 
            nextStateId: 'safety',
            responseText: "Enthusiasm is good, but we always start with safety here. Let me walk you through that first.",
            relationshipChange: 0
          }
        ],
        nextStateId: 'safety'
      },
      
      // Add a 'safety' state to receive transitions
      'safety': {
        id: 'safety',
        type: 'question',
        text: "First rule of the lab: always verify the equipment is powered down before making any adjustments. Second rule: calibration certificates are sacred - never operate equipment without valid documentation.",
        options: [
          {
            id: "understood",
            text: "Makes sense. Patient safety comes first.",
            nextStateId: 'equipment-safety',
            responseText: "Exactly! You're catching on quick.",
            relationshipChange: 1
          },
          {
            id: "seems-excessive",
            text: "Isn't that being a bit over-cautious?",
            nextStateId: 'equipment-safety',
            responseText: "Not when a calibration error could result in a treatment error. This is why these protocols exist.",
            relationshipChange: -1
          }
        ]
      },
      
      // Critical safety state
      'equipment-safety': {
        id: 'equipment-safety',
        type: 'critical-moment',
        text: "These safety protocols aren't just bureaucratic red tape - they're what keep patients safe. Every calibration, every check, is ultimately about ensuring patient treatment goes exactly as planned. Remember that and you'll do well here.",
        isCriticalPath: true,
        isConclusion: true
      }
    },
    'intro',
    { characterId: 'jesse', nodeId }
  );
  
  // Legacy stages format for backward compatibility
  const stages: DialogueStage[] = [
    {
      id: 'intro',
      text: "Hey there! Let me show you around the equipment lab. We've got some strict safety protocols, but once you get the hang of it, you'll be all set.",
      options: [
        { 
          id: "safety-first",
          text: "I'd like to learn the safety protocols first.", 
          nextStageId: 'safety',
          responseText: "Smart choice! That's always the right place to start.",
          relationshipChange: 1
        },
        { 
          id: "hands-on",
          text: "Can we jump right into the hands-on work?", 
          nextStageId: 'safety',
          responseText: "Enthusiasm is good, but we always start with safety here. Let me walk you through that first.",
          relationshipChange: 0
        }
      ]
    },
    {
      id: 'safety',
      text: "First rule of the lab: always verify the equipment is powered down before making any adjustments. Second rule: calibration certificates are sacred - never operate equipment without valid documentation.",
      options: [
        {
          id: "understood",
          text: "Makes sense. Patient safety comes first.",
          nextStageId: 'equipment-safety',
          responseText: "Exactly! You're catching on quick.",
          relationshipChange: 1
        },
        {
          id: "seems-excessive",
          text: "Isn't that being a bit over-cautious?",
          nextStageId: 'equipment-safety',
          responseText: "Not when a calibration error could result in a treatment error. This is why these protocols exist.",
          relationshipChange: -1
        }
      ]
    },
    {
      id: 'equipment-safety',
      type: 'critical-moment',
      text: "These safety protocols aren't just bureaucratic red tape - they're what keep patients safe. Every calibration, every check, is ultimately about ensuring patient treatment goes exactly as planned. Remember that and you'll do well here.",
      isConclusion: true,
      isCriticalPath: true
    }
  ];
  
  return { ...flow, stages };
}

// ========== Class-Based Facade ==========

/**
 * DialogueSystem configuration interface
 */
export interface DialogueSystemConfig {
  dialogues: Record<string, {
    startNodeId: string;
    nodes: Record<string, DialogueState>;
  }>;
  globalVariables: Record<string, any>;
}

/**
 * Class implementation that provides an imperative facade over the reactive store
 * This bridges code that expects a class-based interface
 */
export class DialogueStateMachine {
  private _config: DialogueSystemConfig;
  private _activeDialogueId: string | null = null;
  private static _instance: DialogueStateMachine | null = null;

  constructor(config: DialogueSystemConfig = { dialogues: {}, globalVariables: {} }) {
    this._config = config;
  }

  /**
   * Get singleton instance (for compatibility with getInstance pattern)
   */
  public static getInstance(): DialogueStateMachine {
    if (!this._instance) {
      this._instance = new DialogueStateMachine();
    }
    return this._instance;
  }

  /**
   * Access to store's getState method (for compatibility with store pattern)
   */
  public getState(): DialogueStateMachineState {
    return useDialogueStateMachine.getState();
  }

  /**
   * Start a dialogue flow
   */
  start(dialogueId: string): void {
    // Find or create appropriate flow
    const flow = this._findOrCreateFlow(dialogueId);
    if (flow) {
      this._activeDialogueId = dialogueId;
      useDialogueStateMachine.getState().initializeFlow(flow);
    } else {
      console.error(`[DialogueStateMachine] No dialogue found with ID: ${dialogueId}`);
    }
  }

  /**
   * Get the current dialogue node
   */
  getCurrentNode(): DialogueState | null {
    return useDialogueStateMachine.getState().currentState;
  }

  /**
   * Advance the dialogue, optionally with a choice
   */
  advance(choiceIndex?: number): void {
    const store = useDialogueStateMachine.getState();
    
    if (choiceIndex !== undefined) {
      const options = store.getAvailableOptions();
      // Validate choice index is in range
      if (options.length > 0 && choiceIndex >= 0 && choiceIndex < options.length) {
        store.selectOption(options[choiceIndex].id);
      } else {
        console.warn(`[DialogueStateMachine] Invalid choice index: ${choiceIndex}`);
      }
    } else {
      // No choice provided, just advance state
      store.advanceState();
    }
  }

  /**
   * Get the choices for the current dialogue node
   */
  getChoices(): { text: string; nextNodeId: string }[] {
    const options = useDialogueStateMachine.getState().getAvailableOptions();
    return options.map(option => ({
      text: option.text,
      nextNodeId: option.nextStateId || ''
    }));
  }

  /**
   * Check if the current node is an ending node
   */
  isEndingNode(): boolean {
    const currentState = useDialogueStateMachine.getState().currentState;
    return Boolean(currentState?.isConclusion);
  }

  /**
   * Find or create a dialogue flow from configuration or presets
   */
  private _findOrCreateFlow(dialogueId: string): DialogueFlow | null {
    // First, check if this is a known preset dialogue
    if (dialogueId.includes('kapoor')) {
      return createKapoorCalibrationFlow('dialogue-node');
    } else if (dialogueId.includes('jesse')) {
      return createJesseEquipmentFlow('dialogue-node');
    }
    
    // Otherwise, try to construct from config
    const dialogueConfig = this._config.dialogues[dialogueId];
    if (dialogueConfig) {
      // Transform config format to DialogueFlow format
      const states: Record<string, DialogueState> = {};
      
      // Map the nodes from config to states
      Object.entries(dialogueConfig.nodes).forEach(([nodeId, node]) => {
        states[nodeId] = {
          id: nodeId,
          type: node.options?.length ? 'question' : 'intro',
          text: node.text,
          options: node.options?.map(choice => ({
            id: `option-${choice.nextStateId}`,
            text: choice.text,
            nextStateId: choice.nextStateId,
          })),
          isConclusion: node.isEndingNode,
          isCriticalPath: false // Default
        };
      });
      
      return createDialogueFlow(
        dialogueId,
        states,
        dialogueConfig.startNodeId,
        { characterId: 'unknown', nodeId: 'dialogue' }
      );
    }
    
    return null;
  }
}

// Export directly for hybrid architectural pattern
// This allows code that expects a Zustand store to import useDialogueStateMachine
// While code that expects a class can still use the default export

// Export the class instance for default singleton usage
export default DialogueStateMachine.getInstance();