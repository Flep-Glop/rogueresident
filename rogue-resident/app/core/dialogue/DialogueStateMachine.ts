// app/core/dialogue/DialogueStateMachine.ts

/**
 * Dialogue State Machine - OPTION 1 IMPLEMENTATION
 * 
 * A simplified version focused on core dialogue flow without complex dependencies.
 * This implementation maintains the basic structure but removes:
 * - Complex event system integration
 * - Transaction system
 * - Emergency repair mechanisms
 * - Complex state tracking
 */

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
  noAutoAdvance?: boolean; // Flag to prevent auto-advancement for player choice moments
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
  // Simplified: Removed transactionIds and other complex state
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

// Progress status for telemetry and validation
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
  | { type: 'SET_BACKSTORY_VISIBILITY'; visible: boolean; text?: string }
  | { type: 'UPDATE_CONTEXT'; update: Partial<DialogueContext> };

// State machine store interface
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
  
  // Basic activity tracking
  isActive: boolean;
  currentNodeId: string | null;
  
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
}

// OPTION 1: Simplified event logging
function logEvent(eventType: string, data: any) {
  console.log(`[DialogueEvent] ${eventType}:`, data);
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
    
    // Basic tracking
    isActive: false,
    currentNodeId: null,
    
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
          case 'UPDATE_CONTEXT':
            set(state => {
              if (!state.context) return state;
              state.context = {
                ...state.context,
                ...action.update,
              };
              return state;
            });
            break;
        }
      } catch (error) {
        console.error(`[DialogueMachine] Error in dispatch for action ${action.type}:`, error);
      }
    },
    
    initializeFlow: (flow: DialogueFlow) => {
      try {
        // Find initial state
        const initialState = flow.states[flow.initialStateId];
        
        if (!initialState) {
          console.error(`Initial state ${flow.initialStateId} not found in flow ${flow.id}`);
          return;
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
        
        // Initialize the flow with processed states
        set(state => {
          state.activeFlow = {
            ...flow,
            context: safeContext,
            states: processedStates
          };
          state.currentState = processedStates[flow.initialStateId];
          state.context = safeContext;
          state.selectedOption = null;
          state.showResponse = false;
          state.showBackstory = false;
          
          state.isActive = true;
          state.currentNodeId = flow.initialStateId;
          
          return state;
        });
        
        // Call onEnter for initial state
        if (initialState.onEnter && flow.context) {
          try {
            initialState.onEnter(flow.context);
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
      } catch (error) {
        console.error(`[DialogueMachine] Error initializing flow:`, error);
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
          set(state => {
            state.showResponse = false;
            state.showBackstory = false;
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
        
        // Priority: selected option > current state
        if (selectedOption?.nextStateId) {
          nextStateId = selectedOption.nextStateId;
        } else if (currentState.nextStateId && !currentState.noAutoAdvance) {
          nextStateId = currentState.nextStateId;
        }
        
        // If we have a next state, jump to it
        if (nextStateId) {
          get().jumpToState(nextStateId);
        } 
        // Otherwise, if at conclusion, complete the flow
        else if (currentState.isConclusion) {
          get().completeFlow();
        } else {
          console.warn(`[DialogueMachine] No next state defined for ${currentState.id}`);
        }
      } catch (error) {
        console.error(`[DialogueMachine] Error advancing state:`, error);
      }
    },
    
    jumpToState: (stateId: string) => {
      try {
        const { activeFlow, currentState, context } = get();
        
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
          
          // Update tracking
          state.currentNodeId = stateId;
          
          return state;
        });
        
        // Call onEnter for new state
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
        
        // Reset state
        set(state => {
          state.activeFlow = null;
          state.currentState = null;
          state.context = null;
          state.selectedOption = null;
          state.showResponse = false;
          state.showBackstory = false;
          
          state.isActive = false;
          state.currentNodeId = null;
          
          return state;
        });
      } catch (error) {
        console.error(`[DialogueMachine] Error completing flow:`, error);
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
          loopDetected: false, // Simplified
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
export function createKapoorCalibrationFlow(nodeId: string) {
  return createDialogueFlow(
    'kapoor-calibration',
    {
      // Core states - example implementation
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
}

/**
 * Creates a Jesse equipment tutorial flow with the proper dialogue structure
 */
export function createJesseEquipmentFlow(nodeId: string) {
  return createDialogueFlow(
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
}

export default {
  useDialogueStateMachine,
  createDialogueFlow,
  createKapoorCalibrationFlow,
  createJesseEquipmentFlow,
  determineJournalTier
};