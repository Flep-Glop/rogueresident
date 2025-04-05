// app/core/dialogue/DialogueController.ts
/**
 * Dialogue Controller
 * 
 * Serves as the orchestration layer between UI interactions and the dialogue state machine.
 * This controller establishes clear domain boundaries for dialogue management, allowing
 * for deterministic state transitions and reliable narrative progression.
 * 
 * Following Supergiant's pattern of separating narrative content from progression logic,
 * this controller ensures that dialogue flows maintain their integrity across game state changes.
 */

import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { 
  useDialogueStateMachine, 
  DialogueState, 
  DialogueStateType 
} from './DialogueStateMachine';
import { useNarrativeTransaction } from './NarrativeTransaction';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { 
  DialogueOptionSelectedPayload, 
  DialogueCriticalPathPayload,
  DialogueProgressionRepairPayload,
  UIEventPayload
} from '../events/EventTypes';

/**
 * Initialize the dialogue controller and establish event subscriptions
 * 
 * This follows the "system initialization" pattern we used in Hades where
 * core systems are initialized once and maintain consistent state throughout
 * the game session, creating predictable narrative beats even in the highly
 * randomized roguelike structure.
 */
export function initializeDialogueController() {
  const eventBus = useEventBus.getState();
  const stateMachine = useDialogueStateMachine.getState();
  const narrativeTransaction = useNarrativeTransaction.getState();
  
  // Track subscriptions for cleanup
  const subscriptions: (() => void)[] = [];
  
  // ======= UI Event Handlers =======
  
  // Map UI dialogue interactions to state machine actions
  subscriptions.push(
    eventBus.subscribe<UIEventPayload>(GameEventType.UI_DIALOGUE_ADVANCED, (event) => {
      const { action, metadata } = event.payload;
      
      if (!stateMachine.activeFlow) {
        console.warn('[DialogueController] Cannot handle UI action - no active dialogue flow');
        return;
      }
      
      switch (action) {
        case 'option-selected':
          if (metadata?.optionId) {
            stateMachine.selectOption(metadata.optionId);
          }
          break;
          
        case 'continue':
          stateMachine.advanceState();
          break;
          
        case 'skip-response':
          stateMachine.dispatch({ type: 'SET_RESPONSE_VISIBILITY', visible: false });
          break;
          
        case 'skip-backstory':
          stateMachine.dispatch({ type: 'SET_BACKSTORY_VISIBILITY', visible: false });
          break;
          
        case 'initialize':
          // Dialogue initialization is handled by a separate event (DIALOGUE_STARTED)
          // This is just for tracking UI interactions
          console.log('[DialogueController] Dialogue UI initialized', metadata);
          break;
          
        default:
          console.warn(`[DialogueController] Unknown dialogue UI action: ${action}`);
      }
    })
  );
  
  // ======= Dialogue Start/End Handlers =======
  
  // Handle dialogue initialization
  subscriptions.push(
    eventBus.subscribe(GameEventType.DIALOGUE_STARTED, (event) => {
      const { flowId, initialStageId, stages, characterId, nodeId } = event.payload;
      
      if (!stages || !initialStageId) {
        console.error('[DialogueController] Cannot initialize dialogue without stages or initialStageId');
        return;
      }
      
      // Convert UI dialogue stages to state machine format
      const states: Record<string, DialogueState> = {};
      
      stages.forEach(stage => {
        states[stage.id] = {
          id: stage.id,
          type: stage.type as DialogueStateType || 'question',
          text: stage.text,
          options: stage.options?.map(option => ({
            id: option.id,
            text: option.text,
            responseText: option.responseText,
            nextStateId: option.nextStageId,
            insightGain: option.insightGain,
            relationshipChange: option.relationshipChange,
            knowledgeGain: option.knowledgeGain,
            triggersBackstory: option.triggersBackstory,
            isCriticalPath: option.isCriticalPath,
            condition: option.condition
          })),
          nextStateId: stage.nextStageId,
          isConclusion: stage.isConclusion,
          isCriticalPath: stage.isCriticalPath,
          isMandatory: stage.isMandatory,
          maxVisits: stage.maxVisits,
          onEnter: stage.onEnter,
          onExit: stage.onExit
        };
      });
      
      // Create flow context
      const context = {
        characterId: characterId || 'unknown',
        nodeId: nodeId || 'unknown',
        playerScore: 0,
        selectedOptionIds: [],
        knowledgeGained: {},
        visitedStateIds: [initialStageId],
        criticalPathProgress: {},
        transactionIds: {}
      };
      
      // Generate progression checkpoints from critical path states
      const progressionCheckpoints = Object.entries(states)
        .filter(([_, state]) => state.isCriticalPath)
        .map(([id]) => id);
      
      // Initialize the dialogue flow
      stateMachine.initializeFlow({
        id: flowId,
        initialStateId,
        states,
        context,
        progressionCheckpoints
      });
      
      console.log(`[DialogueController] Initialized dialogue flow: ${flowId}`);
    })
  );
  
  // Handle dialogue completion
  subscriptions.push(
    eventBus.subscribe(GameEventType.DIALOGUE_COMPLETED, (event) => {
      const { flowId, completed, reason } = event.payload;
      
      // Only handle proper completion (not interruptions)
      if (completed) {
        console.log(`[DialogueController] Dialogue flow completed: ${flowId}`);
        
        // If the flow is still active, complete it
        if (stateMachine.activeFlow && stateMachine.activeFlow.id === flowId) {
          stateMachine.completeFlow();
        }
      } else {
        console.log(`[DialogueController] Dialogue flow interrupted: ${flowId}, reason: ${reason}`);
        
        // For interruptions (like component unmounting), we don't call completeFlow
        // This prevents unintended side effects from partial dialogue completion
        
        // However, we should attempt to resolve any critical path issues
        const progressionStatus = stateMachine.getProgressionStatus();
        
        if (!progressionStatus.criticalPathsCompleted && stateMachine.activeFlow) {
          console.warn(`[DialogueController] Interrupted dialogue had incomplete critical path: ${flowId}`);
          
          // Log for analytics/debugging
          eventBus.dispatch<DialogueProgressionRepairPayload>(
            GameEventType.DIALOGUE_PROGRESSION_REPAIR,
            {
              dialogueId: flowId,
              characterId: stateMachine.context?.characterId || 'unknown',
              nodeId: stateMachine.context?.nodeId || 'unknown',
              fromStateId: progressionStatus.lastVisitedStateId || 'unknown',
              toStateId: 'forced_conclusion',
              reason: `interrupted_${reason}`,
              loopDetected: progressionStatus.loopDetected
            }
          );
        }
      }
    })
  );
  
  // ======= Dialogue Option Selection Handlers =======
  
  // Process side effects of dialogue option selection
  subscriptions.push(
    eventBus.subscribe<DialogueOptionSelectedPayload>(GameEventType.DIALOGUE_OPTION_SELECTED, (event) => {
      const { optionId, stageId, character, insightGain, knowledgeGain } = event.payload;
      
      // Apply insight gain
      if (insightGain && insightGain > 0) {
        useGameStore.getState().updateInsight(insightGain);
      }
      
      // Apply knowledge gain
      if (knowledgeGain) {
        useKnowledgeStore.getState().updateMastery(
          knowledgeGain.conceptId,
          knowledgeGain.amount
        );
      }
      
      console.log(`[DialogueController] Processed option selection: ${optionId} in stage ${stageId}`);
    })
  );
  
  // ======= Critical Path Event Handlers =======
  
  // Handle critical path progression events
  subscriptions.push(
    eventBus.subscribe<DialogueCriticalPathPayload>(GameEventType.DIALOGUE_CRITICAL_PATH, (event) => {
      const { dialogueId, characterId, nodeId, criticalStateId, playerScore } = event.payload;
      
      // Handle journal acquisition for Kapoor
      if (criticalStateId === 'journal-presentation' && characterId === 'kapoor') {
        // Determine journal tier based on performance
        const journalTier = playerScore >= 3 ? 'annotated' : 
                           playerScore >= 0 ? 'technical' : 'base';
        
        // Check if we already have an active transaction
        if (stateMachine.context?.transactionIds?.journal_acquisition) {
          console.log('[DialogueController] Journal acquisition transaction already exists');
        } else {
          // Create a new transaction
          const transactionId = narrativeTransaction.startTransaction(
            'journal_acquisition',
            { journalTier, source: 'dialogue_controller' },
            characterId,
            nodeId
          );
          
          console.log(`[DialogueController] Created journal acquisition transaction: ${transactionId}`);
          
          // Store transaction ID in dialogue context
          stateMachine.dispatch({
            type: 'UPDATE_CONTEXT',
            update: {
              transactionIds: {
                ...(stateMachine.context?.transactionIds || {}),
                journal_acquisition: transactionId
              }
            }
          });
        }
      }
      
      // Other critical path handling could be added here
      // This is where you'd implement character-specific narrative branching
    })
  );
  
  console.log('[DialogueController] Initialized');
  
  // Return cleanup function
  return () => {
    // Remove all subscriptions
    subscriptions.forEach(unsubscribe => unsubscribe());
    console.log('[DialogueController] Teardown complete');
  };
}

/**
 * Setup the dialogue controller for the application
 * 
 * Call this once during app initialization to establish the dialogue controller.
 */
export function setupDialogueController() {
  const cleanupFn = initializeDialogueController();
  
  // Subscribe to session end to clean up
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      cleanupFn();
      unsubscribe();
    }
  );
  
  return {
    teardown: () => {
      cleanupFn();
      unsubscribe();
    }
  };
}

export default {
  initializeDialogueController,
  setupDialogueController
};