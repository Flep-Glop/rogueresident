// app/core/dialogue/DialogueProgressionHelpers.ts
/**
 * Dialogue Progression Helpers
 * 
 * Utilities for ensuring reliable progression through critical dialogue paths,
 * with automatic repair mechanisms for broken state.
 */

import { useDialogueStateMachine } from './DialogueStateMachine';
import { useNarrativeTransaction } from './NarrativeTransaction';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { 
  useEventBus, 
  GameEventType, 
  journalAcquired 
} from '../events/CentralEventBus';

/**
 * Represents the status of a dialogue progression
 */
export interface DialogueProgressionStatus {
  isComplete: boolean;
  criticalPathsVisited: string[];
  missingPaths: string[];
  potentialIssues: string[];
  requiresRepair: boolean;
}

/**
 * Checks dialogue progression for completion of critical paths
 * @param characterId Character ID to check
 * @param nodeId Node ID being completed
 * @returns Progression status with repair information
 */
export function validateDialogueProgression(
  characterId: string,
  nodeId: string
): DialogueProgressionStatus {
  // Get current state and context from state machine
  const stateMachine = useDialogueStateMachine.getState();
  const context = stateMachine.context;
  
  if (!context) {
    return {
      isComplete: false,
      criticalPathsVisited: [],
      missingPaths: ['no_context_available'],
      potentialIssues: ['dialogue_state_missing_context'],
      requiresRepair: true
    };
  }
  
  // Get critical paths from context
  const criticalPathsVisited = Object.keys(context.criticalPathProgress || {})
    .filter(key => context.criticalPathProgress[key] === true);
  
  const potentialIssues: string[] = [];
  
  // Verify progression for specific characters
  const missingPaths: string[] = [];
  if (characterId === 'kapoor') {
    // For Kapoor, ensure journal presentation path was visited
    if (!criticalPathsVisited.some(path => path.includes('journal'))) {
      missingPaths.push('journal_presentation');
    }
    
    // Check for specific Kapoor progression points
    if (!criticalPathsVisited.some(path => path.includes('correct-ptp'))) {
      missingPaths.push('ptp_correction');
    }
    
    if (!criticalPathsVisited.some(path => path.includes('electron-equilibrium'))) {
      missingPaths.push('electron_equilibrium');
    }
  }
  
  // Look for stalled transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(
    tx => tx.state === 'in_progress' && Date.now() - tx.startTime > 10000
  );
  
  if (stalledTransactions.length > 0) {
    potentialIssues.push(`stalled_transactions: ${stalledTransactions.map(tx => tx.id).join(', ')}`);
  }
  
  // Check if repair is needed
  const requiresRepair = missingPaths.length > 0 || potentialIssues.length > 0;
  
  return {
    isComplete: missingPaths.length === 0,
    criticalPathsVisited,
    missingPaths,
    potentialIssues,
    requiresRepair
  };
}

/**
 * Repairs broken dialogue progression state
 * @param characterId Character ID to repair
 * @param nodeId Node ID being completed
 * @returns True if repair was successful
 */
export function repairDialogueProgression(
  characterId: string,
  nodeId: string
): boolean {
  console.warn(`[DIALOGUE REPAIR] Attempting to repair progression for ${characterId} in node ${nodeId}`);
  
  // Log repair attempt
  useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'dialogueRepair',
    action: 'repairAttempted',
    metadata: {
      character: characterId,
      nodeId
    }
  });
  
  // Character-specific repairs
  if (characterId === 'kapoor') {
    // Check if journal exists
    const { hasJournal } = useJournalStore.getState();
    
    // If this is a Kapoor node and journal doesn't exist, create it
    if (!hasJournal) {
      console.log('[DIALOGUE REPAIR] Forcing journal acquisition');
      
      // Determine journal tier based on any available relationship data
      const nodeHistory = useGameStore.getState().getNodeHistory(nodeId);
      const relationshipScore = nodeHistory?.relationshipScore || 0;
      const journalTier = relationshipScore >= 3 ? 'annotated' : 
                          relationshipScore >= 0 ? 'technical' : 'base';
      
      // Force journal acquisition
      useJournalStore.getState().initializeJournal(journalTier);
      
      // Dispatch journal acquisition event
      journalAcquired(
        journalTier,
        characterId,
        'dialogue_repair'
      );
      
      // Log repair action
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'dialogueRepair',
        action: 'journalForced',
        metadata: {
          character: characterId,
          nodeId,
          journalTier
        }
      });
      
      return true;
    }
  }
  
  // Complete any stalled transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(
    tx => tx.state === 'in_progress' && Date.now() - tx.startTime > 10000
  );
  
  if (stalledTransactions.length > 0) {
    console.log(`[DIALOGUE REPAIR] Completing ${stalledTransactions.length} stalled transactions`);
    
    stalledTransactions.forEach(tx => {
      useNarrativeTransaction.getState().completeTransaction(tx.id);
    });
    
    return true;
  }
  
  // If no specific repairs were needed/possible
  return false;
}

/**
 * Ensures a Kapoor dialogue has resulted in journal acquisition
 * @param journalTier The tier of journal to ensure
 * @param skipIfExists Skip if journal already exists
 * @returns True if journal was created or already existed
 */
export function ensureJournalAcquisition(
  journalTier: 'base' | 'technical' | 'annotated' = 'base',
  skipIfExists: boolean = true
): boolean {
  const { hasJournal } = useJournalStore.getState();
  
  // Skip if journal already exists and that's acceptable
  if (hasJournal && skipIfExists) {
    return true;
  }
  
  // Initialize the journal
  useJournalStore.getState().initializeJournal(journalTier);
  
  // Dispatch journal acquisition event
  journalAcquired(
    journalTier,
    'kapoor',
    'progression_guarantee'
  );
  
  // Log guarantee action
  useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'progressionGuarantee',
    action: 'journalGuaranteed',
    metadata: {
      journalTier,
      timestamp: Date.now()
    }
  });
  
  return true;
}

export default {
  validateDialogueProgression,
  repairDialogueProgression,
  ensureJournalAcquisition
};