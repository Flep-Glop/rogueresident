// app/core/dialogue/NarrativeTransaction.ts
/**
 * Streamlined Narrative Transaction System
 * 
 * A lightweight approach to ensuring critical narrative moments complete reliably.
 * Inspired by Supergiant's transaction system for progression-critical moments in Hades,
 * but simplified to focus on core reliability without excess complexity.
 * 
 * The key insight: Critical progression moments need only three states
 * (pending → active → completed) with repair logic separated from the core flow.
 */

import { useEventBus } from '../events';
import { GameEventType } from '../events/EventTypes';
import { create } from 'zustand';

// Simplified transaction states - reduced from 5 to 3 for clarity
export type TransactionState = 
  | 'pending'  // Transaction has not started
  | 'active'   // Transaction is in progress
  | 'completed'; // Transaction has completed successfully

// Transaction types for different critical progression points
export type NarrativeTransactionType = 
  | 'journal_acquisition'
  | 'character_introduction'
  | 'knowledge_revelation'
  | 'boss_encounter';

// Transaction data interface
export interface NarrativeTransaction {
  id: string;
  type: NarrativeTransactionType;
  state: TransactionState;
  metadata: Record<string, any>;
  startTime: number;
  completionTime?: number;
  character?: string;
  nodeId?: string;
}

// Transaction store interface
interface TransactionStoreState {
  // Active transactions
  transactions: NarrativeTransaction[];
  
  // Transaction lifecycle methods
  startTransaction: (type: NarrativeTransactionType, metadata: Record<string, any>, character?: string, nodeId?: string) => string;
  completeTransaction: (transactionId: string) => boolean;
  cancelTransaction: (transactionId: string) => void;
  
  // Transaction retrieval
  getActiveTransaction: (type: NarrativeTransactionType) => NarrativeTransaction | null;
  getTransactionById: (id: string) => NarrativeTransaction | null;
  getAllTransactions: () => NarrativeTransaction[];
  
  // Integrity checks - separated from core logic
  validateTransactionIntegrity: () => { isValid: boolean; issues: string[] };
  repairStuckTransactions: () => number;
  
  // Debug methods
  clearAllTransactions: () => void;
}

/**
 * Safely dispatch events with error handling
 */
function safeEventDispatch(eventType: GameEventType, payload: any, source?: string) {
  try {
    const eventBus = useEventBus.getState();
    if (eventBus && typeof eventBus.dispatch === 'function') {
      eventBus.dispatch(eventType, payload, source || 'narrativeTransaction');
    }
  } catch (error) {
    console.error(`[Transaction] Error dispatching ${eventType}:`, error);
    // Continue execution despite event error
  }
}

// Create transaction store
export const useNarrativeTransaction = create<TransactionStoreState>((set, get) => ({
  transactions: [],
  
  startTransaction: (type, metadata, character, nodeId) => {
    try {
      // Generate unique ID
      const id = `${type.split('_')[0]}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create new transaction
      const transaction: NarrativeTransaction = {
        id,
        type,
        state: 'active',
        metadata,
        startTime: Date.now(),
        character,
        nodeId
      };
      
      // Add to transactions list
      set(state => ({
        transactions: [...state.transactions, transaction]
      }));
      
      // Log transaction start
      console.log(`[Transaction] Started: ${type}`, metadata);
      
      // Emit event for tracking
      safeEventDispatch(
        GameEventType.PROGRESSION_TRANSACTION_STARTED,
        {
          transactionId: id,
          type,
          character,
          nodeId,
          metadata
        },
        'narrativeTransaction:start'
      );
      
      return id;
    } catch (error) {
      console.error(`[Transaction] Error starting transaction:`, error);
      // Return a fallback ID to maintain flow
      return `error-${Date.now()}`;
    }
  },
  
  completeTransaction: (transactionId) => {
    try {
      // Find transaction
      const transaction = get().getTransactionById(transactionId);
      
      if (!transaction) {
        console.warn(`[Transaction] Cannot complete unknown transaction: ${transactionId}`);
        return false;
      }
      
      // Skip if already completed
      if (transaction.state === 'completed') {
        console.log(`[Transaction] Transaction already completed: ${transactionId}`);
        return true;
      }
      
      // Update transaction state
      set(state => ({
        transactions: state.transactions.map(t => 
          t.id === transactionId 
            ? { 
                ...t, 
                state: 'completed',
                completionTime: Date.now()
              } 
            : t
        )
      }));
      
      // Log completion
      console.log(`[Transaction] Completed: ${transaction.type}`, {
        duration: Date.now() - transaction.startTime,
        character: transaction.character,
        nodeId: transaction.nodeId
      });
      
      // Emit completion event
      safeEventDispatch(
        GameEventType.PROGRESSION_TRANSACTION_COMPLETED,
        {
          transactionId,
          type: transaction.type,
          duration: Date.now() - transaction.startTime,
          character: transaction.character,
          nodeId: transaction.nodeId,
          metadata: transaction.metadata
        },
        'narrativeTransaction:complete'
      );
      
      return true;
    } catch (error) {
      console.error(`[Transaction] Error completing transaction:`, error);
      return false;
    }
  },
  
  cancelTransaction: (transactionId) => {
    try {
      // Find transaction for logging purposes
      const transaction = get().getTransactionById(transactionId);
      
      // Remove transaction
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== transactionId)
      }));
      
      // Log cancellation
      console.log(`[Transaction] Cancelled: ${transactionId}`, 
                  transaction ? { type: transaction.type } : {});
                  
      // Emit cancellation event
      if (transaction) {
        safeEventDispatch(
          GameEventType.PROGRESSION_TRANSACTION_CANCELLED,
          {
            transactionId,
            type: transaction.type,
            character: transaction.character,
            nodeId: transaction.nodeId
          },
          'narrativeTransaction:cancel'
        );
      }
    } catch (error) {
      console.error(`[Transaction] Error cancelling transaction:`, error);
    }
  },
  
  getActiveTransaction: (type) => {
    try {
      return get().transactions.find(t => 
        t.type === type && 
        t.state === 'active'
      ) || null;
    } catch (error) {
      console.error(`[Transaction] Error getting active transaction:`, error);
      return null;
    }
  },
  
  getTransactionById: (id) => {
    try {
      return get().transactions.find(t => t.id === id) || null;
    } catch (error) {
      console.error(`[Transaction] Error getting transaction by ID:`, error);
      return null;
    }
  },
  
  getAllTransactions: () => {
    try {
      return get().transactions;
    } catch (error) {
      console.error(`[Transaction] Error getting all transactions:`, error);
      return [];
    }
  },
  
  validateTransactionIntegrity: () => {
    try {
      const transactions = get().transactions;
      const issues: string[] = [];
      
      // Identify stuck active transactions
      const stuckTransactions = transactions.filter(t => 
        t.state === 'active' && 
        (Date.now() - t.startTime > 30000) // Stuck for over 30 seconds
      );
      
      stuckTransactions.forEach(t => {
        issues.push(`Transaction ${t.id} (${t.type}) stuck in active state for ${Math.round((Date.now() - t.startTime) / 1000)}s`);
      });
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error(`[Transaction] Error validating transaction integrity:`, error);
      return {
        isValid: false,
        issues: [`Error validating transactions: ${error}`]
      };
    }
  },
  
  // Repair any stuck transactions
  repairStuckTransactions: () => {
    try {
      const transactions = get().transactions;
      let repairCount = 0;
      
      // Find stuck transactions
      const stuckTransactions = transactions.filter(t => 
        t.state === 'active' && 
        (Date.now() - t.startTime > 30000) // Stuck for over 30 seconds
      );
      
      // Auto-complete them
      stuckTransactions.forEach(t => {
        console.warn(`[Transaction] Repairing stuck transaction: ${t.id} (${t.type})`);
        
        // Complete the transaction
        get().completeTransaction(t.id);
        repairCount++;
        
        // Log the repair
        safeEventDispatch(
          GameEventType.PROGRESSION_TRANSACTION_REPAIRED,
          {
            transactionId: t.id,
            type: t.type,
            stuckDuration: Date.now() - t.startTime,
            character: t.character,
            nodeId: t.nodeId
          },
          'narrativeTransaction:repair'
        );
      });
      
      return repairCount;
    } catch (error) {
      console.error(`[Transaction] Error repairing stuck transactions:`, error);
      return 0;
    }
  },
  
  clearAllTransactions: () => {
    try {
      set({ transactions: [] });
    } catch (error) {
      console.error(`[Transaction] Error clearing transactions:`, error);
    }
  }
}));

/**
 * Helper function for journal acquisition with minimal overhead
 */
export function startJournalAcquisition(
  character: string, 
  nodeId: string,
  journalTier: 'base' | 'technical' | 'annotated' = 'base'
): string {
  try {
    const transaction = useNarrativeTransaction.getState();
    if (!transaction) {
      console.error('[Transaction] Transaction store not available');
      return `error-${Date.now()}`;
    }
    
    return transaction.startTransaction(
      'journal_acquisition',
      {
        journalTier,
        timestamp: Date.now()
      },
      character,
      nodeId
    );
  } catch (error) {
    console.error('[Transaction] Error starting journal acquisition:', error);
    // Return a fallback ID to maintain flow
    return `error-${Date.now()}`;
  }
}

/**
 * Simplified progression integrity check - focused on transaction health only
 */
export function checkTransactionIntegrity(): boolean {
  try {
    const transactionStore = useNarrativeTransaction.getState();
    if (!transactionStore) {
      console.error('[Transaction] Transaction store not available');
      return false;
    }
    
    // Validate transactions
    const validation = transactionStore.validateTransactionIntegrity();
    
    // If valid, no repair needed
    if (validation.isValid) {
      return true;
    }
    
    // Log issues found
    console.warn(`[Transaction] Integrity issues found: ${validation.issues.length}`);
    validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    
    // Attempt repair
    const repairCount = transactionStore.repairStuckTransactions();
    
    // Log repair results
    console.log(`[Transaction] Repaired ${repairCount} stuck transactions`);
    
    // Return success status
    return repairCount === validation.issues.length;
  } catch (error) {
    console.error('[Transaction] Error checking transaction integrity:', error);
    return false;
  }
}

// Make sure these event types are defined in GameEventType enum
// Add this to ensure your GameEventType.ts file includes these event types
// GameEventType.PROGRESSION_TRANSACTION_STARTED = 'progression:transaction:started'
// GameEventType.PROGRESSION_TRANSACTION_COMPLETED = 'progression:transaction:completed'
// GameEventType.PROGRESSION_TRANSACTION_CANCELLED = 'progression:transaction:cancelled'
// GameEventType.PROGRESSION_TRANSACTION_REPAIRED = 'progression:transaction:repaired'

export default {
  useNarrativeTransaction,
  startJournalAcquisition,
  checkTransactionIntegrity
};