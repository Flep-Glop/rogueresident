// app/core/progression/ProgressionRecoverySystem.ts
/**
 * Progression Recovery System
 * 
 * A robust recovery mechanism for dialogue and narrative progression.
 * This system ensures critical story beats are never lost, even when
 * dialogues are interrupted or state is corrupted.
 * 
 * Inspired by the narrative resilience of Hades, which could gracefully recover
 * from interrupted Shade or Olympian conversations while maintaining narrative continuity.
 */

import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { useGameStore } from '../../store/gameStore';
import { useJournalStore } from '../../store/journalStore';
import { useNarrativeTransaction } from '../dialogue/NarrativeTransaction';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useDialogueStateMachine } from '../dialogue/DialogueStateMachine';
import { validateNarrativeProgression, repairNarrativeProgression } from './NarrativeProgressionValidator';

// Progression interruption types
export type InterruptionType = 
  | 'dialogue_unmount'   // Component unmounted during dialogue
  | 'browser_refresh'    // Page refreshed mid-conversation
  | 'session_end'        // Game session ended abruptly
  | 'state_corruption'   // Game state became corrupted
  | 'critical_path_miss' // Critical path was skipped
  | 'manual_request';    // User requested recovery

// Recovery action types
export type RecoveryAction =
  | 'restart_dialogue'       // Restart dialogue from beginning
  | 'resume_dialogue'        // Resume dialogue from last state
  | 'force_critical_path'    // Jump directly to critical path
  | 'grant_required_item'    // Grant a required item
  | 'grant_required_knowledge' // Grant required knowledge
  | 'mark_node_completed'    // Mark node as completed
  | 'repair_relationship'    // Repair character relationship
  | 'force_journal_acquisition'; // Force journal acquisition

// Recovery transaction record
export interface RecoveryTransaction {
  id: string;
  timestamp: number;
  interruptionType: InterruptionType;
  recoveryActions: RecoveryAction[];
  characterId?: string;
  nodeId?: string;
  dialogueId?: string;
  stateBeforeRecovery?: any;
  stateAfterRecovery?: any;
  successful: boolean;
}

// Recovery plan
export interface RecoveryPlan {
  requiredActions: RecoveryAction[];
  characterId?: string;
  nodeId?: string;
  dialogueId?: string;
  criticalPathId?: string;
  requiredKnowledge?: string[];
  requiredItems?: string[];
}

// Track recovery history
let recoveryHistory: RecoveryTransaction[] = [];

/**
 * Detects if the current game state needs progression recovery
 */
export function detectProgressionIssues(): boolean {
  // First, check narrative validation
  const validationResult = validateNarrativeProgression();
  if (!validationResult.isValid) {
    return true;
  }
  
  // Check for stalled transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(tx => 
    tx.state === 'active' && (Date.now() - tx.startTime > 60000) // Stalled for over a minute
  );
  
  if (stalledTransactions.length > 0) {
    return true;
  }
  
  // Check for critical progression issues
  const { hasJournal } = useJournalStore.getState();
  const { currentDay } = useGameStore.getState();
  
  // If we're beyond day 1 and don't have a journal, that's a critical progression issue
  if (currentDay > 1 && !hasJournal) {
    return true;
  }
  
  // If dialogue state machine has an active flow but UI isn't showing it
  // (would need to be detected via a UI presence flag)
  const hasActiveDialogue = useDialogueStateMachine.getState().activeFlow !== null;
  const dialogueIsVisible = useGameStore.getState().isInDialogue; // Assuming this state exists
  
  if (hasActiveDialogue && !dialogueIsVisible) {
    return true;
  }
  
  return false;
}

/**
 * Creates a recovery plan based on detected issues
 */
export function createRecoveryPlan(): RecoveryPlan | null {
  // Detect issues
  const validationResult = validateNarrativeProgression();
  
  // If everything is valid, no recovery needed
  if (validationResult.isValid) {
    const transactions = useNarrativeTransaction.getState().getAllTransactions();
    const stalledTransactions = transactions.filter(tx => 
      tx.state === 'active' && (Date.now() - tx.startTime > 60000)
    );
    
    // If no stalled transactions either, truly no recovery needed
    if (stalledTransactions.length === 0) {
      return null;
    }
  }
  
  // Start building recovery plan
  const plan: RecoveryPlan = {
    requiredActions: []
  };
  
  // Check for journal issues
  const { hasJournal } = useJournalStore.getState();
  const { currentDay } = useGameStore.getState();
  
  // Journal is a prerequisite for progression
  if (currentDay >= 1 && !hasJournal) {
    plan.requiredActions.push('force_journal_acquisition');
    plan.characterId = 'kapoor'; // Journal always comes from Kapoor
  }
  
  // Check for specific failed checkpoints from validation
  if (validationResult.failedCheckpoints.length > 0) {
    validationResult.failedCheckpoints.forEach(checkpointId => {
      switch (checkpointId) {
        case 'journal-acquisition':
          if (!plan.requiredActions.includes('force_journal_acquisition')) {
            plan.requiredActions.push('force_journal_acquisition');
            plan.characterId = 'kapoor';
          }
          break;
          
        case 'equipment-safety-training':
          plan.requiredActions.push('grant_required_knowledge');
          plan.characterId = 'jesse';
          plan.requiredKnowledge = ['equipment_safety_protocol'];
          plan.nodeId = 'equipment-training';
          break;
          
        case 'quantum-theory-introduction':
          plan.requiredActions.push('grant_required_knowledge');
          plan.characterId = 'quinn';
          plan.requiredKnowledge = ['quantum_dosimetry_principles'];
          plan.nodeId = 'quantum-theory';
          break;
          
        case 'boss-preparation':
          plan.requiredActions.push('mark_node_completed');
          plan.nodeId = 'boss-preparation';
          // Use character with highest relationship
          const characters = ['kapoor', 'jesse', 'quinn'];
          let highestRelationship = '';
          let maxLevel = -1;
          
          characters.forEach(character => {
            const level = useGameStore.getState().getRelationshipLevel(character);
            if (level > maxLevel) {
              maxLevel = level;
              highestRelationship = character;
            }
          });
          
          plan.characterId = highestRelationship || 'kapoor';
          break;
      }
    });
  }
  
  // Check for stalled dialogue transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(tx => 
    tx.state === 'active' && (Date.now() - tx.startTime > 60000)
  );
  
  if (stalledTransactions.length > 0) {
    // Adding resume_dialogue might conflict with other critical paths
    // Only add if there are no more important recovery actions
    if (plan.requiredActions.length === 0) {
      plan.requiredActions.push('resume_dialogue');
      
      // Use info from the most recent stalled transaction
      const latestTransaction = stalledTransactions.reduce((latest, current) => 
        latest.startTime > current.startTime ? latest : current
      );
      
      plan.characterId = latestTransaction.character;
      plan.nodeId = latestTransaction.nodeId;
      plan.dialogueId = latestTransaction.id;
    }
    
    // Always complete stalled transactions
    stalledTransactions.forEach(tx => {
      useNarrativeTransaction.getState().completeTransaction(tx.id);
    });
  }
  
  // If dialogue state machine has an active flow but UI isn't showing it
  const hasActiveDialogue = useDialogueStateMachine.getState().activeFlow !== null;
  const dialogueIsVisible = useGameStore.getState().isInDialogue; // Assuming this state exists
  
  if (hasActiveDialogue && !dialogueIsVisible) {
    if (plan.requiredActions.length === 0) {
      // Only force resuming if no more important actions
      plan.requiredActions.push('resume_dialogue');
      
      // Get info from active flow
      const activeFlow = useDialogueStateMachine.getState().activeFlow;
      if (activeFlow) {
        plan.characterId = activeFlow.context?.characterId;
        plan.nodeId = activeFlow.context?.nodeId;
        plan.dialogueId = activeFlow.id;
      }
    } else {
      // If we're doing other recovery, make sure to clean up the active dialogue
      useDialogueStateMachine.getState().completeFlow();
    }
  }
  
  return plan.requiredActions.length > 0 ? plan : null;
}

/**
 * Executes a recovery plan to fix progression issues
 */
export function executeRecoveryPlan(plan: RecoveryPlan, interruptionType: InterruptionType = 'state_corruption'): boolean {
  if (!plan || plan.requiredActions.length === 0) {
    return false;
  }
  
  const eventBus = useEventBus.getState();
  
  // Create a transaction record
  const transactionId = `recovery-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const transaction: RecoveryTransaction = {
    id: transactionId,
    timestamp: Date.now(),
    interruptionType,
    recoveryActions: [...plan.requiredActions],
    characterId: plan.characterId,
    nodeId: plan.nodeId,
    dialogueId: plan.dialogueId,
    stateBeforeRecovery: {
      hasJournal: useJournalStore.getState().hasJournal,
      currentDay: useGameStore.getState().currentDay,
      hasActiveDialogue: useDialogueStateMachine.getState().activeFlow !== null
    },
    successful: false
  };
  
  // Log recovery attempt
  console.log(`[ProgressionRecovery] Executing recovery plan with ${plan.requiredActions.length} actions`, plan);
  
  // Track for analytics
  eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'progressionRecovery',
    action: 'recoveryAttempted',
    metadata: {
      actions: plan.requiredActions,
      characterId: plan.characterId,
      nodeId: plan.nodeId,
      interruptionType
    }
  });
  
  try {
    // Execute each required action
    for (const action of plan.requiredActions) {
      switch (action) {
        case 'force_journal_acquisition':
          if (!useJournalStore.getState().hasJournal) {
            console.log('[ProgressionRecovery] Forcing journal acquisition');
            
            // Determine appropriate journal tier
            const relationshipLevel = useGameStore.getState().getRelationshipLevel('kapoor');
            const journalTier = relationshipLevel >= 3 ? 'annotated' : 
                               relationshipLevel >= 1 ? 'technical' : 'base';
            
            // Initialize journal
            useJournalStore.getState().initializeJournal(journalTier);
            
            // Create transaction for tracking
            useNarrativeTransaction.getState().startTransaction(
              'journal_acquisition',
              { 
                source: 'progression_recovery',
                tier: journalTier,
                forced: true
              },
              'kapoor'
            );
            
            // Notify system
            eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
              tier: journalTier,
              character: 'kapoor',
              source: 'progression_recovery',
              forced: true
            });
          }
          break;
          
        case 'grant_required_knowledge':
          if (plan.requiredKnowledge && plan.characterId) {
            console.log(`[ProgressionRecovery] Granting required knowledge: ${plan.requiredKnowledge.join(', ')}`);
            
            // Grant each required knowledge concept
            plan.requiredKnowledge.forEach(conceptId => {
              useKnowledgeStore.getState().updateMastery(conceptId, 10);
              
              // Determine domain based on character or concept
              let domainId = 'general';
              switch (plan.characterId) {
                case 'kapoor': domainId = 'clinical'; break;
                case 'jesse': domainId = 'quality-assurance'; break;
                case 'quinn': domainId = 'theoretical'; break;
              }
              
              // Create transaction for tracking
              useNarrativeTransaction.getState().startTransaction(
                'knowledge_revelation',
                {
                  concept: conceptId,
                  domain: domainId,
                  source: 'progression_recovery'
                },
                plan.characterId,
                plan.nodeId
              );
              
              // Notify knowledge system
              eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
                conceptId,
                amount: 10,
                domainId,
                character: plan.characterId,
                source: 'progression_recovery'
              });
            });
          }
          break;
          
        case 'mark_node_completed':
          if (plan.nodeId) {
            console.log(`[ProgressionRecovery] Marking node as completed: ${plan.nodeId}`);
            
            // Mark node as completed
            useGameStore.getState().completeNode(plan.nodeId, {
              relationshipChange: 1,
              forced: true
            });
          }
          break;
          
        case 'resume_dialogue':
          if (plan.dialogueId && plan.characterId) {
            console.log(`[ProgressionRecovery] Resuming dialogue: ${plan.dialogueId}`);
            
            // First ensure any active dialogue is properly closed
            if (useDialogueStateMachine.getState().activeFlow) {
              useDialogueStateMachine.getState().completeFlow();
            }
            
            // Signal game to restart dialogue
            eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'progressionRecovery',
              action: 'restartDialogue',
              metadata: {
                characterId: plan.characterId,
                nodeId: plan.nodeId,
                dialogueId: plan.dialogueId,
                source: 'progression_recovery'
              }
            });
          }
          break;
          
        case 'force_critical_path':
          if (plan.characterId && plan.criticalPathId) {
            console.log(`[ProgressionRecovery] Forcing critical path: ${plan.criticalPathId}`);
            
            // Determine if this is a journal critical path
            if (plan.criticalPathId === 'journal-presentation') {
              // Only force if journal doesn't exist
              if (!useJournalStore.getState().hasJournal) {
                // Determine journal tier
                const relationshipLevel = useGameStore.getState().getRelationshipLevel('kapoor');
                const journalTier = relationshipLevel >= 3 ? 'annotated' : 
                                   relationshipLevel >= 1 ? 'technical' : 'base';
                
                // Initialize journal
                useJournalStore.getState().initializeJournal(journalTier);
                
                // Notify system
                eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
                  tier: journalTier,
                  character: 'kapoor',
                  source: 'progression_recovery',
                  forced: true
                });
              }
            }
            
            // Signal that critical path has been forced
            eventBus.dispatch(GameEventType.DIALOGUE_CRITICAL_PATH, {
              dialogueId: plan.dialogueId || `recovery-${Date.now()}`,
              characterId: plan.characterId,
              nodeId: plan.nodeId || 'unknown',
              criticalStateId: plan.criticalPathId,
              playerScore: 0, // Minimal score for forced progression
              wasRepaired: true
            });
          }
          break;
          
        case 'repair_relationship':
          if (plan.characterId) {
            console.log(`[ProgressionRecovery] Repairing relationship with: ${plan.characterId}`);
            
            // Add minimal relationship if none exists
            const currentRelationship = useGameStore.getState().getRelationshipLevel(plan.characterId);
            if (currentRelationship <= 0) {
              useGameStore.getState().updateRelationship(plan.characterId, 1);
            }
          }
          break;
          
        default:
          console.warn(`[ProgressionRecovery] Unhandled recovery action: ${action}`);
      }
    }
    
    // Update transaction with final state
    transaction.stateAfterRecovery = {
      hasJournal: useJournalStore.getState().hasJournal,
      currentDay: useGameStore.getState().currentDay,
      hasActiveDialogue: useDialogueStateMachine.getState().activeFlow !== null
    };
    transaction.successful = true;
    
    // Add to history
    recoveryHistory.push(transaction);
    
    // Log success
    console.log('[ProgressionRecovery] Recovery plan executed successfully');
    
    // Track for analytics
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'progressionRecovery',
      action: 'recoverySucceeded',
      metadata: {
        transactionId,
        actions: plan.requiredActions,
        characterId: plan.characterId,
        nodeId: plan.nodeId
      }
    });
    
    return true;
  } catch (error) {
    // Update transaction with error
    transaction.successful = false;
    transaction.stateAfterRecovery = { error: String(error) };
    
    // Add to history
    recoveryHistory.push(transaction);
    
    // Log error
    console.error('[ProgressionRecovery] Error executing recovery plan:', error);
    
    // Track for analytics
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'progressionRecovery',
      action: 'recoveryFailed',
      metadata: {
        transactionId,
        error: String(error),
        actions: plan.requiredActions,
        characterId: plan.characterId,
        nodeId: plan.nodeId
      }
    });
    
    return false;
  }
}

/**
 * Check for progression issues and automatically execute recovery if needed
 */
export function checkAndRepairProgression(): boolean {
  // First check if recovery is needed
  if (!detectProgressionIssues()) {
    return true; // No issues detected
  }
  
  // Create recovery plan
  const plan = createRecoveryPlan();
  
  // Execute plan if needed
  if (plan) {
    return executeRecoveryPlan(plan);
  }
  
  return true;
}

/**
 * Setup automatic progression checking
 */
export function setupProgressionRecovery(): () => void {
  const eventBus = useEventBus.getState();
  
  // Array to track subscription cleanup functions
  const cleanupFns: (() => void)[] = [];
  
  // Check at game load
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.SESSION_STARTED,
      () => {
        console.log('[ProgressionRecovery] Checking progression on game load');
        setTimeout(() => checkAndRepairProgression(), 1000);
      }
    )
  );
  
  // Check at day/night transitions
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.GAME_PHASE_CHANGED,
      (event) => {
        const { from, to } = event.payload;
        
        // When transitioning between day and night
        if ((from === 'day' && to === 'night') || (from === 'night' && to === 'day')) {
          console.log(`[ProgressionRecovery] Checking progression on ${from} → ${to} transition`);
          setTimeout(() => checkAndRepairProgression(), 1000);
        }
      }
    )
  );
  
  // Check for dialogue interruptions
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_COMPLETED,
      (event) => {
        const { completed, reason } = event.payload;
        
        // If dialogue was interrupted
        if (!completed) {
          console.log(`[ProgressionRecovery] Dialogue interrupted: ${reason}`);
          
          // Map reason to interruption type
          let interruptionType: InterruptionType = 'dialogue_unmount';
          if (reason === 'component_unmounted') interruptionType = 'dialogue_unmount';
          if (reason === 'browser_refresh') interruptionType = 'browser_refresh';
          if (reason === 'session_end') interruptionType = 'session_end';
          
          // Create recovery plan with specific information
          const plan = createRecoveryPlan();
          
          // Execute plan if needed
          if (plan) {
            executeRecoveryPlan(plan, interruptionType);
          }
        }
      }
    )
  );
  
  // Check periodically for stalled transactions
  const intervalId = setInterval(() => {
    // Check for stalled transactions
    const transactions = useNarrativeTransaction.getState().getAllTransactions();
    const stalledTransactions = transactions.filter(tx => 
      tx.state === 'active' && (Date.now() - tx.startTime > 300000) // Stalled for over 5 minutes
    );
    
    if (stalledTransactions.length > 0) {
      console.log(`[ProgressionRecovery] Found ${stalledTransactions.length} stalled transactions`);
      checkAndRepairProgression();
    }
  }, 60000); // Check every minute
  
  // Return cleanup function
  return () => {
    cleanupFns.forEach(cleanup => cleanup());
    clearInterval(intervalId);
  };
}

export default {
  detectProgressionIssues,
  createRecoveryPlan,
  executeRecoveryPlan,
  checkAndRepairProgression,
  setupProgressionRecovery,
  getRecoveryHistory: () => recoveryHistory,
};