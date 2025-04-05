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

import { useEventBus, GameEventType } from '../events/CentralEventBus';
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

// Create transaction store
export const useNarrativeTransaction = create<TransactionStoreState>((set, get) => ({
  transactions: [],
  
  startTransaction: (type, metadata, character, nodeId) => {
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
  
  cancelTransaction: (transactionId) => {
    // Find and remove transaction
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== transactionId)
    }));
    
    // Log cancellation
    console.log(`[Transaction] Cancelled: ${transactionId}`);
  },
  
  getActiveTransaction: (type) => {
    return get().transactions.find(t => 
      t.type === type && 
      t.state === 'active'
    ) || null;
  },
  
  getTransactionById: (id) => {
    return get().transactions.find(t => t.id === id) || null;
  },
  
  getAllTransactions: () => {
    return get().transactions;
  },
  
  validateTransactionIntegrity: () => {
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
  },
  
  // Repair any stuck transactions
  repairStuckTransactions: () => {
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
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'narrativeTransaction',
        action: 'transactionRepaired',
        metadata: {
          transactionId: t.id,
          type: t.type,
          stuckDuration: Date.now() - t.startTime,
          character: t.character,
          nodeId: t.nodeId
        }
      });
    });
    
    return repairCount;
  },
  
  clearAllTransactions: () => {
    set({ transactions: [] });
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
  return useNarrativeTransaction.getState().startTransaction(
    'journal_acquisition',
    {
      journalTier,
      timestamp: Date.now()
    },
    character,
    nodeId
  );
}

/**
 * Simplified progression integrity check - focused on transaction health only
 */
export function checkTransactionIntegrity(): boolean {
  const { validateTransactionIntegrity, repairStuckTransactions } = useNarrativeTransaction.getState();
  
  // Validate transactions
  const validation = validateTransactionIntegrity();
  
  // If valid, no repair needed
  if (validation.isValid) {
    return true;
  }
  
  // Log issues found
  console.warn(`[Transaction] Integrity issues found: ${validation.issues.length}`);
  validation.issues.forEach(issue => console.warn(`  - ${issue}`));
  
  // Attempt repair
  const repairCount = repairStuckTransactions();
  
  // Log repair results
  console.log(`[Transaction] Repaired ${repairCount} stuck transactions`);
  
  // Return success status
  return repairCount === validation.issues.length;
}

export default {
  useNarrativeTransaction,
  startJournalAcquisition,
  checkTransactionIntegrity
};