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
    nodeCompleted
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
        
        // Before completing, validate progression
        const progressionStatus = get().getProgressionStatus();
        
        if (progressionStatus.progressionBlocked) {
          console.warn(`[DialogueStateMachine] Progression blocked before completion: ${JSON.stringify(progressionStatus)}`);
          // Attempt automatic repair
          get().forceProgressionRepair();
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
        
        // If this is a non-critical state and we've exceeded visits, try to find a better state
        if (!targetState.isCriticalPath && !targetState.isMandatory) {
          // Find critical paths we haven't visited yet
          const unvisitedCriticalStates = Object.entries(activeFlow.states)
            .filter(([id, state]) => state.isCriticalPath && !updatedContext.visitedStateIds.includes(id))
            .map(([id]) => id);
          
          if (unvisitedCriticalStates.length > 0) {
            console.log(`[DialogueStateMachine] Redirecting to unvisited critical state: ${unvisitedCriticalStates[0]}`);
            get().jumpToState(unvisitedCriticalStates[0]);
            return;
          }
          
          // If we're in a loop with nowhere else to go, try to force to conclusion
          if (currentVisits > maxVisits + 2) {
            const conclusionStates = Object.entries(activeFlow.states)
              .filter(([id, state]) => state.isConclusion)
              .map(([id]) => id);
            
            if (conclusionStates.length > 0) {
              console.warn(`[DialogueStateMachine] Loop escape: jumping to conclusion state: ${conclusionStates[0]}`);
              get().jumpToState(conclusionStates[0]);
              return;
            }
          }
        }
      }
      
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
          
          // Determine journal tier based on performance
          const journalTier = determineJournalTier(updatedContext);
          
          // Dispatch event for journal acquisition preparation
          journalAcquired(
            journalTier,
            updatedContext.characterId,
            'dialogue_state_machine'
          );
        }
      }, 100);
    },
    
    completeFlow: () => {
      const { activeFlow, context } = get();
      
      if (!activeFlow || !context) return;
      
      // Final progression validation before completion
      const progressionStatus = get().getProgressionStatus();
      
      // Attempt to repair progression if needed
      if (progressionStatus.progressionBlocked) {
        console.warn(`[DialogueStateMachine] Attempting progression repair before completion`);
        get().forceProgressionRepair();
      }
      
      // Call the onComplete callback if it exists
      if (activeFlow.onComplete) {
        activeFlow.onComplete(context);
      }
      
      // Ensure node completion is registered
      if (context.nodeId) {
        nodeCompleted(
          context.nodeId,
          context.characterId,
          {
            relationshipChange: context.playerScore,
            journalTier: determineJournalTier(context),
            isJournalAcquisition: context.characterId === 'kapoor'
          }
        );
      }
      
      // Dispatch dialogue completed event
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
      const { activeFlow, context } = get();
      
      if (!activeFlow || !context) return;
      
      // Find critical states we need to visit
      const criticalStates = Object.entries(activeFlow.states)
        .filter(([_, state]) => state.isCriticalPath)
        .map(([id, state]) => ({ id, state }));
      
      // Log repair attempt
      console.warn(`[DialogueStateMachine] Forcing progression repair for ${context.characterId} dialogue`);
      
      // Special case for Kapoor's journal presentation
      if (context.characterId === 'kapoor') {
        const journalState = criticalStates.find(({ id }) => id === 'journal-presentation');
        
        if (journalState && !context.visitedStateIds.includes('journal-presentation')) {
          console.log(`[DialogueStateMachine] Forcing jump to journal presentation state`);
          get().jumpToState('journal-presentation');
          return;
        }
      }
      
      // If there's any critical state we haven't visited, go there
      for (const { id } of criticalStates) {
        if (!context.visitedStateIds.includes(id)) {
          console.log(`[DialogueStateMachine] Forcing jump to critical state: ${id}`);
          get().jumpToState(id);
          return;
        }
      }
      
      // If all else fails, try to go to a conclusion state
      const conclusionState = Object.entries(activeFlow.states)
        .find(([_, state]) => state.isConclusion);
      
      if (conclusionState) {
        console.log(`[DialogueStateMachine] Forcing jump to conclusion state: ${conclusionState[0]}`);
        get().jumpToState(conclusionState[0]);
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
  
  // Example usage for journal acquisition flow with enhanced path validation
  export const createKapoorCalibrationFlow = (nodeId: string) => {
    return createDialogueFlow(
      'kapoor-calibration',
      {
        'intro': {
          id: 'intro',
          type: 'intro',
          text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
          maxVisits: 1,
          isMandatory: true,
        },
        // Additional states would be defined here
        'journal-presentation': {
          id: 'journal-presentation',
          type: 'critical-moment',
          text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
          isCriticalPath: true,
          isConclusion: true,
          maxVisits: 2, // Allow up to 2 visits (for repair scenarios)
          onEnter: (context) => {
            // This ensures the journal is acquired regardless of UI state
            journalAcquired(
              determineJournalTier(context),
              context.characterId
            );
            
            // Emit event for analytics
            useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'dialogueStateMachine',
              action: 'journalStateReached',
              metadata: {
                playerScore: context.playerScore,
                journalTier: determineJournalTier(context),
                context: {
                  visitedStates: context.visitedStateIds.length,
                  knowledgeGainedCount: Object.keys(context.knowledgeGained).length
                }
              }
            });
          }
        }
      },
      'intro',
      { characterId: 'kapoor', nodeId },
      (context) => {
        // Final completion handler that runs regardless of path taken
        nodeCompleted(nodeId, 
          context.characterId,
          {
            relationshipChange: context.playerScore,
            journalTier: determineJournalTier(context)
          }
        );
        
        // Dispatch successful completion event
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
      }
    );
  };
  
  export default {
    useDialogueStateMachine,
    createDialogueFlow,
    createKapoorCalibrationFlow
  };