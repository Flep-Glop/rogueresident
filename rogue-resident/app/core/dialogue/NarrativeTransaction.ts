// app/core/dialogue/NarrativeTransaction.ts
/**
 * Narrative Transaction Pattern
 * 
 * This pattern ensures that critical narrative moments (like journal acquisition)
 * are treated as atomic transactions with explicit states to prevent progression issues.
 * 
 * Inspired by transaction patterns in roguelikes where critical progression items
 * must be consistently and reliably delivered to the player regardless of state disruption.
 */

import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { create } from 'zustand';

// Transaction states for finite state tracking
export type TransactionState = 
  | 'pending'       // Transaction has not started
  | 'in_progress'   // Transaction has started but not completed
  | 'validating'    // Verifying that the transaction completed correctly
  | 'completed'     // Transaction completed successfully
  | 'failed';       // Transaction failed and needs repair

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
  retryCount: number;
  character?: string;
  nodeId?: string;
}

// Transaction store interface
interface TransactionStoreState {
  // Active transactions
  transactions: NarrativeTransaction[];

  // Transaction methods
  startTransaction: (type: NarrativeTransactionType, metadata: Record<string, any>, character?: string, nodeId?: string) => string;
  completeTransaction: (transactionId: string) => boolean;
  failTransaction: (transactionId: string, reason: string) => void;
  retryTransaction: (transactionId: string) => boolean;
  
  // Transaction retrieval
  getActiveTransaction: (type: NarrativeTransactionType) => NarrativeTransaction | null;
  getTransactionById: (id: string) => NarrativeTransaction | null;
  
  // Debug methods
  getAllTransactions: () => NarrativeTransaction[];
  clearAllTransactions: () => void;
}

// Create transaction store
export const useNarrativeTransaction = create<TransactionStoreState>((set, get) => ({
  transactions: [],
  
  startTransaction: (type, metadata, character, nodeId) => {
    // Generate unique ID
    const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create new transaction
    const transaction: NarrativeTransaction = {
      id,
      type,
      state: 'in_progress',
      metadata,
      startTime: Date.now(),
      retryCount: 0,
      character,
      nodeId
    };
    
    // Add to transactions list
    set(state => ({
      transactions: [...state.transactions, transaction]
    }));
    
    // Log transaction start
    console.log(`[NarrativeTransaction] Started: ${type}`, metadata);
    
    // Emit event for tracking
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'narrativeTransaction',
      action: 'transactionStarted',
      metadata: {
        transactionId: id,
        type,
        character,
        nodeId
      }
    });
    
    return id;
  },
  
  completeTransaction: (transactionId) => {
    // Find transaction
    const transaction = get().getTransactionById(transactionId);
    
    if (!transaction) {
      console.warn(`[NarrativeTransaction] Cannot complete unknown transaction: ${transactionId}`);
      return false;
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
    console.log(`[NarrativeTransaction] Completed: ${transaction.type}`, transaction.metadata);
    
    // Emit completion event
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'narrativeTransaction',
      action: 'transactionCompleted',
      metadata: {
        transactionId,
        type: transaction.type,
        duration: Date.now() - transaction.startTime,
        character: transaction.character,
        nodeId: transaction.nodeId
      }
    });
    
    return true;
  },
  
  failTransaction: (transactionId, reason) => {
    // Find transaction
    const transaction = get().getTransactionById(transactionId);
    
    if (!transaction) {
      console.warn(`[NarrativeTransaction] Cannot fail unknown transaction: ${transactionId}`);
      return;
    }
    
    // Update transaction state
    set(state => ({
      transactions: state.transactions.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              state: 'failed',
              metadata: {
                ...t.metadata,
                failureReason: reason
              }
            } 
          : t
      )
    }));
    
    // Log failure
    console.error(`[NarrativeTransaction] Failed: ${transaction.type}`, reason, transaction.metadata);
    
    // Emit failure event
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'narrativeTransaction',
      action: 'transactionFailed',
      metadata: {
        transactionId,
        reason,
        type: transaction.type,
        character: transaction.character,
        nodeId: transaction.nodeId
      }
    });
  },
  
  retryTransaction: (transactionId) => {
    // Find transaction
    const transaction = get().getTransactionById(transactionId);
    
    if (!transaction) {
      console.warn(`[NarrativeTransaction] Cannot retry unknown transaction: ${transactionId}`);
      return false;
    }
    
    if (transaction.state !== 'failed') {
      console.warn(`[NarrativeTransaction] Cannot retry transaction in state: ${transaction.state}`);
      return false;
    }
    
    // Update transaction state to retry
    set(state => ({
      transactions: state.transactions.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              state: 'in_progress',
              retryCount: t.retryCount + 1
            } 
          : t
      )
    }));
    
    // Log retry
    console.log(`[NarrativeTransaction] Retrying: ${transaction.type} (attempt ${transaction.retryCount + 1})`, transaction.metadata);
    
    // Emit retry event
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'narrativeTransaction',
      action: 'transactionRetry',
      metadata: {
        transactionId,
        type: transaction.type,
        attemptNumber: transaction.retryCount + 1,
        character: transaction.character,
        nodeId: transaction.nodeId
      }
    });
    
    return true;
  },
  
  getActiveTransaction: (type) => {
    return get().transactions.find(t => 
      t.type === type && 
      (t.state === 'in_progress' || t.state === 'validating')
    ) || null;
  },
  
  getTransactionById: (id) => {
    return get().transactions.find(t => t.id === id) || null;
  },
  
  getAllTransactions: () => {
    return get().transactions;
  },
  
  clearAllTransactions: () => {
    set({ transactions: [] });
  }
}));

/**
 * Specialized helper for journal acquisition transactions
 */
export function startJournalAcquisition(
  character: string, 
  nodeId: string,
  journalTier: 'base' | 'technical' | 'annotated' = 'base'
): string {
  return useNarrativeTransaction.getState().startTransaction(
    'journal_acquisition',
    {
      journalTier,
      relationshipLevel: journalTier === 'annotated' ? 'high' : 
                        journalTier === 'technical' ? 'medium' : 'low'
    },
    character,
    nodeId
  );
}

/**
 * Validate that all required narrative transactions have completed
 */
export function validateCriticalTransactions(): { valid: boolean; issues: string[] } {
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const issues: string[] = [];
  
  // Check for failed or stuck transactions
  transactions.forEach(transaction => {
    if (transaction.state === 'failed') {
      issues.push(`Transaction ${transaction.id} (${transaction.type}) failed: ${transaction.metadata.failureReason || 'unknown reason'}`);
    } else if (transaction.state === 'in_progress' && Date.now() - transaction.startTime > 30000) {
      // Transaction has been in_progress for more than 30 seconds
      issues.push(`Transaction ${transaction.id} (${transaction.type}) appears to be stuck in progress`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
}

export default {
  useNarrativeTransaction,
  startJournalAcquisition,
  validateCriticalTransactions
};