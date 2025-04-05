// app/core/progression/ProgressionGuarantee.ts
/**
 * Unified Progression Guarantor System
 * 
 * A consolidated approach to progression safety that focuses on telemetry-driven
 * issue detection rather than multiple redundant checks. This design draws from
 * Supergiant's approach to progression reliability in Hades, where a single robust
 * system with good debugging tools proved more effective than multiple fallbacks.
 */

import React, { useEffect } from 'react';
import { 
  useEventBus, 
  GameEventType, 
  journalAcquired 
} from '../events/CentralEventBus';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { 
  checkTransactionIntegrity 
} from '../dialogue/NarrativeTransaction';

// Define progression checkpoint interface
export interface ProgressionCheckpoint {
  id: string;
  description: string;
  condition: () => boolean;
  repair: () => void;
  isBlocking: boolean; // Whether this blocks game progression entirely
  lastChecked?: number;
  lastRepaired?: number;
}

// Define node progress type for type safety
export interface NodeProgress {
  id: string;
  completed: boolean;
  grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  timestamp?: number;
}

// Define critical progression events that must succeed
const CRITICAL_PROGRESSION_POINTS = [
  'journal_acquisition',
  'boss_defeat'
];

// Create a registry of progression checkpoints
const progressionRegistry = new Map<string, ProgressionCheckpoint>();

/**
 * Register a checkpoint in the progression system
 */
export function registerProgressionCheckpoint(checkpoint: ProgressionCheckpoint): void {
  progressionRegistry.set(checkpoint.id, checkpoint);
}

// Set up initial checkpoints

// Journal acquisition after Kapoor calibration
registerProgressionCheckpoint({
  id: 'journal-acquisition',
  description: 'Journal must be acquired after completing Kapoor calibration',
  isBlocking: true,
  condition: () => {
    const { hasJournal } = useJournalStore.getState();
    const gameState = useGameStore.getState();
    
    // Find if Kapoor calibration node has been completed
    const completedNodes = gameState.completedNodeIds || [];
    const hasCompletedKapoorNode = completedNodes.some(
      (nodeId: string) => nodeId.includes('kapoor') && nodeId.includes('calibration')
    );
    
    // If player has completed Kapoor node but doesn't have journal, repair needed
    return hasCompletedKapoorNode && !hasJournal;
  },
  repair: () => {
    // Force journal acquisition
    console.warn('[Progression] Missing journal after Kapoor node - forcing repair');
    
    // Assign base journal as a fallback
    useJournalStore.getState().initializeJournal('base');
    
    // Dispatch journal acquisition event
    journalAcquired('base', 'kapoor', 'progression_repair');
    
    // Log the repair
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'progressionGuarantor',
      action: 'journalRepaired',
      metadata: {
        source: 'progression_repair',
        forced: true,
        journalTier: 'base',
        characterId: 'kapoor'
      }
    });
  }
});

/**
 * Run a thorough progression integrity check
 * 
 * @returns Object with check results and repairs performed
 */
export function runProgressionCheck() {
  console.log('[Progression] Running integrity check');
  
  const results = {
    issuesFound: 0,
    repairsMade: 0,
    details: [] as string[]
  };
  
  // Check transaction integrity first
  const transactionCheck = checkTransactionIntegrity();
  if (!transactionCheck) {
    results.issuesFound++;
    results.details.push('Transaction integrity check failed');
  }
  
  // Check all registered progression checkpoints
  for (const checkpoint of progressionRegistry.values()) {
    // Update last checked timestamp
    checkpoint.lastChecked = Date.now();
    
    // Check if this checkpoint indicates a problem
    const needsRepair = checkpoint.condition();
    
    if (needsRepair) {
      results.issuesFound++;
      results.details.push(`Checkpoint "${checkpoint.id}" failed: ${checkpoint.description}`);
      
      // Apply repair
      checkpoint.repair();
      
      // Update repair timestamp
      checkpoint.lastRepaired = Date.now();
      results.repairsMade++;
      
      // Log repair to analytics
      useEventBus.getState().dispatch(GameEventType.PROGRESSION_REPAIR, {
        checkpointId: checkpoint.id,
        description: checkpoint.description,
        forced: true
      });
    }
  }
  
  // Log results
  if (results.issuesFound > 0) {
    console.warn(`[Progression] Found ${results.issuesFound} issues, made ${results.repairsMade} repairs`);
    console.warn(results.details);
  } else {
    console.log(`[Progression] All progression checks passed`);
  }
  
  return results;
}

/**
 * Set up event listeners for automatic progression checks
 */
export function initializeProgressionGuarantor() {
  const unsubscribers: Array<() => void> = [];
  
  // Run a check after completing key nodes
  unsubscribers.push(
    useEventBus.getState().subscribe(GameEventType.NODE_COMPLETED, (event) => {
      const payload = event.payload;
      
      // For critical nodes, run progression checks after completion
      if (typeof payload === 'object' && payload !== null) {
        const nodeId = (payload as { nodeId?: string }).nodeId;
        const character = (payload as { character?: string }).character;
        
        if (
          (character === 'kapoor' && nodeId && nodeId.includes('calibration')) ||
          (nodeId && nodeId.includes('boss'))
        ) {
          // Short delay to allow normal acquisition flow to complete
          setTimeout(runProgressionCheck, 500);
        }
      }
    })
  );
  
  // Check at day/night transitions
  unsubscribers.push(
    useEventBus.getState().subscribe(
      GameEventType.NIGHT_STARTED,
      () => {
        // Natural integrity check point
        runProgressionCheck();
      }
    )
  );
  
  // Listen for failure events
  unsubscribers.push(
    useEventBus.getState().subscribe(
      GameEventType.UI_BUTTON_CLICKED,
      (event) => {
        const { componentId, action } = event.payload;
        if (
          (componentId === 'dialogueFlow' && action === 'progressionIssueDetected') ||
          (action === 'transactionFailed')
        ) {
          // Attempt immediate repair
          setTimeout(runProgressionCheck, 100);
        }
      }
    )
  );
  
  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
}

/**
 * Run a progression check at strategic times
 */
export function useProgressionSafety() {
  // Run check on component mount
  useEffect(() => {
    // Short delay to ensure stores are initialized
    const initialCheckTimer = setTimeout(runProgressionCheck, 1000);
    
    // Set up event listeners
    const cleanup = initializeProgressionGuarantor();
    
    // Clean up on unmount
    return () => {
      clearTimeout(initialCheckTimer);
      cleanup();
    };
  }, []);
}

/**
 * Component wrapper that ensures progression integrity
 */
export function withProgressionSafety<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function ProgressionSafetyWrapper(props: P) {
    useProgressionSafety();
    return <Component {...props} />;
  };
}

/**
 * Return the current status of all progression checkpoints
 * Useful for debugging and telemetry
 */
export function getProgressionStatus() {
  const checkpoints: Record<string, {
    id: string;
    description: string;
    isMet: boolean;
    isBlocking: boolean;
    lastChecked?: number;
    lastRepaired?: number;
  }> = {};
  
  // Check each checkpoint's current status
  for (const [id, checkpoint] of progressionRegistry.entries()) {
    checkpoints[id] = {
      id,
      description: checkpoint.description,
      isMet: !checkpoint.condition(), // Not needing repair means condition is met
      isBlocking: checkpoint.isBlocking,
      lastChecked: checkpoint.lastChecked,
      lastRepaired: checkpoint.lastRepaired
    };
  }
  
  return {
    checkpoints,
    allCriticalPointsMet: Object.values(checkpoints)
      .filter(cp => cp.isBlocking)
      .every(cp => cp.isMet)
  };
}

// Create a debug hook for development use
export function useProgressionDebug() {
  const [status, setStatus] = useState(getProgressionStatus());
  
  // Update status on mount and when requested
  useEffect(() => {
    setStatus(getProgressionStatus());
    
    // Listen for repair events
    const unsubscribe = useEventBus.getState().subscribe(
      GameEventType.PROGRESSION_REPAIR,
      () => {
        // Update status after repair
        setStatus(getProgressionStatus());
      }
    );
    
    return unsubscribe;
  }, []);
  
  return {
    status,
    runCheck: () => {
      const results = runProgressionCheck();
      setStatus(getProgressionStatus());
      return results;
    }
  };
}

export default {
  runProgressionCheck,
  initializeProgressionGuarantor,
  useProgressionSafety,
  withProgressionSafety,
  registerProgressionCheckpoint,
  getProgressionStatus,
  useProgressionDebug
};