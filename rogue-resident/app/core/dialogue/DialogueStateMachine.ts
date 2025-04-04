// app/core/dialogue/DialogueStateMachine.ts
/**
 * Dialogue State Machine
 * 
 * A robust state machine implementation for critical conversation flows.
 * This pattern ensures reliable progression through key narrative moments
 * by formalizing state transitions and protecting against edge cases.
 * 
 * This approach was inspired by the dialogue systems used in narrative roguelikes
 * like Hades and Pyre, where progression reliability is critical.
 */

import { GameEventType, gameEvents } from '../events/GameEvents';
import { create } from 'zustand';

// Define dialogue flow states
export type DialogueStateType = 
  | 'idle'              // No active dialogue
  | 'intro'             // Introduction phase
  | 'question'          // Player is being asked a question
  | 'response'          // Character is responding to player choice
  | 'backstory'         // Character is sharing deeper context
  | 'conclusion'        // Wrapping up the interaction
  | 'critical-moment'   // Special progression-critical dialogue (like journal acquisition)
  | 'transition'        // Between states
  | 'complete';         // Dialogue is complete

// Define dialogue state transition type
export interface StateTransition {
  from: DialogueStateType;
  to: DialogueStateType;
  condition?: (context: DialogueContext) => boolean;
  action?: (context: DialogueContext) => void;
  isCriticalPath?: boolean;
}

// Dialogue context provides shared state across the flow
export interface DialogueContext {
  characterId: string;
  nodeId: string;
  playerScore: number;
  selectedOptionIds: string[];
  knowledgeGained: Record<string, number>;
  currentStateId?: string;
  [key: string]: any; // Allow for custom context properties
}

// Dialogue state representation
export interface DialogueState {
  type: DialogueStateType;
  id: string;
  text?: string;
  options?: DialogueOption[];
  nextStateId?: string;
  isConclusion?: boolean;
  isCriticalPath?: boolean;
  onEnter?: (context: DialogueContext) => void;
  onExit?: (context: DialogueContext) => void;
}

// Dialogue option type
export interface DialogueOption {
  id: string;
  text: string;
  responseText?: string;
  nextStateId?: string;
  effect?: (context: DialogueContext) => void;
  condition?: (context: DialogueContext) => boolean;
  insightGain?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  relationshipChange?: number;
  triggersBackstory?: boolean;
}

// Dialogue flow definition
export interface DialogueFlow {
  id: string;
  initialStateId: string;
  states: Record<string, DialogueState>;
  context: DialogueContext;
  transitions: StateTransition[];
  onComplete?: (context: DialogueContext) => void;
}

// State machine store
interface DialogueStateMachineState {
  // Current active flow
  activeFlow: DialogueFlow | null;
  
  // Current state
  currentState: DialogueState | null;
  
  // Current context
  context: DialogueContext | null;
  
  // Selected option
  selectedOption: DialogueOption | null;
  
  // Lifecycle flags
  isTransitioning: boolean;
  showResponse: boolean;
  showBackstory: boolean;
  backstoryText: string;
  
  // Flow control
  initializeFlow: (flow: DialogueFlow) => void;
  selectOption: (optionId: string) => void;
  advanceState: () => void;
  jumpToState: (stateId: string) => void;
  completeFlow: () => void;
  
  // State selectors
  getAvailableOptions: () => DialogueOption[];
  getCurrentText: () => string;
  isInCriticalState: () => boolean;
}

export const useDialogueStateMachine = create<DialogueStateMachineState>((set, get) => ({
  activeFlow: null,
  currentState: null,
  context: null,
  selectedOption: null,
  isTransitioning: false,
  showResponse: false,
  showBackstory: false,
  backstoryText: '',
  
  initializeFlow: (flow: DialogueFlow) => {
    // Find initial state
    const initialState = flow.states[flow.initialStateId];
    
    if (!initialState) {
      console.error(`Initial state ${flow.initialStateId} not found in flow ${flow.id}`);
      return;
    }
    
    // Initialize the flow
    set({
      activeFlow: flow,
      currentState: initialState,
      context: { ...flow.context },
      selectedOption: null,
      showResponse: false,
      showBackstory: false
    });
    
    // Call onEnter for initial state
    if (initialState.onEnter) {
      initialState.onEnter(flow.context);
    }
    
    // Log the start of this dialogue flow
    gameEvents.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: flow.id,
      character: flow.context.characterId,
      initialState: initialState.id
    });
  },
  
  selectOption: (optionId: string) => {
    const { currentState, context, activeFlow } = get();
    
    if (!currentState || !context || !activeFlow) return;
    
    // Find the selected option
    const option = currentState.options?.find(o => o.id === optionId);
    
    if (!option) {
      console.error(`Option ${optionId} not found in state ${currentState.id}`);
      return;
    }
    
    // Apply option effects to context
    const updatedContext = { ...context };
    
    // Update player score if relationshipChange is defined
    if (option.relationshipChange !== undefined) {
      updatedContext.playerScore += option.relationshipChange;
    }
    
    // Add option to selected options history
    updatedContext.selectedOptionIds = [...updatedContext.selectedOptionIds, optionId];
    
    // Apply knowledge gain if any
    if (option.knowledgeGain) {
      const { conceptId, amount } = option.knowledgeGain;
      updatedContext.knowledgeGained[conceptId] = 
        (updatedContext.knowledgeGained[conceptId] || 0) + amount;
      
      // Dispatch knowledge gain event
      gameEvents.dispatch(GameEventType.KNOWLEDGE_GAINED, {
        conceptId: option.knowledgeGain.conceptId,
        amount: option.knowledgeGain.amount,
        domainId: option.knowledgeGain.domainId,
        character: updatedContext.characterId
      });
    }
    
    // Call option effect if any
    if (option.effect) {
      option.effect(updatedContext);
    }
    
    // Log the option selection
    gameEvents.dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId,
      flowId: activeFlow.id,
      stateId: currentState.id,
      character: updatedContext.characterId,
      insightGain: option.insightGain || 0
    });
    
    // Update state
    set({
      context: updatedContext,
      selectedOption: option,
      showResponse: Boolean(option.responseText),
      showBackstory: Boolean(option.triggersBackstory && updatedContext.playerScore >= 2)
    });
    
    // If this triggers backstory, prepare it
    if (option.triggersBackstory && updatedContext.playerScore >= 2) {
      // Find backstory state - it would typically be named with a backstory prefix
      const backstoryId = `backstory-${option.id.split('-')[1] || 'default'}`;
      const backstoryState = Object.values(activeFlow.states)
        .find(s => s.id === backstoryId);
      
      if (backstoryState && backstoryState.text) {
        set({ backstoryText: backstoryState.text });
      }
    }
  },
  
  advanceState: () => {
    const { activeFlow, currentState, context, selectedOption, showResponse, showBackstory } = get();
    
    if (!activeFlow || !currentState || !context) return;
    
    // If we're showing response or backstory, turn it off before advancing
    if (showResponse || showBackstory) {
      set({ 
        showResponse: false, 
        showBackstory: false,
        isTransitioning: true  
      });
      
      // Give UI time to process this change
      setTimeout(() => {
        set({ isTransitioning: false });
        get().advanceState();
      }, 50);
      
      return;
    }
    
    // Determine next state
    let nextStateId: string | undefined;
    
    // First check the selected option's nextStateId
    if (selectedOption && selectedOption.nextStateId) {
      nextStateId = selectedOption.nextStateId;
    } 
    // Then fall back to the current state's nextStateId
    else if (currentState.nextStateId) {
      nextStateId = currentState.nextStateId;
    }
    
    // If we have a next state, transition to it
    if (nextStateId) {
      get().jumpToState(nextStateId);
    } 
    // If this is a conclusion state, complete the flow
    else if (currentState.isConclusion) {
      // If this is a critical path conclusion, ensure the next state is the critical path state
      if (currentState.isCriticalPath) {
        // Find critical path state (e.g., journal acquisition)
        const criticalState = Object.values(activeFlow.states)
          .find(s => s.isCriticalPath && s.id !== currentState.id);
        
        if (criticalState) {
          get().jumpToState(criticalState.id);
          return;
        }
      }
      
      // If we've hit an endpoint, complete the flow
      get().completeFlow();
    }
  },
  
  jumpToState: (stateId: string) => {
    const { activeFlow, currentState, context } = get();
    
    if (!activeFlow || !context) return;
    
    // Find the target state
    const targetState = activeFlow.states[stateId];
    
    if (!targetState) {
      console.error(`Target state ${stateId} not found in flow ${activeFlow.id}`);
      return;
    }
    
    // Call onExit for current state if it exists
    if (currentState && currentState.onExit) {
      currentState.onExit(context);
    }
    
    // Set transition state
    set({ 
      isTransitioning: true,
      selectedOption: null,
      showResponse: false,
      showBackstory: false
    });
    
    // Update context with current state ID
    const updatedContext = { ...context, currentStateId: stateId };
    
    // After slight delay to allow for animations
    setTimeout(() => {
      // Call onEnter for new state
      if (targetState.onEnter) {
        targetState.onEnter(updatedContext);
      }
      
      // Complete transition
      set({
        currentState: targetState,
        context: updatedContext,
        isTransitioning: false
      });
      
      // If this is a conclusion state, check performance to potentially redirect
      if (targetState.isConclusion) {
        const { playerScore } = updatedContext;
        
        // Redirect based on performance
        if (playerScore >= 3) {
          const excellenceState = activeFlow.states['conclusion-excellence'];
          if (excellenceState) {
            get().jumpToState('conclusion-excellence');
            return;
          }
        } else if (playerScore < 0) {
          const needsImprovementState = activeFlow.states['conclusion-needs-improvement'];
          if (needsImprovementState) {
            get().jumpToState('conclusion-needs-improvement');
            return;
          }
        }
      }
      
      // Critical path protection
      // If this state is journal-presentation or similar critical path
      if (targetState.isCriticalPath && targetState.id === 'journal-presentation') {
        // Log journal acquisition readiness
        console.log('[CRITICAL PATH] Journal presentation state reached');
        
        // Dispatch event for journal acquisition preparation
        gameEvents.dispatch(GameEventType.JOURNAL_ACQUIRED, {
          tier: determineJournalTier(updatedContext),
          character: updatedContext.characterId,
          source: 'dialogue_critical_path'
        });
      }
    }, 100);
  },
  
  completeFlow: () => {
    const { activeFlow, context } = get();
    
    if (!activeFlow || !context) return;
    
    // Call the onComplete callback if it exists
    if (activeFlow.onComplete) {
      activeFlow.onComplete(context);
    }
    
    // Dispatch dialogue completed event
    gameEvents.dispatch(GameEventType.DIALOGUE_COMPLETED, {
      flowId: activeFlow.id,
      character: context.characterId,
      result: {
        playerScore: context.playerScore,
        knowledgeGained: context.knowledgeGained,
        selectedOptions: context.selectedOptionIds
      }
    });
    
    // Reset state
    set({
      activeFlow: null,
      currentState: null,
      context: null,
      selectedOption: null,
      showResponse: false,
      showBackstory: false,
      isTransitioning: false
    });
  },
  
  getAvailableOptions: () => {
    const { currentState, context } = get();
    
    if (!currentState || !context || !currentState.options) {
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
    
    if (showResponse && selectedOption && selectedOption.responseText) {
      return selectedOption.responseText;
    }
    
    return currentState.text || '';
  },
  
  isInCriticalState: () => {
    const { currentState } = get();
    return Boolean(currentState?.isCriticalPath);
  }
}));

// Factory function to create dialogue flows
export function createDialogueFlow(
  id: string,
  states: Record<string, DialogueState>,
  initialStateId: string,
  context: Partial<DialogueContext> = {},
  onComplete?: (context: DialogueContext) => void
): DialogueFlow {
  // Initialize the context with defaults
  const defaultContext: DialogueContext = {
    characterId: '',
    nodeId: '',
    playerScore: 0,
    selectedOptionIds: [],
    knowledgeGained: {},
    ...context
  };
  
  // Generate transitions from state definitions
  const transitions: StateTransition[] = [];
  
  // Extract transitions from states
  Object.entries(states).forEach(([stateId, state]) => {
    if (state.nextStateId) {
      transitions.push({
        from: state.type || 'question',
        to: states[state.nextStateId]?.type || 'question',
        isCriticalPath: state.isCriticalPath,
      });
    }
    
    // Add transitions from options
    if (state.options) {
      state.options.forEach(option => {
        if (option.nextStateId) {
          transitions.push({
            from: state.type || 'question',
            to: states[option.nextStateId]?.type || 'response',
            condition: option.condition,
          });
        }
      });
    }
  });
  
  return {
    id,
    initialStateId,
    states,
    context: defaultContext,
    transitions,
    onComplete
  };
}

// Helper function to determine journal tier based on performance
function determineJournalTier(context: DialogueContext): 'base' | 'technical' | 'annotated' {
  const { playerScore } = context;
  
  if (playerScore >= 3) {
    return 'annotated';
  } else if (playerScore >= 0) {
    return 'technical';
  } else {
    return 'base';
  }
}

// Example usage for journal acquisition flow
export const createKapoorCalibrationFlow = (nodeId: string) => {
  return createDialogueFlow(
    'kapoor-calibration',
    {
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
      },
      // Additional states would be defined here
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
        isCriticalPath: true,
        onEnter: (context) => {
          // This ensures the journal is acquired regardless of UI state
          gameEvents.journalAcquired(
            determineJournalTier(context),
            context.characterId
          );
        }
      }
    },
    'intro',
    { characterId: 'kapoor', nodeId },
    (context) => {
      // Final completion handler that runs regardless of path taken
      gameEvents.nodeCompleted(nodeId, {
        characterId: 'kapoor',
        score: context.playerScore,
        journalTier: determineJournalTier(context)
      });
    }
  );
};

export default {
  useDialogueStateMachine,
  createDialogueFlow,
  createKapoorCalibrationFlow
};