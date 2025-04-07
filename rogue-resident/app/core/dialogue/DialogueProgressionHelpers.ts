// app/core/dialogue/DialogueProgressionHelpers.ts

/**
 * Dialogue Progression Helpers
 * 
 * Utilities for validating, repairing, and ensuring critical dialogue progression.
 * These helpers ensure that narrative transactions complete even in edge cases
 * like dialogue interruption or state corruption.
 * 
 * Inspired by the dialogue progression repair system used in Hades, which ensured
 * players never got stuck in critical path conversations.
 */

import { useDialogueStateMachine } from './DialogueStateMachine';
import { useNarrativeTransaction } from './NarrativeTransaction';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { useEventBus } from '../events/CentralEventBus';
import { GameEventType } from '../events/EventTypes';

/**
 * Represents the status of a dialogue progression
 */
interface DialogueProgressionStatus {
  requiresRepair: boolean;
  missingJournal?: boolean;
  missingCriticalContent?: boolean;
  missingTransactions?: string[];
  corruptedState?: boolean;
  repairAttempts?: number;
  recommendations?: string[];
}

/**
 * Validate the progression state for a character's dialogue
 * 
 * This checks for missing or corrupted state that would prevent
 * the player from progressing through critical dialogue paths.
 * 
 * @param characterId The character ID to validate
 * @param nodeId The node ID where the dialogue occurs
 * @returns Progression status with repair recommendations
 */
export function validateDialogueProgression(
  characterId: string,
  nodeId: string
): DialogueProgressionStatus {
  // Initialize status
  const status: DialogueProgressionStatus = {
    requiresRepair: false,
    repairAttempts: 0,
    recommendations: []
  };
  
  // Get current states from various stores
  const journalStore = useJournalStore.getState();
  const dialogueState = useDialogueStateMachine.getState();
  const narrativeTransaction = useNarrativeTransaction.getState();
  
  // Check 1: If this is Kapoor and player doesn't have journal, that's a critical issue
  if (characterId === 'kapoor' && !journalStore.hasJournal) {
    status.requiresRepair = true;
    status.missingJournal = true;
    status.recommendations?.push('Force journal acquisition for player');
  }
  
  // Check 2: Detect dialogue state corruption (rare)
  if (dialogueState.isActive && dialogueState.context?.characterId === characterId) {
    // Check for stalled active dialogue that's not progressing
    if (dialogueState.loopCount > 5) {
      status.requiresRepair = true;
      status.corruptedState = true;
      status.recommendations?.push('Reset dialogue state machine for this character');
    }
  }
  
  // Check 3: Check for dangling transactions that never completed
  const activeTransactions = narrativeTransaction.getActiveTransactions();
  const characterTransactions = activeTransactions.filter(tx => 
    tx.contextMetadata.characterId === characterId &&
    tx.contextMetadata.nodeId === nodeId
  );
  
  if (characterTransactions.length > 0) {
    status.requiresRepair = true;
    status.missingTransactions = characterTransactions.map(tx => tx.id);
    status.recommendations?.push(`Complete ${characterTransactions.length} pending transactions`);
  }
  
  return status;
}

/**
 * Repair dialogue progression issues for a character
 * 
 * This attempts to fix issues identified by validateDialogueProgression
 * to ensure the player doesn't get stuck in a broken state.
 * 
 * @param characterId The character ID to repair
 * @param nodeId The node ID where the dialogue occurs
 * @returns Whether the repair attempt was successful
 */
export function repairDialogueProgression(
  characterId: string,
  nodeId: string
): boolean {
  // First validate to confirm issues
  const status = validateDialogueProgression(characterId, nodeId);
  
  // If no repair needed, just return success
  if (!status.requiresRepair) {
    console.log('[DialogueRepair] No repair needed for', characterId, nodeId);
    return true;
  }
  
  console.warn('[DialogueRepair] Attempting to repair dialogue progression for', characterId, nodeId);
  let repairSuccessful = true;
  
  // Get stores for repair operations
  const journalStore = useJournalStore.getState();
  const dialogueState = useDialogueStateMachine.getState();
  const narrativeTransaction = useNarrativeTransaction.getState();
  const eventBus = useEventBus.getState();
  
  // REPAIR 1: Missing journal from Kapoor
  if (status.missingJournal && characterId === 'kapoor') {
    console.warn('[DialogueRepair] Forcing journal acquisition');
    
    // Force journal acquisition
    const journalTier = 'technical'; // Default to middle tier for safety
    journalStore.initializeJournal(journalTier);
    
    // Notify systems about this repair
    eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
      tier: journalTier,
      character: characterId,
      source: 'progression_repair'
    });
    
    // Mark node as completed to allow progression
    useGameStore.getState().completeNode(nodeId, {
      relationshipChange: 0,
      dialogueCompleted: true
    });
  }
  
  // REPAIR 2: Fix corrupted dialogue state
  if (status.corruptedState) {
    console.warn('[DialogueRepair] Resetting corrupted dialogue state');
    
    // Force dialogue completion to clean up state
    if (dialogueState.isActive && dialogueState.activeFlow) {
      dialogueState.completeFlow();
      
      // Notify systems
      eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
        flowId: dialogueState.activeFlow.id,
        completed: true,
        reason: 'progression_repair',
        character: characterId,
        nodeId
      });
    }
  }
  
  // REPAIR 3: Complete dangling transactions
  if (status.missingTransactions && status.missingTransactions.length > 0) {
    console.warn('[DialogueRepair] Completing dangling transactions:', status.missingTransactions);
    
    // Complete each transaction
    status.missingTransactions.forEach(txId => {
      try {
        narrativeTransaction.completeTransaction(txId);
      } catch (error) {
        console.error('[DialogueRepair] Failed to complete transaction', txId, error);
        repairSuccessful = false;
      }
    });
  }
  
  // Log the repair attempt
  console.log(
    '[DialogueRepair] Repair attempt ' + 
    (repairSuccessful ? 'succeeded' : 'partially failed') + 
    ' for ' + characterId
  );
  
  return repairSuccessful;
}

/**
 * Ensure journal acquisition for a player
 * 
 * This is a critical progression guarantor that ensures the player
 * always has a journal, even if the normal acquisition path fails.
 * 
 * @param characterId The character providing the journal (should be kapoor)
 * @param nodeId The node where the journal is given
 * @returns Whether an intervention was needed
 */
export function ensureJournalAcquisition(
  characterId: string = 'kapoor',
  nodeId: string = 'unknown'
): boolean {
  const journalStore = useJournalStore.getState();
  
  // If journal already exists, no action needed
  if (journalStore.hasJournal) {
    return false;
  }
  
  console.warn('[ProgressionGuarantor] Journal missing - forcing acquisition');
  
  // Force journal at technical tier
  const journalTier = 'technical';
  journalStore.initializeJournal(journalTier);
  
  // Log this intervention
  useEventBus.getState().dispatch(GameEventType.JOURNAL_ACQUIRED, {
    tier: journalTier,
    character: characterId,
    source: 'guarantor_intervention',
    nodeId
  });
  
  return true;
}

export default {
  validateDialogueProgression,
  repairDialogueProgression,
  ensureJournalAcquisition
};