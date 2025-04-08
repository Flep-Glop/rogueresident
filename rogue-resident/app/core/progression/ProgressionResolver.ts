// app/core/progression/ProgressionResolver.ts
/**
 * Progression Resolver - Centralized safety net for critical path progression
 * 
 * This system ensures the player never gets stuck in the vertical slice by:
 * 1. Validating progression state at key transitions (day→night, night→day)
 * 2. Implementing emergency fixes for broken progression states
 * 3. Centralizing all recovery actions for better debugging
 * 
 * Unlike the previous ProgressionResolver, this focused implementation
 * only handles the core vertical slice experience with Dr. Kapoor.
 */

import { create } from 'zustand';
import { GameEventType } from '../events/EventTypes';
import { useEventBus } from '../events/CentralEventBus';
import { useGameStateMachine } from '../statemachine/GameStateMachine';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';

// Types for repair operations
interface RepairOperation {
  id: string;
  description: string;
  timestamp: number;
  success: boolean;
}

// Resolver state interface
interface ProgressionResolverState {
  // Core state
  initialized: boolean;
  recoveryOperations: RepairOperation[];
  
  // Validation methods
  validateDayToNightTransition: () => boolean;
  validateNightToDayTransition: () => boolean;
  
  // Emergency recovery methods
  forceJournalAcquisition: (source?: string) => boolean;
  forceKnowledgeTransfer: () => boolean;
  forceDayPhaseCompletion: () => boolean;
  forceNightPhaseCompletion: () => boolean;
  
  // System methods
  initialize: () => () => void;
  logRecovery: (id: string, description: string, success: boolean) => void;
  getRecoveryLog: () => RepairOperation[];
}

// Create the progression resolver store
export const useProgressionResolver = create<ProgressionResolverState>((set, get) => ({
  // Initial state
  initialized: false,
  recoveryOperations: [],
  
  /**
   * Validate day→night transition state
   * Ensures journal exists if node was completed
   * @returns true if validation succeeded or was repaired, false if failed
   */
  validateDayToNightTransition: () => {
    console.log('[ProgressionResolver] Validating day→night transition');
    const journalStore = useJournalStore.getState();
    const gameState = useGameStateMachine.getState();
    
    // Check completion of Kapoor node (essential for vertical slice)
    const kapoorNodeCompleted = gameState.completedNodeIds.some(id => 
      id.includes('kapoor') || id.includes('calibration')
    );
    
    // If node completed but no journal, this is an error state
    if (kapoorNodeCompleted && !journalStore.hasJournal) {
      console.warn('[ProgressionResolver] Critical issue: Kapoor node completed but journal not acquired');
      
      // Attempt recovery by forcing journal acquisition
      const success = get().forceJournalAcquisition('day_to_night_validation');
      
      if (success) {
        console.log('[ProgressionResolver] Successfully repaired missing journal');
        return true;
      } else {
        console.error('[ProgressionResolver] Failed to repair missing journal');
        return false;
      }
    }
    
    return true; // No issues or successful repair
  },
  
  /**
   * Validate night→day transition state
   * Ensures knowledge was transferred if insights were pending
   * @returns true if validation succeeded or was repaired, false if failed
   */
  validateNightToDayTransition: () => {
    console.log('[ProgressionResolver] Validating night→day transition');
    const knowledgeStore = useKnowledgeStore.getState();
    
    // Check for pending insights that weren't transferred
    if (knowledgeStore.pendingInsights && knowledgeStore.pendingInsights.length > 0) {
      console.warn('[ProgressionResolver] Critical issue: Pending insights not transferred');
      
      // Attempt recovery by forcing knowledge transfer
      const success = get().forceKnowledgeTransfer();
      
      if (success) {
        console.log('[ProgressionResolver] Successfully transferred pending insights');
        return true;
      } else {
        console.error('[ProgressionResolver] Failed to transfer pending insights');
        return false;
      }
    }
    
    return true; // No issues or successful repair
  },
  
  /**
   * Force journal acquisition as emergency recovery
   * @param source Optional source of the recovery
   * @returns true if successful
   */
  forceJournalAcquisition: (source = 'emergency_recovery') => {
    try {
      const journalStore = useJournalStore.getState();
      
      // Only proceed if journal doesn't exist
      if (!journalStore.hasJournal) {
        // First attempt to initialize journal through journal store
        journalStore.initializeJournal('technical');
        
        // Then dispatch event for other systems to respond
        useEventBus.getState().dispatch(
          GameEventType.JOURNAL_ACQUIRED,
          {
            tier: 'technical',
            character: 'kapoor',
            source,
            forced: true
          }
        );
        
        // Log recovery operation
        get().logRecovery(
          'force_journal_acquisition',
          'Forced journal acquisition during transition',
          true
        );
        
        return true;
      }
      
      return true; // Journal already exists
    } catch (error) {
      console.error('[ProgressionResolver] Error during journal acquisition:', error);
      
      // Log failed recovery
      get().logRecovery(
        'force_journal_acquisition',
        'Failed journal acquisition during transition',
        false
      );
      
      return false;
    }
  },
  
  /**
   * Force knowledge transfer as emergency recovery
   * @returns true if successful
   */
  forceKnowledgeTransfer: () => {
    try {
      const knowledgeStore = useKnowledgeStore.getState();
      
      // Only proceed if there are pending insights
      if (knowledgeStore.pendingInsights && knowledgeStore.pendingInsights.length > 0) {
        // Transfer insights through knowledge store
        knowledgeStore.transferInsights();
        
        // Log recovery operation
        get().logRecovery(
          'force_knowledge_transfer',
          'Forced knowledge transfer during transition',
          true
        );
        
        return true;
      }
      
      return true; // No pending insights
    } catch (error) {
      console.error('[ProgressionResolver] Error during knowledge transfer:', error);
      
      // Log failed recovery
      get().logRecovery(
        'force_knowledge_transfer',
        'Failed knowledge transfer during transition',
        false
      );
      
      return false;
    }
  },
  
  /**
   * Force day phase completion as emergency recovery
   * @returns true if successful
   */
  forceDayPhaseCompletion: () => {
    try {
      const gameState = useGameStateMachine.getState();
      
      // Only proceed if in day phase
      if (gameState.gamePhase === 'day') {
        // Force transition to night
        gameState.transitionToPhase('transition_to_night', 'emergency_recovery');
        
        // Log recovery operation
        get().logRecovery(
          'force_day_completion',
          'Forced day completion to unstick player',
          true
        );
        
        return true;
      }
      
      return false; // Not in day phase
    } catch (error) {
      console.error('[ProgressionResolver] Error during day completion:', error);
      
      // Log failed recovery
      get().logRecovery(
        'force_day_completion',
        'Failed day completion emergency recovery',
        false
      );
      
      return false;
    }
  },
  
  /**
   * Force night phase completion as emergency recovery
   * @returns true if successful
   */
  forceNightPhaseCompletion: () => {
    try {
      const gameState = useGameStateMachine.getState();
      
      // Only proceed if in night phase
      if (gameState.gamePhase === 'night') {
        // Force transition to day
        gameState.transitionToPhase('transition_to_day', 'emergency_recovery');
        
        // Log recovery operation
        get().logRecovery(
          'force_night_completion',
          'Forced night completion to unstick player',
          true
        );
        
        return true;
      }
      
      return false; // Not in night phase
    } catch (error) {
      console.error('[ProgressionResolver] Error during night completion:', error);
      
      // Log failed recovery
      get().logRecovery(
        'force_night_completion',
        'Failed night completion emergency recovery',
        false
      );
      
      return false;
    }
  },
  
  /**
   * Log a recovery operation
   * @param id Unique identifier for the operation
   * @param description Human-readable description
   * @param success Whether the operation succeeded
   */
  logRecovery: (id: string, description: string, success: boolean) => {
    set(state => ({
      recoveryOperations: [
        ...state.recoveryOperations,
        {
          id,
          description,
          timestamp: Date.now(),
          success
        }
      ]
    }));
  },
  
  /**
   * Get recovery operation log
   * @returns Array of recovery operations
   */
  getRecoveryLog: () => {
    return get().recoveryOperations;
  },
  
  /**
   * Initialize the progression resolver
   * Connects to event system to watch for phase transitions
   * @returns Unsubscribe function
   */
  initialize: () => {
    // Connect to event bus
    const unsubscribe = useEventBus.getState().subscribe(
      GameEventType.GAME_PHASE_CHANGED, 
      (event) => {
        const { to } = event.payload;
        
        // Validate at transition points
        if (to === 'transition_to_night') {
          get().validateDayToNightTransition();
        } else if (to === 'transition_to_day') {
          get().validateNightToDayTransition();
        }
      }
    );
    
    // Mark as initialized
    set({ initialized: true });
    console.log('[ProgressionResolver] Initialized and connected to event bus');
    
    // Return unsubscribe function for cleanup
    return unsubscribe;
  }
}));

/**
 * Initialize the progression resolver
 * Call this during application startup
 */
export function setupProgressionResolver() {
  return useProgressionResolver.getState().initialize();
}

// Direct access to resolver methods for debugging and emergency recovery
export const progressionResolver = {
  validateDayToNightTransition: () => useProgressionResolver.getState().validateDayToNightTransition(),
  validateNightToDayTransition: () => useProgressionResolver.getState().validateNightToDayTransition(),
  forceJournalAcquisition: (source?: string) => useProgressionResolver.getState().forceJournalAcquisition(source),
  forceKnowledgeTransfer: () => useProgressionResolver.getState().forceKnowledgeTransfer(),
  forceDayPhaseCompletion: () => useProgressionResolver.getState().forceDayPhaseCompletion(),
  forceNightPhaseCompletion: () => useProgressionResolver.getState().forceNightPhaseCompletion(),
  getRecoveryLog: () => useProgressionResolver.getState().getRecoveryLog()
};

// Make recovery methods available globally for emergency debugging
if (typeof window !== 'undefined') {
  (window as any).__PROGRESSION_RESOLVER__ = progressionResolver;
}

export default useProgressionResolver;