// app/core/dialogue/DialogueController.ts
/**
 * Dialogue Controller
 * 
 * A narrative orchestration layer that bridges UI interactions with game state.
 * This controller establishes clear domain boundaries for dialogue management,
 * ensuring narrative integrity while maintaining responsive gameplay.
 * 
 * Inspired by Hades' separation of narrative content from game mechanics,
 * this controller ensures that character interactions feel natural while
 * remaining resilient to the unpredictable nature of player-driven pacing.
 */

import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { 
  useDialogueStateMachine, 
  DialogueState, 
  DialogueStateType,
  DialogueContext 
} from './DialogueStateMachine';
import { useNarrativeTransaction } from './NarrativeTransaction';
import { validateDialogueProgression, repairDialogueProgression } from './DialogueProgressionHelpers';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useJournalStore } from '../../store/journalStore';
import { 
  DialogueOptionSelectedPayload, 
  DialogueCriticalPathPayload,
  DialogueProgressionRepairPayload,
  DialogueStartPayload,
  DialogueCompletionPayload,
  UIEventPayload
} from '../events/EventTypes';

/**
 * Initialize the dialogue controller and establish event subscriptions
 * 
 * This follows the "system initialization" pattern used in narrative roguelikes
 * where core systems are initialized once and maintain consistent state throughout
 * the game session, creating predictable narrative beats even in highly randomized gameplay.
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
        // For initialization actions, don't warn since flow may not exist yet
        if (action !== 'initialize') {
          console.warn('[DialogueController] Cannot handle UI action - no active dialogue flow');
        }
        return;
      }
      
      switch (action) {
        case 'option-selected':
          if (metadata?.optionId) {
            stateMachine.selectOption(metadata.optionId);
            
            // Track metrics if available
            if (metadata.insightGain || metadata.relationshipChange) {
              trackDialogueMetrics({
                optionId: metadata.optionId,
                insightGain: metadata.insightGain,
                relationshipChange: metadata.relationshipChange,
                character: metadata.character
              });
            }
          }
          break;
          
        case 'continue':
          stateMachine.advanceState();
          break;
          
        case 'skip-text':
        case 'skip-response':
          stateMachine.dispatch({ type: 'SET_RESPONSE_VISIBILITY', visible: false });
          break;
          
        case 'skip-backstory':
          stateMachine.dispatch({ type: 'SET_BACKSTORY_VISIBILITY', visible: false });
          break;
          
        case 'show-backstory':
          if (metadata?.text) {
            stateMachine.dispatch({ 
              type: 'SET_BACKSTORY_VISIBILITY', 
              visible: true, 
              text: metadata.text 
            });
          }
          break;
          
        case 'jump-to-stage':
          if (metadata?.toStageId) {
            stateMachine.jumpToState(metadata.toStageId);
          }
          break;
          
        case 'initialize':
          // This is just for tracking UI interactions
          // The actual initialization is handled by DIALOGUE_STARTED event
          console.log('[DialogueController] Dialogue UI initialized');
          break;
          
        default:
          console.log(`[DialogueController] Unhandled dialogue UI action: ${action}`);
          break;
      }
    })
  );
  
  // ======= Dialogue Start/End Handlers =======
  
  // Handle dialogue initialization
  subscriptions.push(
    eventBus.subscribe<DialogueStartPayload>(GameEventType.DIALOGUE_STARTED, (event) => {
      const { flowId, initialStageId, stages, characterId, nodeId } = event.payload;
      
      if (!stages || !initialStageId) {
        console.error('[DialogueController] Cannot initialize dialogue without stages or initialStageId');
        return;
      }
      
      // Convert UI dialogue stages to state machine format
      const states: Record<string, DialogueState> = {};
      
      stages.forEach(stage => {
        // Default type based on stage nature
        const stateType = stage.type || 
                         (stage.options && stage.options.length > 0 ? 'question' : 'intro');
                        
        states[stage.id] = {
          id: stage.id,
          type: stateType as DialogueStateType,
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
      const context: DialogueContext = {
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
        progressionCheckpoints,
        // Completion callback to ensure proper cleanup
        onComplete: (finalContext) => {
          handleDialogueCompletion(flowId, finalContext);
        }
      });
      
      console.log(`[DialogueController] Initialized dialogue flow: ${flowId}`);
    })
  );
  
  // Handle dialogue completion
  subscriptions.push(
    eventBus.subscribe<DialogueCompletionPayload>(GameEventType.DIALOGUE_COMPLETED, (event) => {
      const { flowId, completed, reason, character, nodeId } = event.payload;
      
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
          
          // Attempt auto-repair for important characters
          if (character && nodeId) {
            // Validate progression state
            const validationResult = validateDialogueProgression(character, nodeId);
            
            // If there are issues, attempt repair
            if (validationResult.requiresRepair) {
              console.warn(`[DialogueController] Attempting to repair ${character} dialogue progression`);
              repairDialogueProgression(character, nodeId);
            }
          }
          
          // Log for analytics/debugging
          eventBus.dispatch<DialogueProgressionRepairPayload>(
            GameEventType.DIALOGUE_PROGRESSION_REPAIR,
            {
              dialogueId: flowId,
              characterId: character || stateMachine.context?.characterId || 'unknown',
              nodeId: nodeId || stateMachine.context?.nodeId || 'unknown',
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
      const { optionId, stageId, character, insightGain, knowledgeGain, relationshipChange } = event.payload;
      
      // Apply insight gain to player
      if (insightGain && insightGain > 0) {
        useGameStore.getState().updateInsight(insightGain);
        
        // Visual feedback based on size of gain
        if (insightGain >= 15) {
          eventBus.dispatch(GameEventType.EFFECT_SCREEN_FLASH, {
            color: 'green',
            duration: 300
          });
          
          eventBus.dispatch(GameEventType.EFFECT_SOUND_PLAYED, {
            effect: 'success',
            volume: 0.8
          });
        } else if (insightGain >= 5) {
          eventBus.dispatch(GameEventType.EFFECT_SOUND_PLAYED, {
            effect: 'click',
            volume: 0.5
          });
        }
      }
      
      // Apply relationship change if applicable
      if (relationshipChange && character) {
        useGameStore.getState().updateRelationship(character, relationshipChange);
        
        // Visual feedback based on direction of change
        if (relationshipChange > 0) {
          eventBus.dispatch(GameEventType.EFFECT_SOUND_PLAYED, {
            effect: 'relationship-up',
            volume: 0.6
          });
        } else if (relationshipChange < 0) {
          eventBus.dispatch(GameEventType.EFFECT_SOUND_PLAYED, {
            effect: 'relationship-down',
            volume: 0.6
          });
        }
      }
      
      // Apply knowledge gain if applicable
      if (knowledgeGain) {
        useKnowledgeStore.getState().updateMastery(
          knowledgeGain.conceptId,
          knowledgeGain.amount
        );
        
        // Log knowledge gain for night phase
        eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
          conceptId: knowledgeGain.conceptId,
          amount: knowledgeGain.amount,
          domainId: knowledgeGain.domainId,
          character,
          source: `dialogue_option:${optionId}`
        });
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
        handleJournalPresentation(dialogueId, characterId, nodeId, playerScore);
      } 
      // Handle equipment safety for Jesse
      else if (criticalStateId === 'equipment-safety' && characterId === 'jesse') {
        console.log('[DialogueController] Processing equipment safety critical path');
        
        // Create an equipment safety mastery transaction
        const transactionId = narrativeTransaction.startTransaction(
          'knowledge_revelation',
          { 
            concept: 'equipment_safety_protocol',
            domain: 'quality-assurance',
            source: 'dialogue_controller' 
          },
          characterId,
          nodeId
        );
        
        console.log(`[DialogueController] Created equipment safety transaction: ${transactionId}`);
        
        // Update knowledge store
        useKnowledgeStore.getState().updateMastery(
          'equipment_safety_protocol',
          playerScore >= 0 ? 15 : 10
        );
      }
      // Handle theoretical knowledge for Quinn
      else if (criticalStateId === 'quantum-understanding' && characterId === 'quinn') {
        console.log('[DialogueController] Processing quantum understanding critical path');
        
        // Create a theoretical knowledge transaction
        const transactionId = narrativeTransaction.startTransaction(
          'knowledge_revelation',
          { 
            concept: 'quantum_dosimetry_principles',
            domain: 'theoretical',
            source: 'dialogue_controller' 
          },
          characterId,
          nodeId
        );
        
        console.log(`[DialogueController] Created quantum theory transaction: ${transactionId}`);
        
        // Update knowledge store
        useKnowledgeStore.getState().updateMastery(
          'quantum_dosimetry_principles',
          playerScore >= 0 ? 20 : 10
        );
      }
    })
  );
  
  console.log('[DialogueController] Initialized with all event handlers');
  
  // Return cleanup function
  return () => {
    // Remove all subscriptions
    subscriptions.forEach(unsubscribe => unsubscribe());
    console.log('[DialogueController] Teardown complete');
  };
}

/**
 * Helper function to handle dialogue completion with proper cleanup
 */
function handleDialogueCompletion(flowId: string, context: DialogueContext) {
  const { characterId, nodeId, playerScore, knowledgeGained } = context;
  
  // Log completion for analytics
  console.log(`[DialogueController] Dialogue flow ${flowId} completed with score: ${playerScore}`);
  
  // Complete any active transactions
  if (context.transactionIds) {
    Object.entries(context.transactionIds).forEach(([type, id]) => {
      if (id) {
        useNarrativeTransaction.getState().completeTransaction(id);
        console.log(`[DialogueController] Completed transaction: ${type} (${id})`);
      }
    });
  }
  
  // Node completion if nodeId available
  if (nodeId) {
    useGameStore.getState().completeNode(nodeId, {
      relationshipChange: playerScore,
      dialogueCompleted: true
    });
  }
  
  // Knowledge impact summary for analytics
  if (Object.keys(knowledgeGained).length > 0) {
    console.log(`[DialogueController] Dialogue resulted in ${Object.keys(knowledgeGained).length} knowledge gains`);
  }
  
  // Character-specific completion actions
  if (characterId === 'kapoor') {
    // Ensure journal acquisition happened if this was Kapoor
    const { hasJournal } = useJournalStore.getState();
    
    if (!hasJournal) {
      console.warn('[DialogueController] Journal acquisition may have failed, checking...');
      if (!context.transactionIds?.journal_acquisition) {
        // Attempt recovery
        const journalTier = playerScore >= 3 ? 'annotated' : 
                          playerScore >= 0 ? 'technical' : 'base';
        
        console.warn(`[DialogueController] Forcing journal acquisition (${journalTier})`);
        
        useJournalStore.getState().initializeJournal(journalTier);
      }
    }
  }
}

/**
 * Helper function to handle the journal presentation critical path
 */
function handleJournalPresentation(
  dialogueId: string, 
  characterId: string, 
  nodeId: string, 
  playerScore: number
) {
  // Determine journal tier based on performance
  const journalTier = playerScore >= 3 ? 'annotated' : 
                       playerScore >= 0 ? 'technical' : 'base';
  
  // Log for debugging
  console.log(`[DialogueController] Processing journal presentation with score ${playerScore} -> ${journalTier}`);
  
  // Check if journal already exists to prevent duplicates
  const { hasJournal } = useJournalStore.getState();
  
  if (hasJournal) {
    console.log('[DialogueController] Journal already exists, skipping acquisition');
    return;
  }
  
  // Create a transaction for this critical progression point
  const transactionId = useNarrativeTransaction.getState().startTransaction(
    'journal_acquisition',
    { 
      journalTier, 
      source: 'kapoor_dialogue', 
      playerScore 
    },
    characterId,
    nodeId
  );
  
  // Store transaction ID in dialogue context for tracking
  useDialogueStateMachine.getState().dispatch({
    type: 'UPDATE_CONTEXT',
    update: {
      transactionIds: {
        journal_acquisition: transactionId
      }
    }
  });
  
  // Initiate journal acquisition through central event system
  useEventBus.getState().dispatch(GameEventType.JOURNAL_ACQUIRED, {
    tier: journalTier,
    character: characterId,
    source: 'dialogue_critical_path'
  });
  
  // Play different sounds based on journal tier
  const soundEffect = journalTier === 'annotated' ? 'rare-item' : 
                     journalTier === 'technical' ? 'uncommon-item' : 'common-item';
  
  useEventBus.getState().dispatch(GameEventType.EFFECT_SOUND_PLAYED, {
    effect: soundEffect,
    volume: 0.8
  });
  
  // Visual feedback for journal acquisition
  const flashColor = journalTier === 'annotated' ? 'blue' : 'green';
  
  useEventBus.getState().dispatch(GameEventType.EFFECT_SCREEN_FLASH, {
    color: flashColor,
    duration: 400
  });
  
  // Emit critical path analytics event
  useEventBus.getState().dispatch(GameEventType.DIALOGUE_CRITICAL_PATH, {
    dialogueId,
    characterId,
    nodeId,
    criticalStateId: 'journal-presentation',
    playerScore,
    wasRepaired: false
  });
}

/**
 * Create a backstory transaction to display character history
 * 
 * This helps build player understanding of characters through contextual narrative
 * moments, similar to the flashback sequences in Pyre.
 */
export function createBackstoryTransaction(
  characterId: string, 
  backstoryId: string
): string {
  // Use narrative transaction system to create a backstory event
  const transaction = useNarrativeTransaction.getState();
  
  return transaction.startTransaction(
    'knowledge_revelation',
    { 
      backstoryId,
      source: 'character_dialogue'
    },
    characterId
  );
}

/**
 * Handle a critical choice in dialogue that affects game progression
 * 
 * These are similar to the "pact" moments in Hades, where player choices
 * create lasting effects on gameplay systems.
 */
export function handleCriticalChoice(
  choiceId: string, 
  outcome: string
): void {
  // Get state from various stores
  const activeFlow = useDialogueStateMachine.getState().activeFlow;
  
  if (!activeFlow) {
    console.warn(`[DialogueController] Cannot handle critical choice without active dialogue flow`);
    return;
  }
  
  // Track the critical choice in dialogue context
  useDialogueStateMachine.getState().dispatch({
    type: 'UPDATE_CONTEXT',
    update: {
      criticalChoices: {
        ...(useDialogueStateMachine.getState().context?.criticalChoices || {}),
        [choiceId]: outcome
      }
    }
  });
  
  // Log for progression validation
  console.log(`[DialogueController] Recorded critical choice: ${choiceId} -> ${outcome}`);
  
  // Emit critical choice event
  useEventBus.getState().dispatch(
    GameEventType.UI_BUTTON_CLICKED,
    {
      componentId: 'dialogueController',
      action: 'criticalChoiceSelected',
      metadata: {
        choiceId,
        outcome,
        dialogueId: activeFlow.id,
        character: activeFlow.context.characterId,
        nodeId: activeFlow.context.nodeId
      }
    }
  );
}

/**
 * Helper function to track dialogue metrics
 * 
 * This is similar to how Hades tracked "relationship" values
 * and adjusted future interactions based on dialogue history.
 */
function trackDialogueMetrics(data: {
  optionId: string;
  insightGain?: number;
  relationshipChange?: number;
  character?: string;
}) {
  // Log for analytics systems
  console.log(`[DialogueMetrics] Option: ${data.optionId}, Insight: ${data.insightGain}, Relationship: ${data.relationshipChange}`);
  
  // Track character teaching style over time
  if (data.character && data.relationshipChange) {
    try {
      // This would connect to a character teaching style analysis system
      // Similar to how Hades tracked "favor" with Olympians
      const teachingStyleChange = data.relationshipChange > 0 ? 'positive' : 'negative';
      
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'teachingStyleTracker',
          action: 'styleUpdate',
          metadata: {
            character: data.character,
            direction: teachingStyleChange,
            optionId: data.optionId,
            timestamp: Date.now()
          }
        }
      );
    } catch (e) {
      // Just fail silently for analytics
      console.log('[DialogueMetrics] Failed to track teaching style');
    }
  }
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
    },
    createBackstoryTransaction,
    handleCriticalChoice
  };
}

export default {
  initializeDialogueController,
  setupDialogueController,
  createBackstoryTransaction,
  handleCriticalChoice
};