// app/core/dialogue/DialogueStateMachine.ts
/**
 * Enhanced Dialogue State Machine
 * 
 * A robust state machine implementation for critical conversation flows.
 * This pattern ensures reliable progression through key narrative moments
 * by formalizing state transitions and protecting against edge cases.
 * 
 * Enhanced with formal state validation, checkpoint tracking, and integration
 * with the central event system to guarantee progression reliability.
 */

import { 
  useEventBus, 
  GameEventType, 
  journalAcquired, 
  nodeCompleted,
  dialogueCriticalPath,
  dialogueProgressionRepair
} from '../events/CentralEventBus';
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
  visitedStateIds: string[]; // Added to track visited states - prevents loops
  loopDetection: Record<string, number>; // Track how many times a state is visited
  criticalPathProgress: Record<string, boolean>; // Track progress through critical paths
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
  isMandatory?: boolean; // Mark states that must be visited for progression
  maxVisits?: number; // Maximum times this state can be visited (default: 1)
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
  isCriticalPath?: boolean; // Mark options that are critical for progression
}

// Dialogue flow definition
export interface DialogueFlow {
  id: string;
  initialStateId: string;
  states: Record<string, DialogueState>;
  context: DialogueContext;
  transitions: StateTransition[];
  progressionCheckpoints: string[]; // Critical states that must be reached
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
  
  // Critical operation flags to prevent recursion
  isJumpingToState: boolean;
  isSelectingOption: boolean;
  isAdvancingState: boolean;
  isCompletingFlow: boolean;
  
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
  
  // Progression validation
  validateDialogueProgression: () => boolean;
  getProgressionStatus: () => DialogueProgressionStatus;
  forceProgressionRepair: () => void;
}

export interface DialogueProgressionStatus {
  isCompleted: boolean;
  criticalPathsCompleted: boolean;
  missingCheckpoints: string[];
  potentialLoops: string[];
  progressionBlocked: boolean;
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
  
  // Critical operation flags to prevent recursion
  isJumpingToState: false,
  isSelectingOption: false,
  isAdvancingState: false,
  isCompletingFlow: false,
  
  initializeFlow: (flow: DialogueFlow) => {
    // Ensure context has our new tracking properties
    const enhancedContext = {
      ...flow.context,
      visitedStateIds: [],
      loopDetection: {},
      criticalPathProgress: {},
    };
    
    // Find initial state
    const initialState = flow.states[flow.initialStateId];
    
    if (!initialState) {
      console.error(`Initial state ${flow.initialStateId} not found in flow ${flow.id}`);
      return;
    }
    
    // Initialize the flow
    set({
      activeFlow: {
        ...flow,
        context: enhancedContext
      },
      currentState: initialState,
      context: enhancedContext,
      selectedOption: null,
      showResponse: false,
      showBackstory: false
    });
    
    // Call onEnter for initial state
    if (initialState.onEnter) {
      initialState.onEnter(enhancedContext);
    }
    
    // Track this state visit
    const updatedContext = get().context;
    if (updatedContext) {
      updatedContext.visitedStateIds = [initialState.id];
      updatedContext.loopDetection = { [initialState.id]: 1 };
    }
    
    // Log the start of this dialogue flow
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: flow.id,
      character: enhancedContext.characterId,
      initialState: initialState.id
    });
  },
  
  selectOption: (optionId: string) => {
    const { currentState, context, activeFlow, isSelectingOption } = get();
    
    // Guard against recursive calls - CRITICAL FOR PREVENTION OF INFINITE LOOPS
    if (isSelectingOption) {
      console.warn(`[DialogueStateMachine] Prevented recursive call to selectOption`);
      return;
    }
    
    if (!currentState || !context || !activeFlow) return;
    
    // Find the selected option
    const option = currentState.options?.find(o => o.id === optionId);
    
    if (!option) {
      console.error(`Option ${optionId} not found in state ${currentState.id}`);
      return;
    }
    
    // Set recursion prevention flag
    set({ isSelectingOption: true });
    
    try {
      // Apply option effects to context
      const updatedContext = { ...context };
      
      // Update player score if relationshipChange is defined
      if (option.relationshipChange !== undefined) {
        updatedContext.playerScore += option.relationshipChange;
      }
      
      // Add option to selected options history
      updatedContext.selectedOptionIds = [...updatedContext.selectedOptionIds, optionId];
      
      // Track critical path options
      if (option.isCriticalPath) {
        updatedContext.criticalPathProgress[`option-${optionId}`] = true;
      }
      
      // Apply knowledge gain if any
      if (option.knowledgeGain) {
        const { conceptId, amount } = option.knowledgeGain;
        updatedContext.knowledgeGained[conceptId] = 
          (updatedContext.knowledgeGained[conceptId] || 0) + amount;
        
        // Dispatch knowledge gain event
        useEventBus.getState().dispatch(GameEventType.KNOWLEDGE_GAINED, {
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
      useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
        optionId,
        flowId: activeFlow.id,
        stateId: currentState.id,
        character: updatedContext.characterId,
        insightGain: option.insightGain || 0,
        isCriticalPath: option.isCriticalPath || false
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
    } finally {
      // Clear recursion prevention flag
      set({ isSelectingOption: false });
    }
  },
  
  advanceState: () => {
    const { 
      activeFlow, 
      currentState, 
      context, 
      selectedOption, 
      showResponse, 
      showBackstory,
      isAdvancingState 
    } = get();
    
    // Guard against recursive calls - CRITICAL FOR PREVENTION OF INFINITE LOOPS
    if (isAdvancingState) {
      console.warn(`[DialogueStateMachine] Prevented recursive call to advanceState`);
      return;
    }
    
    if (!activeFlow || !currentState || !context) return;
    
    // Set recursion prevention flag
    set({ isAdvancingState: true });
    
    try {
      // If we're showing response or backstory, turn it off before advancing
      if (showResponse || showBackstory) {
        set({ 
          showResponse: false, 
          showBackstory: false,
          isTransitioning: true  
        });
        
        // Give UI time to process this change
        setTimeout(() => {
          set({ isTransitioning: false, isAdvancingState: false });
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
        // Use a safe version of jumpToState that won't cause recursion
        setTimeout(() => {
          set({ isAdvancingState: false });
          get().jumpToState(nextStateId!);
        }, 0);
      } 
      // If this is a conclusion state, complete the flow
      else if (currentState.isConclusion) {
        // If this is a critical path conclusion, ensure the next state is the critical path state
        if (currentState.isCriticalPath) {
          // Find critical path state (e.g., journal acquisition)
          const criticalState = Object.values(activeFlow.states)
            .find(s => s.isCriticalPath && s.id !== currentState.id);
          
          if (criticalState) {
            setTimeout(() => {
              set({ isAdvancingState: false });
              get().jumpToState(criticalState.id);
            }, 0);
            return;
          }
        }
        
        // Before completing, validate progression
        const progressionStatus = get().getProgressionStatus();
        
        if (progressionStatus.progressionBlocked) {
          console.warn(`[DialogueStateMachine] Progression blocked before completion: ${JSON.stringify(progressionStatus)}`);
          // Attempt automatic repair
          setTimeout(() => {
            set({ isAdvancingState: false });
            get().forceProgressionRepair();
          }, 0);
          return;
        }
        
        // If we've hit an endpoint, complete the flow
        setTimeout(() => {
          set({ isAdvancingState: false });
          get().completeFlow();
        }, 0);
      } else {
        // Clear flag if we didn't take any asynchronous actions
        set({ isAdvancingState: false });
      }
    } catch (error) {
      // Ensure flag is cleared even if an error occurs
      set({ isAdvancingState: false });
      console.error("[DialogueStateMachine] Error in advanceState:", error);
    }
  },
  
  jumpToState: (stateId: string) => {
    const { 
      activeFlow, 
      currentState, 
      context,
      isJumpingToState 
    } = get();
    
    // Guard against recursive calls - CRITICAL FOR PREVENTION OF INFINITE LOOPS
    if (isJumpingToState) {
      console.warn(`[DialogueStateMachine] Prevented recursive call to jumpToState for ${stateId}`);
      return;
    }
    
    if (!activeFlow || !context) return;
    
    // Set recursion prevention flag
    set({ isJumpingToState: true });
    
    try {
      // Find the target state
      const targetState = activeFlow.states[stateId];
      
      if (!targetState) {
        console.error(`Target state ${stateId} not found in flow ${activeFlow.id}`);
        set({ isJumpingToState: false });
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
      
      // Update context with state tracking
      const updatedContext = { ...context };
      
      // Track state visit
      updatedContext.visitedStateIds = [...updatedContext.visitedStateIds, stateId];
      updatedContext.loopDetection[stateId] = (updatedContext.loopDetection[stateId] || 0) + 1;
      
      // Track critical path progress
      if (targetState.isCriticalPath) {
        updatedContext.criticalPathProgress[`state-${stateId}`] = true;
      }
      
      // Update current state ID
      updatedContext.currentStateId = stateId;
      
      // LOOP DETECTION: Check if we're visiting a state too many times
      const maxVisits = targetState.maxVisits || 1;
      const currentVisits = updatedContext.loopDetection[stateId] || 0;
      
      if (currentVisits > maxVisits) {
        console.warn(`[DialogueStateMachine] Potential loop detected at state ${stateId} (${currentVisits} visits)`);
        
        // Use safe eventing with clean dispatch to prevent recursion
        setTimeout(() => {
          // Emit event for potential loop - useful for analytics
          useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
            componentId: 'dialogueStateMachine',
            action: 'loopDetected',
            metadata: {
              stateId,
              visits: currentVisits,
              maxAllowed: maxVisits,
              flowId: activeFlow.id
            }
          });
          
          // Report dialogue progression repair attempt
          dialogueProgressionRepair(
            activeFlow.id,
            updatedContext.characterId,
            updatedContext.nodeId,
            currentState?.id || 'unknown',
            stateId,
            'loop_detected',
            true
          );
        }, 0);
        
        // If this is a non-critical state and we've exceeded visits, try to find a better state
        if (!targetState.isCriticalPath && !targetState.isMandatory) {
          // Find critical paths we haven't visited yet
          const unvisitedCriticalStates = Object.entries(activeFlow.states)
            .filter(([id, state]) => state.isCriticalPath && !updatedContext.visitedStateIds.includes(id))
            .map(([id]) => id);
          
          if (unvisitedCriticalStates.length > 0) {
            console.log(`[DialogueStateMachine] Redirecting to unvisited critical state: ${unvisitedCriticalStates[0]}`);
            
            // Clear recursion flag
            set({ isJumpingToState: false });
            
            // Delayed jump to avoid loop
            setTimeout(() => {
              get().jumpToState(unvisitedCriticalStates[0]);
            }, 10);
            return;
          }
          
          // If we're in a loop with nowhere else to go, try to force to conclusion
          if (currentVisits > maxVisits + 2) {
            const conclusionStates = Object.entries(activeFlow.states)
              .filter(([id, state]) => state.isConclusion)
              .map(([id]) => id);
            
            if (conclusionStates.length > 0) {
              console.warn(`[DialogueStateMachine] Loop escape: jumping to conclusion state: ${conclusionStates[0]}`);
              
              // Clear recursion flag
              set({ isJumpingToState: false });
              
              // Delayed jump to avoid loop
              setTimeout(() => {
                get().jumpToState(conclusionStates[0]);
              }, 10);
              return;
            }
          }
        }
      }
      
      // After slight delay to allow for animations
      setTimeout(() => {
        try {
          // Call onEnter for new state
          if (targetState.onEnter) {
            targetState.onEnter(updatedContext);
          }
          
          // Complete transition
          set({
            currentState: targetState,
            context: updatedContext,
            isTransitioning: false,
            isJumpingToState: false
          });
          
          // If this is a conclusion state, check performance to potentially redirect
          if (targetState.isConclusion) {
            const { playerScore } = updatedContext;
            
            // Redirect based on performance - use delayed execution to prevent recursion
            if (playerScore >= 3) {
              const excellenceState = activeFlow.states['conclusion-excellence'];
              if (excellenceState && targetState.id !== 'conclusion-excellence') {
                setTimeout(() => {
                  get().jumpToState('conclusion-excellence');
                }, 10);
                return;
              }
            } else if (playerScore < 0) {
              const needsImprovementState = activeFlow.states['conclusion-needs-improvement'];
              if (needsImprovementState && targetState.id !== 'conclusion-needs-improvement') {
                setTimeout(() => {
                  get().jumpToState('conclusion-needs-improvement');
                }, 10);
                return;
              }
            }
          }
          
          // Critical path protection
          // If this state is journal-presentation or similar critical path
          if (targetState.isCriticalPath && targetState.id === 'journal-presentation') {
            // Log journal acquisition readiness
            console.log('[CRITICAL PATH] Journal presentation state reached');
            
            // IMPORTANT: Check if we already processed this critical path
            // to prevent infinite loops - this is crucial!
            if (!updatedContext.criticalPathProgress['journal-acquisition-triggered']) {
              // Mark as triggered to prevent repeat processing
              updatedContext.criticalPathProgress['journal-acquisition-triggered'] = true;
              
              // Determine journal tier based on performance
              const journalTier = determineJournalTier(updatedContext);
              
              // Notify of critical path
              dialogueCriticalPath(
                activeFlow.id,
                updatedContext.characterId,
                updatedContext.nodeId,
                targetState.id,
                updatedContext.playerScore,
                false
              );
              
              // Safe dispatch for journal acquisition with delay to avoid loops
              setTimeout(() => {
                journalAcquired(
                  journalTier,
                  updatedContext.characterId,
                  'dialogue_state_machine'
                );
              }, 50);
            }
          }
        } catch (error) {
          console.error("[DialogueStateMachine] Error completing state transition:", error);
          set({ isJumpingToState: false });
        }
      }, 100);
    } catch (error) {
      // Ensure flag is cleared even if an error occurs
      set({ isJumpingToState: false });
      console.error("[DialogueStateMachine] Error in jumpToState:", error);
    }
  },
  
  completeFlow: () => {
    const { 
      activeFlow, 
      context,
      isCompletingFlow 
    } = get();
    
    // Guard against recursive calls
    if (isCompletingFlow) {
      console.warn(`[DialogueStateMachine] Prevented recursive call to completeFlow`);
      return;
    }
    
    if (!activeFlow || !context) return;
    
    // Set recursion prevention flag
    set({ isCompletingFlow: true });
    
    try {
      // Final progression validation before completion
      const progressionStatus = get().getProgressionStatus();
      
      // Attempt to repair progression if needed
      if (progressionStatus.progressionBlocked) {
        console.warn(`[DialogueStateMachine] Attempting progression repair before completion`);
        
        // Clear flag before repair
        set({ isCompletingFlow: false });
        
        // Perform repair and return early
        setTimeout(() => {
          get().forceProgressionRepair();
        }, 10);
        return;
      }
      
      // Call the onComplete callback if it exists
      if (activeFlow.onComplete) {
        try {
          activeFlow.onComplete(context);
        } catch (error) {
          console.error("[DialogueStateMachine] Error in flow completion callback:", error);
        }
      }
      
      // Ensure node completion is registered - with safe dispatching
      if (context.nodeId) {
        setTimeout(() => {
          nodeCompleted(
            context.nodeId,
            context.characterId,
            {
              relationshipChange: context.playerScore,
              journalTier: determineJournalTier(context),
              isJournalAcquisition: context.characterId === 'kapoor'
            }
          );
        }, 0);
      }
      
      // Dispatch dialogue completed event - with safe dispatching
      setTimeout(() => {
        useEventBus.getState().dispatch(GameEventType.DIALOGUE_COMPLETED, {
          flowId: activeFlow.id,
          character: context.characterId,
          result: {
            playerScore: context.playerScore,
            knowledgeGained: context.knowledgeGained,
            selectedOptions: context.selectedOptionIds,
            progression: progressionStatus
          }
        });
      }, 10);
      
      // Reset state
      set({
        activeFlow: null,
        currentState: null,
        context: null,
        selectedOption: null,
        showResponse: false,
        showBackstory: false,
        isTransitioning: false,
        isCompletingFlow: false
      });
    } catch (error) {
      // Ensure flag is cleared even if an error occurs
      set({ isCompletingFlow: false });
      console.error("[DialogueStateMachine] Error in completeFlow:", error);
    }
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
  },
  
  validateDialogueProgression: () => {
    const { activeFlow, context } = get();
    
    if (!activeFlow || !context) return false;
    
    // Get current progression status
    const status = get().getProgressionStatus();
    
    // Return whether progression is valid
    return !status.progressionBlocked;
  },
  
  getProgressionStatus: () => {
    const { activeFlow, context } = get();
    
    // Default status
    const defaultStatus: DialogueProgressionStatus = {
      isCompleted: false,
      criticalPathsCompleted: false,
      missingCheckpoints: [],
      potentialLoops: [],
      progressionBlocked: false
    };
    
    if (!activeFlow || !context) return defaultStatus;
    
    // Check for missing critical path states
    const criticalStates = Object.entries(activeFlow.states)
      .filter(([_, state]) => state.isCriticalPath || state.isMandatory)
      .map(([id]) => id);
    
    const missingCriticalStates = criticalStates.filter(id => 
      !context.visitedStateIds.includes(id));
    
    // Check for missing checkpoints
    const missingCheckpoints = activeFlow.progressionCheckpoints
      ? activeFlow.progressionCheckpoints.filter(checkpointId => 
          !context.visitedStateIds.includes(checkpointId))
      : [];
    
    // Check for potential loops (states visited more than their max visits)
    const potentialLoops = Object.entries(context.loopDetection)
      .filter(([stateId, count]) => {
        const state = activeFlow.states[stateId];
        const maxVisits = state?.maxVisits || 1;
        return count > maxVisits;
      })
      .map(([stateId]) => stateId);
    
    // Determine overall progression status
    const criticalPathsCompleted = missingCriticalStates.length === 0;
    
    // A progression is blocked if:
    // 1. We're missing critical paths AND
    // 2. We've detected loops that might prevent progress
    const progressionBlocked = 
      !criticalPathsCompleted && 
      potentialLoops.length > 0 &&
      // Special case for Kapoor: journal presentation must be visited
      (context.characterId === 'kapoor' && missingCriticalStates.includes('journal-presentation'));
    
    return {
      isCompleted: context.visitedStateIds.length > 0,
      criticalPathsCompleted,
      missingCheckpoints,
      potentialLoops,
      progressionBlocked
    };
  },
  
  forceProgressionRepair: () => {
    const { 
      activeFlow, 
      context, 
      currentState,
      isJumpingToState 
    } = get();
    
    // Guard against recursive repair
    if (isJumpingToState) {
      console.warn(`[DialogueStateMachine] Prevented recursive repair`);
      return;
    }
    
    if (!activeFlow || !context) return;
    
    // Find critical states we need to visit
    const criticalStates = Object.entries(activeFlow.states)
      .filter(([_, state]) => state.isCriticalPath)
      .map(([id, state]) => ({ id, state }));
    
    // Log repair attempt
    console.warn(`[DialogueStateMachine] Forcing progression repair for ${context.characterId} dialogue`);
    
    // Track repair attempt
    if (currentState) {
      dialogueProgressionRepair(
        activeFlow.id,
        context.characterId,
        context.nodeId,
        currentState.id,
        'repair_target', // Will be updated below
        'force_progression_repair',
        true
      );
    }
    
    // Special case for Kapoor's journal presentation
    if (context.characterId === 'kapoor') {
      const journalState = criticalStates.find(({ id }) => id === 'journal-presentation');
      
      if (journalState && !context.visitedStateIds.includes('journal-presentation')) {
        console.log(`[DialogueStateMachine] Forcing jump to journal presentation state`);
        
        // Use safe jump to prevent recursion
        setTimeout(() => {
          get().jumpToState('journal-presentation');
        }, 10);
        return;
      }
    }
    
    // If there's any critical state we haven't visited, go there
    for (const { id } of criticalStates) {
      if (!context.visitedStateIds.includes(id)) {
        console.log(`[DialogueStateMachine] Forcing jump to critical state: ${id}`);
        
        // Use safe jump to prevent recursion
        setTimeout(() => {
          get().jumpToState(id);
        }, 10);
        return;
      }
    }
    
    // If all else fails, try to go to a conclusion state
    const conclusionState = Object.entries(activeFlow.states)
      .find(([_, state]) => state.isConclusion);
    
    if (conclusionState) {
      console.log(`[DialogueStateMachine] Forcing jump to conclusion state: ${conclusionState[0]}`);
      
      // Use safe jump to prevent recursion
      setTimeout(() => {
        get().jumpToState(conclusionState[0]);
      }, 10);
    }
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
    visitedStateIds: [],
    loopDetection: {},
    criticalPathProgress: {},
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
  
  // Extract progression checkpoints
  const progressionCheckpoints = Object.entries(states)
    .filter(([_, state]) => state.isCriticalPath)
    .map(([id]) => id);
  
  return {
    id,
    initialStateId,
    states,
    context: defaultContext,
    transitions,
    progressionCheckpoints,
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

// Complete implementation of Kapoor calibration flow with all dialogue stages
export const createKapoorCalibrationFlow = (nodeId: string) => {
  return createDialogueFlow(
    'kapoor-calibration',
    {
      // STAGE 1: Introduction 
      'intro': {
        id: 'intro',
        type: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
        maxVisits: 1,
        isMandatory: true,
        nextStateId: 'basics', // CRITICAL FIX: Provide a default fallback path
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
        ]
      },
      
      // STAGE 2: Basic explanation of calibration setup
      'basics': {
        id: 'basics',
        type: 'question',
        text: "We'll start with the basics. I've set up our calibrated farmer chamber at isocenter with proper buildup. Can you recall why we use buildup material?",
        isMandatory: true,
        nextStateId: 'correction-factors', // CRITICAL FIX: Provide a default fallback path
        options: [
          { 
            id: "correct-buildup",
            text: "To ensure we're measuring in the region of electronic equilibrium.", 
            nextStateId: 'correction-factors',
            responseText: "Precisely. Electronic equilibrium is essential for accurate dosimetry. The buildup material ensures charged particle equilibrium at the measurement point.",
            relationshipChange: 1,
            isCriticalPath: true
          },
          { 
            id: "engaged-learner",
            text: "I understand the general concept, but could you elaborate on how it applies specifically to this setup?", 
            nextStateId: 'correction-factors',
            responseText: "A fair question. In this specific setup, we're using a 6MV beam where the depth of dose maximum is approximately 1.5cm. The buildup cap ensures our measuring point is at equilibrium rather than in the buildup region.",
            relationshipChange: 1
          },
          { 
            id: "partial-buildup",
            text: "To filter out unwanted radiation scatter.", 
            nextStateId: 'correction-factors',
            responseText: "Not quite. While buildup does affect scatter, its primary purpose is to establish electronic equilibrium. The scatter component is actually an integral part of what we need to measure.",
            relationshipChange: 0
          }
        ]
      },
      
      // STAGE 3: PTP Correction Factors
      'correction-factors': {
        id: 'correction-factors',
        type: 'question',
        text: "Now, when taking our readings, we need to apply several correction factors. Which of these is most critical for today's measurements given the current atmospheric conditions?",
        nextStateId: 'measurement-tolerance', // CRITICAL FIX: Provide a default fallback path
        options: [
          { 
            id: "correct-ptp",
            text: "The pressure-temperature-polarization (PTP) correction, since barometric pressure has changed significantly today.", 
            nextStateId: 'measurement-tolerance',
            responseText: "Excellent. PTP correction accounts for the deviation of air density from calibration reference conditions. Today's pressure drop of 15 hPa would significantly impact our results without proper correction.",
            relationshipChange: 1,
            triggersBackstory: true,
            isCriticalPath: true
          },
          { 
            id: "incorrect-kq",
            text: "The beam quality correction factor (kQ), since we're measuring a clinical beam.", 
            nextStateId: 'measurement-tolerance',
            responseText: "While kQ is indeed important, it's a constant for our specific chamber-beam combination. The significant pressure change today means the PTP correction is most critical for today's measurements.",
            relationshipChange: 0
          },
          { 
            id: "incorrect-polarity",
            text: "The polarity correction, since we're using a new electrometer.", 
            nextStateId: 'measurement-tolerance',
            responseText: "The polarity effect is minimal for our Farmer chamber in photon beams. While it's applied as standard procedure, the atmospheric pressure change today means the PTP correction is the most critical factor.",
            relationshipChange: -1
          }
        ]
      },
      
      // STAGE 4: Backstory on PTP Correction
      'backstory-ptp': {
        id: 'backstory-ptp',
        type: 'backstory',
        text: "During my early career at Memorial Hospital, I once failed to apply the PTP correction properly when recalibrating after maintenance. The output was off by nearly 3%. I discovered this by cross-checking with a separate chamber. Since then, I've developed a verification protocol that has been adopted by several facilities in the region. Small details can have significant clinical impact.",
        nextStateId: 'measurement-tolerance'
      },
      
      // STAGE 5: Tolerance Questions
      'measurement-tolerance': {
        id: 'measurement-tolerance',
        type: 'question',
        text: "Our monthly output measurements show the machine is delivering 101.2% of expected dose. What action should we take?",
        nextStateId: 'clinical-significance', // CRITICAL FIX: Provide a default fallback path
        options: [
          { 
            id: "correct-tolerance",
            text: "Document the finding but no immediate action needed as it's within the ±2% tolerance.", 
            nextStateId: 'clinical-significance',
            responseText: "Correct. TG-142 specifies a ±2% tolerance for photon output constancy. While we always aim for perfect calibration, variations within tolerance are acceptable and expected.",
            relationshipChange: 1,
            isCriticalPath: true
          },
          { 
            id: "overly-cautious",
            text: "Recalibrate the machine to get closer to 100%.", 
            nextStateId: 'clinical-significance',
            responseText: "That would be unnecessary. Our protocols follow TG-142 guidelines which specify a ±2% tolerance. Frequent recalibration can introduce more variability over time.",
            relationshipChange: -1
          },
          { 
            id: "incorrect-uncertainty",
            text: "Repeat the measurement to reduce uncertainty.", 
            nextStateId: 'clinical-significance',
            responseText: "We already performed three measurements with excellent reproducibility. At 101.2%, we're well within the ±2% tolerance specified by TG-142. Additional measurements would not change our action plan.",
            relationshipChange: 0
          }
        ]
      },
      
      // STAGE 6: Clinical Significance
      'clinical-significance': {
        id: 'clinical-significance',
        type: 'question',
        text: "Final question: A radiation oncologist asks if the 1.2% output deviation we measured could affect patient treatments. How would you respond?",
        nextStateId: 'conclusion', // CRITICAL FIX: Provide a default fallback path
        options: [
          { 
            id: "correct-clinical",
            text: "The deviation is clinically insignificant, as it falls well below the 5% uncertainty threshold considered impactful for treatment outcomes.", 
            nextStateId: 'conclusion',
            responseText: "Your response demonstrates an understanding of both the technical and clinical aspects. A 1.2% deviation has negligible impact on treatment efficacy or side effects, while staying well within our quality parameters.",
            relationshipChange: 1,
            isCriticalPath: true
          },
          { 
            id: "partially-correct",
            text: "It's within tolerance but we should monitor it closely on the specific machines used for their patients.", 
            nextStateId: 'conclusion',
            responseText: "Your caution is noted, though perhaps excessive. We always monitor all machines consistently according to protocol. The 1.2% deviation is well below the threshold for clinical significance, which is typically considered to be around 5%.",
            relationshipChange: 0
          },
          { 
            id: "incorrect-clinical",
            text: "Any deviation could potentially impact sensitive treatments, so we should inform treatment planning.", 
            nextStateId: 'conclusion',
            responseText: "That response would unnecessarily alarm our clinical colleagues. Our QA program accounts for these acceptable variations. Treatment planning systems use beam data that already incorporates these expected minor fluctuations.",
            relationshipChange: -1
          }
        ]
      },
      
      // STAGE 7: Standard Conclusion
      'conclusion': {
        id: 'conclusion',
        type: 'conclusion',
        text: "Your understanding of calibration procedures is satisfactory. Regular output measurements are a fundamental responsibility of medical physics. Consistency and attention to detail are essential. Continue to develop your technical knowledge alongside clinical awareness.",
        isConclusion: true,
        nextStateId: 'journal-presentation' // CRITICAL FIX: Provide an explicit transition to journal
      },
      
      // STAGE 8: Excellence Conclusion (high score)
      'conclusion-excellence': {
        id: 'conclusion-excellence',
        type: 'conclusion',
        text: "Your grasp of calibration principles and their clinical context is impressive for a first-day resident. You demonstrate the careful balance of technical precision and clinical judgment that defines excellent medical physics practice. I look forward to your contributions to our department.",
        isConclusion: true,
        nextStateId: 'journal-presentation' // CRITICAL FIX: Provide an explicit transition to journal
      },
      
      // STAGE 9: Needs Improvement Conclusion (low score)
      'conclusion-needs-improvement': {
        id: 'conclusion-needs-improvement',
        type: 'conclusion',
        text: "Your understanding of calibration procedures requires significant improvement. These are foundational concepts in medical physics that impact patient safety. I recommend reviewing TG-51 and TG-142 protocols tonight. This profession demands precision and thorough understanding of both technical and clinical implications.",
        isConclusion: true,
        nextStateId: 'journal-presentation' // CRITICAL FIX: Provide an explicit transition to journal
      },
      
      // STAGE 10: Journal Presentation (Critical Progression Point)
      'journal-presentation': {
        id: 'journal-presentation',
        type: 'critical-moment',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
        isCriticalPath: true,
        isConclusion: true,
        maxVisits: 2, // Allow up to 2 visits (for repair scenarios)
        onEnter: (context) => {
          // Only dispatch if not already triggered
          if (!context.criticalPathProgress['journal-acquisition-triggered']) {
            // Mark as triggered to prevent repeat processing
            context.criticalPathProgress['journal-acquisition-triggered'] = true;
            
            // Determine journal tier based on performance
            const journalTier = determineJournalTier(context);
            
            // Use safe dispatching with timeout to prevent infinite loops
            setTimeout(() => {
              // Notify of critical path
              dialogueCriticalPath(
                'kapoor-calibration',
                context.characterId,
                context.nodeId,
                'journal-presentation',
                context.playerScore,
                false
              );
              
              // This ensures the journal is acquired safely
              journalAcquired(
                journalTier,
                context.characterId,
                'dialogue_state_machine'
              );
            }, 50);
          }
        }
      }
    },
    'intro',
    { characterId: 'kapoor', nodeId },
    (context) => {
      // Final completion handler that runs regardless of path taken
      // Use safe dispatching with timeout to prevent infinite loops
      setTimeout(() => {
        nodeCompleted(nodeId, 
          context.characterId,
          {
            relationshipChange: context.playerScore,
            journalTier: determineJournalTier(context),
            isJournalAcquisition: true
          }
        );
      }, 10);
      
      // Dispatch successful completion event with delay
      setTimeout(() => {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueFlow',
          action: 'completed',
          metadata: {
            flowId: 'kapoor-calibration',
            nodeId,
            visitedStates: context.visitedStateIds,
            selectedOptions: context.selectedOptionIds,
            criticalPathsVisited: Object.keys(context.criticalPathProgress).length,
            playerScore: context.playerScore
          }
        });
      }, 20);
    }
  );
};

export default {
  useDialogueStateMachine,
  createDialogueFlow,
  createKapoorCalibrationFlow
};