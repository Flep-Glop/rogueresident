// app/core/dialogue/DialogueStateMachine.ts

/**
 * Dialogue State Machine
 * 
 * A resilient implementation focused on predictable state transitions with
 * embedded narrative memory. This design applies finite state machine principles
 * while incorporating lessons learned from Hades and Pyre about maintaining
 * narrative context across game sessions.
 * 
 * The key insight is that dialogue systems thrive when they balance deterministic
 * progression with contextual memory, allowing characters to respond naturally
 * to the player's history without sacrificing narrative reliability.
 */

// Import from our barrel file to prevent import cycles
import { useEventBus, GameEventType, safeDispatch } from '../events';
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
  transactionIds: Record<string, string>; 
  criticalChoices?: Record<string, string>;
  // Allow for extensibility with character-specific state
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
  potentialBlockers?: string[];
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
  
  // CRITICAL ADDITION: Add isActive property for easier state checks
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
  forceProgressionRepair: (targetStateId?: string) => void;
  
  // Critical path event handler (moved from transaction system)
  handleCriticalPathEvent: (stateId: string) => void;
}

/**
 * Helper function to safely dispatch events
 * This prevents errors from propagating and causing React render issues
 */
function safeEventDispatch(eventType: GameEventType, payload: any, source?: string) {
  safeDispatch(eventType, payload, source || 'dialogueStateMachine');
}

// Helper function to dispatch journal acquired events
function journalAcquired(tier: string, character: string, source: string) {
  safeEventDispatch(GameEventType.JOURNAL_ACQUIRED, {
    tier,
    character,
    source
  });
}

// Helper function to dispatch dialogue critical path events
function dialogueCriticalPath(
  dialogueId: string,
  characterId: string,
  nodeId: string,
  criticalStateId: string,
  playerScore: number,
  wasRepaired: boolean
) {
  safeEventDispatch(GameEventType.DIALOGUE_CRITICAL_PATH, {
    dialogueId,
    characterId,
    nodeId,
    criticalStateId,
    playerScore,
    wasRepaired
  });
}

// Helper to determine if a state can auto-advance
function canStateAutoAdvance(state: DialogueState): boolean {
  // States with player options should not auto-advance (unless explicitly allowed)
  if (state.noAutoAdvance) {
    return false;
  }
  
  // States with options shouldn't auto-advance (they need player input)
  const hasOptions = state.options && state.options.length > 0;
  if (hasOptions) {
    return false;
  }
  
  // States with nextStateId that aren't explicitly marked can auto-advance
  return !!state.nextStateId;
}

// Counter for unique transaction IDs
let transactionCounter = 0;

// CRITICAL ADDITION: Install global error handlers for emergency recovery
if (typeof window !== 'undefined') {
  (window as any).__REPAIR_DIALOGUE_FLOW__ = () => {
    try {
      const stateMachine = useDialogueStateMachine.getState();
      if (stateMachine.isActive && stateMachine.context) {
        console.log('[EMERGENCY] Attempting dialogue flow repair');
        stateMachine.forceProgressionRepair();
        return true;
      }
      return false;
    } catch (e) {
      console.error('[EMERGENCY] Repair dialogue flow failed:', e);
      return false;
    }
  };
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
    
    // CRITICAL ADDITION: Add computed properties for easier state checks
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
              
              // Create a new merged context with careful handling of nested objects
              state.context = {
                ...state.context,
                ...action.update,
                // Carefully merge nested objects
                transactionIds: {
                  ...state.context.transactionIds,
                  ...(action.update.transactionIds || {})
                },
                criticalPathProgress: {
                  ...state.context.criticalPathProgress,
                  ...(action.update.criticalPathProgress || {})
                },
                criticalChoices: {
                  ...(state.context.criticalChoices || {}),
                  ...(action.update.criticalChoices || {})
                }
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
          transactionIds: { ...(flow.context.transactionIds || {}) }
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
          
          // CRITICAL ADDITION: Update computed properties 
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
        safeEventDispatch(GameEventType.DIALOGUE_STARTED, {
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
          
          // Get all available options for debugging
          const availableOptions = currentState.options?.map(o => o.id).join(', ');
          console.log(`Available options: ${availableOptions || 'none'}`);
          
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
        
        // Get updated context after the state changes
        const updatedContext = get().context;
        if (!updatedContext) return;
        
        // Log the option selection (safely)
        try {
          safeEventDispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
            optionId,
            flowId: activeFlow.id,
            stageId: currentState.id,
            character: updatedContext.characterId,
            insightGain: option.insightGain || 0,
            relationshipChange: option.relationshipChange || 0,
            knowledgeGain: option.knowledgeGain,
            isCriticalPath: option.isCriticalPath || false
          });
        } catch (err) {
          console.warn('[DialogueMachine] Error dispatching option selection event');
        }
        
        // Dispatch knowledge gain event if applicable
        if (option.knowledgeGain) {
          try {
            safeEventDispatch(GameEventType.KNOWLEDGE_GAINED, {
              conceptId: option.knowledgeGain.conceptId,
              amount: option.knowledgeGain.amount,
              domainId: option.knowledgeGain.domainId,
              character: updatedContext.characterId
            });
          } catch (err) {
            console.warn('[DialogueMachine] Error dispatching knowledge gain event');
          }
        }
      } catch (error) {
        console.error(`[DialogueMachine] Error selecting option:`, error);
      }
    },
    
    advanceState: () => {
      try {
        const { currentState, context, activeFlow, selectedOption, showResponse, showBackstory } = get();
        
        if (!activeFlow || !currentState || !context) {
          console.warn(`[DialogueMachine] Cannot advance state without active flow`);
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
        } else if (currentState.nextStateId && !currentState.noAutoAdvance) {
          // Only use the currentState's nextStateId if not marked as noAutoAdvance
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
            console.warn(`[DialogueMachine] Critical path incomplete before conclusion:`, progressionStatus);
            
            // Try to fix by finding important states we missed
            get().forceProgressionRepair();
          } else {
            // All good, complete the flow
            get().completeFlow();
          }
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
          
          // CRITICAL ADDITION: Update computed properties
          state.currentNodeId = stateId;
          
          return state;
        });
        
        // Handle critical path events outside the state update
        if (targetState.isCriticalPath) {
          // Use setTimeout to ensure state updates are processed first
          setTimeout(() => {
            if (get().activeFlow) {  // Make sure the flow still exists
              get().handleCriticalPathEvent(stateId);
            }
          }, 0);
        }
        
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
        
        // Special case for conclusion states - check score and redirect if appropriate
        if (targetState.isConclusion && context.playerScore !== undefined) {
          // Performance-based conclusion selection
          if (context.playerScore >= 3 && activeFlow.states['conclusion-excellence']) {
            setTimeout(() => {
              if (get().activeFlow) {  // Check flow still exists
                get().jumpToState('conclusion-excellence');
              }
            }, 0);
          } else if (context.playerScore < 0 && activeFlow.states['conclusion-needs-improvement']) {
            setTimeout(() => {
              if (get().activeFlow) {  // Check flow still exists
                get().jumpToState('conclusion-needs-improvement');
              }
            }, 0);
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
        
        // Complete any active transactions 
        try {
          if (context.transactionIds) {
            // Store transaction IDs in a separate array since we're modifying the context
            const transactionPairs = Object.entries(context.transactionIds);
            
            for (const [type, id] of transactionPairs) {
              if (id && useNarrativeTransaction) {
                const narrativeTransaction = useNarrativeTransaction.getState();
                if (narrativeTransaction && typeof narrativeTransaction.completeTransaction === 'function') {
                  narrativeTransaction.completeTransaction(id);
                }
              }
            }
          }
        } catch (error) {
          console.error(`[DialogueMachine] Error completing transactions:`, error);
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
        try {
          safeEventDispatch(GameEventType.DIALOGUE_COMPLETED, {
            flowId: activeFlow.id,
            character: context.characterId,
            completed: true,
            result: {
              playerScore: context.playerScore,
              visitedStates: context.visitedStateIds,
              selectedOptions: context.selectedOptionIds
            }
          });
        } catch (error) {
          console.error(`[DialogueMachine] Error dispatching dialogue completed event:`, error);
        }
        
        // Reset state AFTER dispatching events (important for sequence)
        set(state => {
          state.activeFlow = null;
          state.currentState = null;
          state.context = null;
          state.selectedOption = null;
          state.showResponse = false;
          state.showBackstory = false;
          
          // CRITICAL ADDITION: Update computed properties
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
        
        // Determine potential blockers that would prevent completion
        const potentialBlockers: string[] = [];
        
        // 1. Check for mandatory states that haven't been visited
        const mandatoryStates = Object.entries(activeFlow.states)
          .filter(([_, state]) => state.isMandatory)
          .map(([id]) => id);
        
        const missedMandatory = mandatoryStates.filter(id => 
          !context.visitedStateIds.includes(id)
        );
        
        if (missedMandatory.length > 0) {
          potentialBlockers.push(`Mandatory states not visited: ${missedMandatory.join(', ')}`);
        }
        
        // 2. Check for essential critical path options
        const criticalPathOptions = Object.keys(context.criticalPathProgress || {})
          .filter(key => key.startsWith('option-'));
        
        if (criticalPathOptions.length === 0 && criticalStateIds.length > 0) {
          potentialBlockers.push('No critical path options selected');
        }
        
        return {
          isComplete: context.visitedStateIds.length > 0,
          criticalPathsCompleted: missingCriticalStates.length === 0,
          missingCheckpoints,
          loopDetected,
          lastVisitedStateId: context.visitedStateIds[context.visitedStateIds.length - 1],
          potentialBlockers: potentialBlockers.length > 0 ? potentialBlockers : undefined
        };
      } catch (error) {
        console.error(`[DialogueMachine] Error getting progression status:`, error);
        return {
          isComplete: false,
          criticalPathsCompleted: false,
          missingCheckpoints: [],
          loopDetected: false,
          potentialBlockers: ['Error evaluating progression status']
        };
      }
    },
    
    forceProgressionRepair: (targetStateId?: string) => {
      try {
        const { activeFlow, context } = get();
        
        if (!activeFlow || !context) {
          console.warn(`[DialogueMachine] Cannot repair progression without active flow`);
          return;
        }
        
        console.warn(`[DialogueMachine] Forcing progression repair for ${context.characterId} dialogue`);
        
        // If target state is provided, jump directly to it
        if (targetStateId && activeFlow.states[targetStateId]) {
          console.log(`[DialogueMachine] Jumping directly to specified state: ${targetStateId}`);
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
            console.log(`[DialogueMachine] Forcing jump to journal presentation state`);
            get().jumpToState('journal-presentation');
            return;
          }
        }
        
        // Special case for Jesse's equipment safety
        if (context.characterId === 'jesse') {
          const safetyState = criticalStates.find(id => id === 'equipment-safety');
          
          if (safetyState && !context.visitedStateIds.includes('equipment-safety')) {
            console.log(`[DialogueMachine] Forcing jump to equipment safety state`);
            get().jumpToState('equipment-safety');
            return;
          }
        }
        
        // If there's any critical state we haven't visited, go there
        for (const stateId of criticalStates) {
          if (!context.visitedStateIds.includes(stateId)) {
            console.log(`[DialogueMachine] Forcing jump to critical state: ${stateId}`);
            get().jumpToState(stateId);
            return;
          }
        }
        
        // If all else fails, try to go to a conclusion state
        const conclusionStates = Object.entries(activeFlow.states)
          .filter(([_, state]) => state.isConclusion)
          .map(([id]) => id);
        
        if (conclusionStates.length > 0) {
          console.log(`[DialogueMachine] Forcing jump to conclusion state: ${conclusionStates[0]}`);
          get().jumpToState(conclusionStates[0]);
        }
      } catch (error) {
        console.error(`[DialogueMachine] Error repairing progression:`, error);
        // CRITICAL ADDITION: Forced flow completion after repair failure
        try {
          console.warn(`[DialogueMachine] Failed to repair, forcing clean completion`);
          if (get().activeFlow) {
            get().completeFlow();
          }
        } catch (finalError) {
          console.error(`[DialogueMachine] Critical error in forced completion:`, finalError);
        }
      }
    },
    
    // Handle critical path progression events (like journal acquisition)
    handleCriticalPathEvent: (stateId: string) => {
      try {
        const { context, activeFlow } = get();
        
        if (!context || !activeFlow) return;
        
        // Specialized handling for journal presentation
        if (stateId === 'journal-presentation' && context.characterId === 'kapoor') {
          console.log('[CRITICAL PATH] Journal presentation state reached');
          
          // Determine journal tier based on performance
          const journalTier = context.playerScore >= 3 ? 'annotated' : 
                            context.playerScore >= 0 ? 'technical' : 'base';
          
          // Emit critical path event to analytics system
          try {
            dialogueCriticalPath(
              activeFlow.id,
              context.characterId,
              context.nodeId,
              stateId,
              context.playerScore,
              false
            );
          } catch (error) {
            console.error('[DialogueMachine] Error emitting critical path event:', error);
          }
          
          // Only create a transaction if one doesn't exist
          if (!context.transactionIds?.journal_acquisition) {
            try {
              const transaction = useNarrativeTransaction.getState();
              
              // Check if the transaction system is available
              if (transaction && typeof transaction.startTransaction === 'function') {
                // Generate a fallback transaction ID if the system fails
                const fallbackId = `journal_${context.characterId}_${Date.now()}_${++transactionCounter}`;
                
                // Try to create a proper transaction
                let transactionId;
                try {
                  transactionId = transaction.startTransaction(
                    'journal_acquisition',
                    { journalTier, source: 'dialogue_state_machine' },
                    context.characterId,
                    context.nodeId
                  );
                } catch (err) {
                  console.warn('[DialogueMachine] Using fallback transaction ID due to error:', err);
                  transactionId = fallbackId;
                }
                
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
                setTimeout(() => {
                  try {
                    journalAcquired(
                      journalTier,
                      context.characterId,
                      'dialogue_state_machine'
                    );
                  } catch (err) {
                    console.warn('[DialogueMachine] Error in journal acquisition event:', err);
                    
                    // CRITICAL ADDITION: Emergency direct journal acquisition on event failure
                    try {
                      console.warn('[EMERGENCY] Attempting direct journal code path');
                      
                      // Using dynamic import to avoid circular dependencies
                      import('../../store/journalStore').then(journalStoreModule => {
                        const journalStore = journalStoreModule.useJournalStore.getState();
                        
                        // Only initialize if journal doesn't exist yet
                        if (!journalStore.hasJournal) {
                          console.log('[EMERGENCY] Forcing journal initialization');
                          journalStore.initializeJournal(journalTier);
                        }
                      }).catch(importError => {
                        console.error('[EMERGENCY] Failed to import journal store:', importError);
                      });
                    } catch (emergencyError) {
                      console.error('[EMERGENCY] Critical failure in journal fallback:', emergencyError);
                    }
                  }
                }, 0);
              }
            } catch (error) {
              console.error(`[DialogueMachine] Error starting journal transaction:`, error);
              
              // Emit journal acquisition anyway for reliability
              try {
                journalAcquired(
                  journalTier,
                  context.characterId,
                  'dialogue_state_machine_fallback'
                );
              } catch (innerError) {
                console.error('[DialogueMachine] Critical error in journal acquisition fallback:', innerError);
                
                // CRITICAL ADDITION: Last resort journal acquisition
                try {
                  console.warn('[EMERGENCY] Attempting last resort journal acquisition');
                  import('../../store/journalStore').then(journalStoreModule => {
                    const journalStore = journalStoreModule.useJournalStore.getState();
                    if (!journalStore.hasJournal) {
                      journalStore.initializeJournal(journalTier);
                    }
                  }).catch(e => console.error('[EMERGENCY] Final journal attempt failed'));
                } catch (finalError) {
                  // We've done everything we can at this point
                }
              }
            }
          }
        }
        
        // Specialized handling for equipment safety presentation
        if (stateId === 'equipment-safety' && context.characterId === 'jesse') {
          console.log('[CRITICAL PATH] Equipment safety state reached');
          
          // Emit critical path event to analytics system
          dialogueCriticalPath(
            activeFlow.id,
            context.characterId,
            context.nodeId,
            stateId,
            context.playerScore,
            false
          );
          
          // Add specialized equipment safety logic here
        }
        
        // Specialized handling for theory revelation
        if (stateId === 'quantum-understanding' && context.characterId === 'quinn') {
          console.log('[CRITICAL PATH] Quantum understanding state reached');
          
          // Emit critical path event to analytics system
          dialogueCriticalPath(
            activeFlow.id,
            context.characterId,
            context.nodeId,
            stateId,
            context.playerScore,
            false
          );
          
          // Add specialized theory revelation logic here
        }
      } catch (error) {
        console.error(`[DialogueMachine] Error handling critical path event:`, error);
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
        // No auto-advance for states with options (handled by processing)
        nextStateId: 'basics' // Will be ignored because noAutoAdvance will be true
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
        // No auto-advance for states with options (handled by processing)
        nextStateId: 'safety' // Will be ignored because noAutoAdvance will be true
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

// Proper cleanup function for the setup - will address missing state machine cleanup issue
export function setupDialogueStateMachine() {
  console.log('Setting up dialogue state machine...');
  
  // Return a cleanup function
  return () => {
    console.log('Cleaning up dialogue state machine...');
    // Additional cleanup logic if needed
  };
}

export default {
  useDialogueStateMachine,
  createDialogueFlow,
  createKapoorCalibrationFlow,
  createJesseEquipmentFlow,
  determineJournalTier,
  setupDialogueStateMachine
};