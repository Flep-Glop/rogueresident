// app/core/statemachine/TransitionGuarantor.ts
/**
 * Transition Guarantor System
 * 
 * A specialized system inspired by Supergiant's approach to ensuring critical 
 * state transitions complete successfully. This system monitors transitions
 * between key game states and provides safety mechanisms to recover from 
 * stuck transitions.
 * 
 * Key features:
 * - Monitors ongoing transitions with timeout-based safety nets
 * - Provides recovery paths for stuck transitions
 * - Maintains a log of transition attempts and issues
 * - Non-intrusive design that operates alongside the main state machine
 */

import { useEventBus } from '../events/CentralEventBus';
import { GameEventType, RecoveryEventPayload } from '../events/EventTypes';
import { useGameStateMachine, GamePhase } from './GameStateMachine';

// Types for the guarantor system
type TransitionType = 'day_to_night' | 'night_to_day' | 'other';
type TransitionState = 'pending' | 'in_progress' | 'completed' | 'failed' | 'recovered';

interface TransitionRecord {
  id: string;
  type: TransitionType;
  from: GamePhase;
  to: GamePhase;
  state: TransitionState;
  startTime: number;
  completionTime?: number;
  timeoutDuration: number;
  recoveryAttempts: number;
  reason?: string;
}

/**
 * Initialize the Transition Guarantor
 * 
 * Sets up event listeners to monitor and recover from stuck transitions
 */
export function setupTransitionGuarantor() {
  console.log('[TransitionGuarantor] Initializing transition safety system');
  
  // Active transitions being monitored
  const activeTransitions: Map<string, TransitionRecord> = new Map();
  
  // Safety timeout references for cleanup
  const safetyTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Track transition history for debugging
  const transitionHistory: TransitionRecord[] = [];
  
  // Use a unique ID for each transition
  let transitionCounter = 0;
  
  // Get event system and state machine
  const eventBus = useEventBus.getState();
  
  // Subscribe to phase change events
  const unsubscribePhaseChange = eventBus.subscribe(
    GameEventType.GAME_PHASE_CHANGED,
    (event) => {
      const { from, to, reason } = event.payload;
      
      // Only monitor transition phases
      if (to === 'transition_to_night' || to === 'transition_to_day') {
        // Create transition ID
        const transitionId = `transition-${++transitionCounter}-${Date.now()}`;
        
        // Determine transition type
        const transitionType: TransitionType = 
          to === 'transition_to_night' ? 'day_to_night' : 
          to === 'transition_to_day' ? 'night_to_day' : 'other';
        
        // Create transition record
        const transition: TransitionRecord = {
          id: transitionId,
          type: transitionType,
          from: from as GamePhase,
          to: to as GamePhase,
          state: 'in_progress',
          startTime: Date.now(),
          timeoutDuration: 5000, // 5 second safety timeout
          recoveryAttempts: 0,
          reason
        };
        
        // Store transition
        activeTransitions.set(transitionId, transition);
        
        // Set up safety timeout
        const safetyTimeout = setTimeout(() => {
          handleTransitionTimeout(transitionId);
        }, transition.timeoutDuration);
        
        // Store timeout reference
        safetyTimeouts.set(transitionId, safetyTimeout);
        
        console.log(`[TransitionGuarantor] Monitoring transition ${transitionId}: ${from} -> ${to}`);
        
        // Log the start of monitoring
        try {
          eventBus.dispatch(
            GameEventType.CONSISTENCY_CHECK,
            {
              type: 'transition',
              source: 'transition_guarantor',
              previousState: from,
              targetState: to,
              metadata: { transitionId, expectedDuration: transition.timeoutDuration },
              successful: true,
              timestamp: Date.now()
            } as RecoveryEventPayload,
            'transitionGuarantor'
          );
        } catch (error) {
          console.warn('[TransitionGuarantor] Error dispatching consistency check event:', error);
        }
      } 
      // Check if this is the completion of a monitored transition
      else if (from === 'transition_to_night' || from === 'transition_to_day') {
        // Find the corresponding transition
        let matchingTransitionId: string | undefined;
        let matchingTransition: TransitionRecord | undefined;
        
        for (const [id, transition] of activeTransitions.entries()) {
          if (transition.to === from && transition.state === 'in_progress') {
            matchingTransitionId = id;
            matchingTransition = transition;
            break;
          }
        }
        
        if (matchingTransitionId && matchingTransition) {
          // Mark as completed
          matchingTransition.state = 'completed';
          matchingTransition.completionTime = Date.now();
          
          // Clear the safety timeout
          if (safetyTimeouts.has(matchingTransitionId)) {
            clearTimeout(safetyTimeouts.get(matchingTransitionId)!);
            safetyTimeouts.delete(matchingTransitionId);
          }
          
          // Store in history
          transitionHistory.push(matchingTransition);
          
          // Remove from active monitoring
          activeTransitions.delete(matchingTransitionId);
          
          console.log(`[TransitionGuarantor] Transition ${matchingTransitionId} completed successfully`);
        }
      }
    }
  );
  
  /**
   * Handle a transition timeout by attempting recovery
   */
  function handleTransitionTimeout(transitionId: string) {
    // Get the transition
    const transition = activeTransitions.get(transitionId);
    if (!transition) return;
    
    console.warn(`[TransitionGuarantor] Transition ${transitionId} timed out after ${transition.timeoutDuration}ms`);
    
    // Increment recovery attempts
    transition.recoveryAttempts++;
    
    // Get the current game state
    const gameState = useGameStateMachine.getState();
    const currentPhase = gameState.gamePhase;
    
    // Check if we're still in the transition phase
    const isStillTransitioning = 
      (transition.to === 'transition_to_night' && currentPhase === 'transition_to_night') ||
      (transition.to === 'transition_to_day' && currentPhase === 'transition_to_day');
    
    if (isStillTransitioning) {
      console.warn(`[TransitionGuarantor] Attempting recovery for stuck transition ${transitionId}`);
      
      // Attempt recovery based on transition type
      let recoverySuccessful = false;
      
      try {
        if (transition.to === 'transition_to_night') {
          // Force transition to night
          recoverySuccessful = gameState.transitionToPhase('night', `safety_recovery_${transition.recoveryAttempts}`);
        } else if (transition.to === 'transition_to_day') {
          // Force transition to day
          recoverySuccessful = gameState.transitionToPhase('day', `safety_recovery_${transition.recoveryAttempts}`);
        }
        
        // Update transition state
        transition.state = recoverySuccessful ? 'recovered' : 'failed';
        
        // Log the recovery attempt
        try {
          eventBus.dispatch(
            GameEventType.TRANSITION_RECOVERY,
            {
              type: 'transition',
              source: 'transition_guarantor',
              previousState: transition.from,
              targetState: recoverySuccessful ? 
                (transition.to === 'transition_to_night' ? 'night' : 'day') : 
                transition.to,
              metadata: { 
                transitionId, 
                attempt: transition.recoveryAttempts,
                stuckDuration: Date.now() - transition.startTime 
              },
              successful: recoverySuccessful,
              timestamp: Date.now()
            } as RecoveryEventPayload,
            'transitionGuarantor'
          );
        } catch (error) {
          console.warn('[TransitionGuarantor] Error dispatching recovery event:', error);
        }
        
        // Store in history 
        transitionHistory.push({...transition});
        
        // If successful, remove from active transitions
        if (recoverySuccessful) {
          activeTransitions.delete(transitionId);
          console.log(`[TransitionGuarantor] Successfully recovered transition ${transitionId}`);
        }
        // If failed but we have attempts left, try again with a longer timeout
        else if (transition.recoveryAttempts < 3) {
          // Double the timeout duration for next attempt
          transition.timeoutDuration *= 2;
          
          // Set a new timeout
          const newTimeout = setTimeout(() => {
            handleTransitionTimeout(transitionId);
          }, transition.timeoutDuration);
          
          // Update the timeout reference
          safetyTimeouts.set(transitionId, newTimeout);
          
          console.log(`[TransitionGuarantor] Recovery failed, will retry in ${transition.timeoutDuration}ms`);
        } 
        // Out of attempts, give up
        else {
          console.error(`[TransitionGuarantor] Failed to recover transition ${transitionId} after ${transition.recoveryAttempts} attempts`);
          activeTransitions.delete(transitionId);
        }
      } catch (error) {
        console.error(`[TransitionGuarantor] Error during recovery:`, error);
        transition.state = 'failed';
        transitionHistory.push({...transition});
        activeTransitions.delete(transitionId);
      }
    } else {
      // Transition completed on its own, but the event might have been missed
      console.log(`[TransitionGuarantor] Transition ${transitionId} resolved on its own, cleaning up`);
      
      transition.state = 'completed';
      transition.completionTime = Date.now();
      
      transitionHistory.push({...transition});
      activeTransitions.delete(transitionId);
    }
  }
  
  /**
   * Clean up all resources
   */
  function cleanup() {
    // Clear all timeouts
    for (const timeout of safetyTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    // Clear collections
    safetyTimeouts.clear();
    activeTransitions.clear();
    
    // Unsubscribe from events
    unsubscribePhaseChange();
    
    console.log('[TransitionGuarantor] Cleanup complete');
  }
  
  // Make diagnostic information available
  const diagnostics = {
    getActiveTransitions: () => Array.from(activeTransitions.values()),
    getTransitionHistory: () => [...transitionHistory],
    getStatistics: () => ({
      total: transitionHistory.length,
      completed: transitionHistory.filter(t => t.state === 'completed').length,
      recovered: transitionHistory.filter(t => t.state === 'recovered').length,
      failed: transitionHistory.filter(t => t.state === 'failed').length,
      avgCompletionTime: calculateAverageCompletionTime(transitionHistory)
    })
  };
  
  // Helper to calculate average completion time
  function calculateAverageCompletionTime(transitions: TransitionRecord[]): number {
    const completedTransitions = transitions.filter(
      t => (t.state === 'completed' || t.state === 'recovered') && t.completionTime
    );
    
    if (completedTransitions.length === 0) return 0;
    
    const totalTime = completedTransitions.reduce((sum, t) => 
      sum + ((t.completionTime || 0) - t.startTime), 0);
    
    return Math.round(totalTime / completedTransitions.length);
  }
  
  // Export the interface
  return {
    cleanup,
    diagnostics
  };
}

// Expose diagnostics to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__TRANSITION_GUARANTOR_DIAGNOSTICS__ = () => {
    if ((window as any).__transitionGuarantorInstance) {
      return (window as any).__transitionGuarantorInstance.diagnostics;
    }
    return { error: 'Transition guarantor not initialized' };
  };
}

// Default export
export default setupTransitionGuarantor;