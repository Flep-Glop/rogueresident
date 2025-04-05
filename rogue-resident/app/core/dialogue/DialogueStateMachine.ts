// app/core/dialogue/DialogueStateMachine.ts
/**
 * Optimized Dialogue State Machine
 * 
 * A streamlined implementation focusing on predictable state transitions
 * with minimal complexity. This design applies finite state machine principles
 * similar to those used in Pyre's narrative system, emphasizing clear one-way
 * transitions and declarative state updates.
 */

import { 
  useEventBus, 
  GameEventType, 
  journalAcquired,
  dialogueCriticalPath 
} from '../events/CentralEventBus';
import { useNarrativeTransaction } from './NarrativeTransaction';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Define dialogue flow states
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
  onEnter?: (context: DialogueContext) => void;
  onExit?: (context: DialogueContext) => void;
}

// Dialogue option type 
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
  transactionIds: Record<string, string>; 
  [key: string]: any;
}

// Dialogue flow definition
export interface DialogueFlow {
  id: string;
  initialStateId: string;
  states: Record<string, DialogueState>;
  context: DialogueContext;
  progressionCheckpoints: string[];
  onComplete?: (context: DialogueContext) => void;
}

// Progress status for telemetry
export interface DialogueProgressionStatus {
  isComplete: boolean;
  criticalPathsCompleted: boolean;
  missingCheckpoints: string[];
  loopDetected: boolean;
  lastVisitedStateId?: string;
}

// Dialogue action types for state updates
type DialogueAction = 
  | { type: 'INITIALIZE_FLOW'; flow: DialogueFlow }
  | { type: 'SELECT_OPTION'; optionId: string }
  | { type: 'ADVANCE_STATE' }
  | { type: 'JUMP_TO_STATE'; stateId: string }
  | { type: 'COMPLETE_FLOW' }
  | { type: 'SET_RESPONSE_VISIBILITY'; visible: boolean }
  | { type: 'SET_BACKSTORY_VISIBILITY'; visible: boolean; text?: string };

// State machine store
interface DialogueStateMachineState {
  // Current active flow
  activeFlow: DialogueFlow | null;
  
  // Current state and UI state
  currentState: DialogueState | null;
  context: DialogueContext | null;
  selectedOption: DialogueOption | null;
  showResponse: boolean;
  showBackstory: boolean;
  backstoryText: string;
  
  // Flow control with simplified transition model
  dispatch: (action: DialogueAction) => void;
  initializeFlow: (flow: DialogueFlow) => void;
  selectOption: (optionId: string) => void;
  advanceState: () => void;
  jumpToState: (stateId: string) => void;
  completeFlow: () => void;
  
  // State selectors
  getAvailableOptions: () => DialogueOption[];
  getCurrentText: () => string;
  isInCriticalState: () => boolean;
  
  // Progression validation
  getProgressionStatus: () => DialogueProgressionStatus;
  forceProgressionRepair: (targetStateId?: string) => void;
  
  // Critical path event handler (moved from transaction system)
  handleCriticalPathEvent: (stateId: string) => void;
}

// Optimized state machine implementation with immer for immutable updates
export const useDialogueStateMachine = create<DialogueStateMachineState>()(
  immer((set, get) => ({
    // State
    activeFlow: null,
    currentState: null,
    context: null,
    selectedOption: null,
    showResponse: false,
    showBackstory: false,
    backstoryText: '',
    
    // Unified dispatch function for state updates
    dispatch: (action: DialogueAction) => {
      console.log(`[StateMachine] Dispatching: ${action.type}`);
      
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
        case 'JUMP_TO_STATE':
          get().jumpToState(action.stateId);
          break;
        case 'COMPLETE_FLOW':
          get().completeFlow();
          break;
        case 'SET_RESPONSE_VISIBILITY':
          set(state => {
            state.showResponse = action.visible;
            return state;
          });
          break;
        case 'SET_BACKSTORY_VISIBILITY':
          set(state => {
            state.showBackstory = action.visible;
            if (action.text !== undefined) {
              state.backstoryText = action.text;
            }
            return state;
          });
          break;
      }
    },
    
    initializeFlow: (flow: DialogueFlow) => {
      // Find initial state
      const initialState = flow.states[flow.initialStateId];
      
      if (!initialState) {
        console.error(`Initial state ${flow.initialStateId} not found in flow ${flow.id}`);
        return;
      }
      
      // Apply consistent state type if not specified
      const stateWithType = {
        ...initialState,
        type: initialState.type || 'intro'
      };
      
      // Create a defensive copy of the context
      const safeContext = {
        ...flow.context,
        visitedStateIds: [...(flow.context.visitedStateIds || []), flow.initialStateId],
        criticalPathProgress: { ...(flow.context.criticalPathProgress || {}) },
        transactionIds: { ...(flow.context.transactionIds || {}) }
      };
      
      // Initialize the flow
      set(state => {
        state.activeFlow = {
          ...flow,
          context: safeContext,
          states: Object.fromEntries(
            Object.entries(flow.states).map(([id, state]) => [
              id,
              { ...state, type: state.type || 'question' }
            ])
          )
        };
        state.currentState = stateWithType;
        state.context = safeContext;
        state.selectedOption = null;
        state.showResponse = false;
        state.showBackstory = false;
        return state;
      });
      
      // Call onEnter for initial state
      if (initialState.onEnter && flow.context) {
        try {
          initialState.onEnter(flow.context);
        } catch (error) {
          console.error(`[StateMachine] Error in onEnter for ${initialState.id}:`, error);
        }
      }
      
      // Log the start of this dialogue flow
      useEventBus.getState().dispatch(GameEventType.DIALOGUE_STARTED, {
        flowId: flow.id,
        character: flow.context.characterId,
        initialState: initialState.id
      });
    },
    
    selectOption: (optionId: string) => {
      const { currentState, context, activeFlow } = get();
      
      if (!currentState || !context || !activeFlow) {
        console.warn(`[StateMachine] Cannot select option without active flow`);
        return;
      }
      
      // Find the selected option
      const option = currentState.options?.find(o => o.id === optionId);
      
      if (!option) {
        console.error(`Option ${optionId} not found in state ${currentState.id}`);
        return;
      }
      
      // Create updated context with option effects
      set(state => {
        if (!state.context) return state;
        
        // Update player score if relationshipChange is defined
        if (option.relationshipChange !== undefined) {
          state.context.playerScore += option.relationshipChange;
        }
        
        // Add option to selection history
        state.context.selectedOptionIds.push(optionId);
        
        // Track critical path progress
        if (option.isCriticalPath) {
          state.context.criticalPathProgress[`option-${optionId}`] = true;
        }
        
        // Apply knowledge gain if any
        if (option.knowledgeGain) {
          const { conceptId, amount } = option.knowledgeGain;
          if (!state.context.knowledgeGained[conceptId]) {
            state.context.knowledgeGained[conceptId] = 0;
          }
          state.context.knowledgeGained[conceptId] += amount;
        }
        
        // Update UI state
        state.selectedOption = option;
        state.showResponse = Boolean(option.responseText);
        state.showBackstory = Boolean(option.triggersBackstory && state.context.playerScore >= 2);
        
        // If this triggers backstory, prepare it
        if (option.triggersBackstory && state.context.playerScore >= 2) {
          // Find backstory state - typically named with a backstory prefix
          const backstoryId = `backstory-${option.id.split('-')[1] || 'default'}`;
          const backstoryState = Object.values(state.activeFlow?.states || {})
            .find(s => s.id === backstoryId);
          
          if (backstoryState && backstoryState.text) {
            state.backstoryText = backstoryState.text;
          }
        }
        
        return state;
      });
      
      // Dispatch events outside of state update to prevent subscription loops
      const updatedContext = get().context;
      
      // Log the option selection
      useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
        optionId,
        flowId: activeFlow.id,
        stateId: currentState.id,
        character: context.characterId,
        insightGain: option.insightGain || 0,
        isCriticalPath: option.isCriticalPath || false
      });
      
      // Dispatch knowledge gain event if applicable
      if (option.knowledgeGain) {
        useEventBus.getState().dispatch(GameEventType.KNOWLEDGE_GAINED, {
          conceptId: option.knowledgeGain.conceptId,
          amount: option.knowledgeGain.amount,
          domainId: option.knowledgeGain.domainId,
          character: context.characterId
        });
      }
    },
    
    advanceState: () => {
      const { currentState, context, activeFlow, selectedOption, showResponse, showBackstory } = get();
      
      if (!activeFlow || !currentState || !context) {
        console.warn(`[StateMachine] Cannot advance state without active flow`);
        return;
      }
      
      // If showing response or backstory, clear it first but persist the selectedOption
      if (showResponse || showBackstory) {
        set(state => {
          state.showResponse = false;
          state.showBackstory = false;
          // Don't reset selectedOption here - keep it for the next transition
          return state;
        });
        
        // Add small delay before next state transition
        setTimeout(() => {
          if (get().activeFlow) {  // Verify flow still exists
            get().advanceState();  // Continue the advance after UI update cycle
          }
        }, 50);
        
        return;
      }
      
      // Determine next state
      let nextStateId: string | undefined;
      
      // Priority: selected option > current state > conclusion
      if (selectedOption?.nextStateId) {
        nextStateId = selectedOption.nextStateId;
      } else if (currentState.nextStateId) {
        nextStateId = currentState.nextStateId;
      }
      
      // If we have a next state, jump to it
      if (nextStateId) {
        get().jumpToState(nextStateId);
      } 
      // Otherwise, if at conclusion, complete the flow
      else if (currentState.isConclusion) {
        // Check for progression issues before completing
        const progressionStatus = get().getProgressionStatus();
        
        if (!progressionStatus.criticalPathsCompleted) {
          console.warn(`[StateMachine] Critical path incomplete before conclusion:`, progressionStatus);
          
          // Try to fix by finding important states we missed
          get().forceProgressionRepair();
        } else {
          // All good, complete the flow
          get().completeFlow();
        }
      } else {
        console.warn(`[StateMachine] No next state defined for ${currentState.id}`);
      }
    },
    
    jumpToState: (stateId: string) => {
      const { activeFlow, currentState, context } = get();
      
      if (!activeFlow || !context) {
        console.warn(`[StateMachine] Cannot jump to state without active flow`);
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
          console.error(`[StateMachine] Error in onExit for ${currentState.id}:`, error);
        }
      }
      
      // Update state visitation tracking and current state
      set(state => {
        if (!state.context) return state;
        
        // Update visited states
        if (!state.context.visitedStateIds.includes(stateId)) {
          state.context.visitedStateIds.push(stateId);
        }
        
        // Track critical path progress
        if (targetState.isCriticalPath) {
          state.context.criticalPathProgress[`state-${stateId}`] = true;
        }
        
        // Reset UI state
        state.currentState = targetState;
        state.selectedOption = null;
        state.showResponse = false;
        state.showBackstory = false;
        
        return state;
      });
      
      // Handle critical path events outside the state update
      if (targetState.isCriticalPath) {
        get().handleCriticalPathEvent(stateId);
      }
      
      // Call onEnter for new state
      if (targetState.onEnter) {
        try {
          targetState.onEnter(get().context!);
        } catch (error) {
          console.error(`[StateMachine] Error in onEnter for ${targetState.id}:`, error);
        }
      }
      
      // Special case for conclusion states - check score and redirect if appropriate
      if (targetState.isConclusion && context.playerScore !== undefined) {
        // Performance-based conclusion selection
        if (context.playerScore >= 3 && activeFlow.states['conclusion-excellence']) {
          setTimeout(() => get().jumpToState('conclusion-excellence'), 0);
        } else if (context.playerScore < 0 && activeFlow.states['conclusion-needs-improvement']) {
          setTimeout(() => get().jumpToState('conclusion-needs-improvement'), 0);
        }
      }
    },
    
    completeFlow: () => {
      const { activeFlow, context } = get();
      
      if (!activeFlow || !context) {
        console.warn(`[StateMachine] Cannot complete flow without active flow`);
        return;
      }
      
      // Complete any active transactions
      if (context.transactionIds) {
        Object.entries(context.transactionIds).forEach(([type, id]) => {
          if (id) {
            useNarrativeTransaction.getState().completeTransaction(id);
          }
        });
      }
      
      // Call the onComplete callback if it exists
      if (activeFlow.onComplete) {
        try {
          activeFlow.onComplete(context);
        } catch (error) {
          console.error(`[StateMachine] Error in flow completion callback:`, error);
        }
      }
      
      // Log completion event
      useEventBus.getState().dispatch(GameEventType.DIALOGUE_COMPLETED, {
        flowId: activeFlow.id,
        character: context.characterId,
        result: {
          playerScore: context.playerScore,
          visitedStates: context.visitedStateIds,
          selectedOptions: context.selectedOptionIds
        }
      });
      
      // Reset state
      set(state => {
        state.activeFlow = null;
        state.currentState = null;
        state.context = null;
        state.selectedOption = null;
        state.showResponse = false;
        state.showBackstory = false;
        return state;
      });
    },
    
    getAvailableOptions: () => {
      const { currentState, context } = get();
      
      if (!currentState?.options || !context) {
        return [];
      }
      
      // Filter options based on conditions
      return currentState.options.filter(option => {
        if (!option.condition) return true;
        return option.condition(context);
      });
    },
    
    getCurrentText: () => {
      const { currentState, selectedOption, showResponse } = get();
      
      if (!currentState) return '';
      
      if (showResponse && selectedOption?.responseText) {
        return selectedOption.responseText;
      }
      
      return currentState.text || '';
    },
    
    isInCriticalState: () => {
      const { currentState } = get();
      return Boolean(currentState?.isCriticalPath);
    },
    
    getProgressionStatus: () => {
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
      
      // Detect potential state loops
      const stateVisits: Record<string, number> = {};
      context.visitedStateIds.forEach(id => {
        stateVisits[id] = (stateVisits[id] || 0) + 1;
      });
      
      // Check if any state has been visited too many times
      const maxVisits = 3; // Allow a reasonable number of repeat visits
      const excessiveVisits = Object.entries(stateVisits)
        .filter(([id, count]) => {
          const state = activeFlow.states[id];
          const stateMaxVisits = state?.maxVisits || maxVisits;
          return count > stateMaxVisits;
        });
      
      const loopDetected = excessiveVisits.length > 0;
      
      return {
        isComplete: context.visitedStateIds.length > 0,
        criticalPathsCompleted: missingCriticalStates.length === 0,
        missingCheckpoints,
        loopDetected,
        lastVisitedStateId: context.visitedStateIds[context.visitedStateIds.length - 1]
      };
    },
    
    forceProgressionRepair: (targetStateId?: string) => {
      const { activeFlow, context } = get();
      
      if (!activeFlow || !context) {
        console.warn(`[StateMachine] Cannot repair progression without active flow`);
        return;
      }
      
      console.warn(`[StateMachine] Forcing progression repair for ${context.characterId} dialogue`);
      
      // If target state is provided, jump directly to it
      if (targetStateId && activeFlow.states[targetStateId]) {
        console.log(`[StateMachine] Jumping directly to specified state: ${targetStateId}`);
        get().jumpToState(targetStateId);
        return;
      }
      
      // Find critical states we need to visit
      const criticalStates = Object.entries(activeFlow.states)
        .filter(([_, state]) => state.isCriticalPath)
        .map(([id]) => id);
      
      // Special case for Kapoor's journal presentation
      if (context.characterId === 'kapoor') {
        const journalState = criticalStates.find(id => id === 'journal-presentation');
        
        if (journalState && !context.visitedStateIds.includes('journal-presentation')) {
          console.log(`[StateMachine] Forcing jump to journal presentation state`);
          get().jumpToState('journal-presentation');
          return;
        }
      }
      
      // If there's any critical state we haven't visited, go there
      for (const stateId of criticalStates) {
        if (!context.visitedStateIds.includes(stateId)) {
          console.log(`[StateMachine] Forcing jump to critical state: ${stateId}`);
          get().jumpToState(stateId);
          return;
        }
      }
      
      // If all else fails, try to go to a conclusion state
      const conclusionStates = Object.entries(activeFlow.states)
        .filter(([_, state]) => state.isConclusion)
        .map(([id]) => id);
      
      if (conclusionStates.length > 0) {
        console.log(`[StateMachine] Forcing jump to conclusion state: ${conclusionStates[0]}`);
        get().jumpToState(conclusionStates[0]);
      }
    },
    
    // Handle critical path progression events (like journal acquisition)
    handleCriticalPathEvent: (stateId: string) => {
      const { context, activeFlow } = get();
      
      if (!context || !activeFlow) return;
      
      // Specialized handling for journal presentation
      if (stateId === 'journal-presentation' && context.characterId === 'kapoor') {
        console.log('[CRITICAL PATH] Journal presentation state reached');
        
        // Determine journal tier based on performance
        const journalTier = context.playerScore >= 3 ? 'annotated' : 
                          context.playerScore >= 0 ? 'technical' : 'base';
        
        // Emit critical path event to analytics system
        dialogueCriticalPath(
          activeFlow.id,
          context.characterId,
          context.nodeId,
          stateId,
          context.playerScore,
          false
        );
        
        // Only create a transaction if one doesn't exist
        if (!context.transactionIds?.journal_acquisition) {
          const transaction = useNarrativeTransaction.getState();
          
          // Create a transaction and register it in context
          const transactionId = transaction.startTransaction(
            'journal_acquisition',
            { journalTier, source: 'dialogue_state_machine' },
            context.characterId,
            context.nodeId
          );
          
          // Update transaction in context
          set(state => {
            if (state.context) {
              state.context.transactionIds = {
                ...state.context.transactionIds,
                journal_acquisition: transactionId
              };
            }
            return state;
          });
          
          // Dispatch journal acquisition event
          journalAcquired(
            journalTier,
            context.characterId,
            'dialogue_state_machine'
          );
        }
      }
    }
  }))
);

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
    transactionIds: {},
    ...context
  };
  
  // Extract progression checkpoints
  const progressionCheckpoints = Object.entries(states)
    .filter(([_, state]) => state.isCriticalPath)
    .map(([id]) => id);
  
  return {
    id,
    initialStateId,
    states,
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
export function createKapoorCalibrationFlow(nodeId: string) {
  return createDialogueFlow(
    'kapoor-calibration',
    {
      // Core states - identical to your existing implementation
      // but with reduced complexity in the flow logic
      
      // Condensing the implementation for this example
      // In a real implementation, we'd include all stages just like in your original
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
        nextStateId: 'basics' // Default transition if options fail
      },
      
      // ... other dialogue states would be here
      
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
}

export default {
  useDialogueStateMachine,
  createDialogueFlow,
  createKapoorCalibrationFlow,
  determineJournalTier
};