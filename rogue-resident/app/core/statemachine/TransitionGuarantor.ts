// app/core/statemachine/TransitionGuarantor.ts
/**
 * Enhanced Transition Guarantor System
 * 
 * A specialized system to ensure critical state transitions complete
 * successfully. This updated version provides stronger safety mechanisms 
 * with more aggressive recovery strategies and persistent monitoring.
 * 
 * Key improvements:
 * - Shorter timeout durations for faster recovery
 * - Multiple recovery strategies with escalating aggressiveness
 * - Better event logging for diagnostics
 * - Direct UI state manipulation as last resort
 */

import { useEventBus, safeDispatch } from '../events/CentralEventBus';
import { GameEventType, RecoveryEventPayload } from '../events/EventTypes';
import { useGameStateMachine, GamePhase } from './GameStateMachine';

// Types for the guarantor system
type TransitionType = 'day_to_night' | 'night_to_day' | 'other';
type TransitionState = 'pending' | 'in_progress' | 'completed' | 'failed' | 'recovered';
type RecoveryStrategy = 'gentle' | 'normal' | 'aggressive' | 'direct_override';

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
  recoveryStrategy?: RecoveryStrategy;
  reason?: string;
}

/**
 * Initialize the Transition Guarantor with enhanced recovery capabilities
 * 
 * Sets up event listeners to monitor and recover from stuck transitions
 */
export function setupTransitionGuarantor() {
  console.log('[TransitionGuarantor] Initializing transition safety system');
  
  // Active transitions being monitored
  const activeTransitions: Map<string, TransitionRecord> = new Map();
  
  // Safety timeout references for cleanup
  const safetyTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Periodic check interval - runs every 2 seconds to catch stuck transitions
  let periodicCheckInterval: NodeJS.Timeout | null = null;
  
  // Track transition history for debugging
  const transitionHistory: TransitionRecord[] = [];
  
  // Use a unique ID for each transition
  let transitionCounter = 0;
  
  // Get event system and state machine
  const eventBus = useEventBus.getState();
  
  // Subscribe to phase change events - more detailed for diagnostics
  const unsubscribePhaseChange = eventBus.subscribe(
    GameEventType.GAME_PHASE_CHANGED,
    (event) => {
      const { from, to, reason } = event.payload;
      
      // Always log all phase changes for better diagnostics
      console.log(`[TransitionGuarantor] Phase change event: ${from} -> ${to} (${reason || 'no reason'})`);
      
      // Only monitor transition phases
      if (to === 'transition_to_night' || to === 'transition_to_day') {
        // Create transition ID
        const transitionId = `transition-${++transitionCounter}-${Date.now()}`;
        
        // Determine transition type
        const transitionType: TransitionType = 
          to === 'transition_to_night' ? 'day_to_night' : 
          to === 'transition_to_day' ? 'night_to_day' : 'other';
        
        // Create transition record with shorter timeout for faster recovery
        const transition: TransitionRecord = {
          id: transitionId,
          type: transitionType,
          from: from as GamePhase,
          to: to as GamePhase,
          state: 'in_progress',
          startTime: Date.now(),
          timeoutDuration: 3000, // Reduced from 5000 to 3000ms for faster recovery
          recoveryAttempts: 0,
          reason
        };
        
        // Store transition
        activeTransitions.set(transitionId, transition);
        
        // Set up safety timeout - first attempt more gentle
        const safetyTimeout = setTimeout(() => {
          handleTransitionTimeout(transitionId, 'gentle');
        }, transition.timeoutDuration);
        
        // Store timeout reference
        safetyTimeouts.set(transitionId, safetyTimeout);
        
        console.log(`[TransitionGuarantor] Monitoring transition ${transitionId}: ${from} -> ${to}`);
        
        // Log the start of monitoring
        try {
          safeDispatch(
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
          
          console.log(`[TransitionGuarantor] Transition ${matchingTransitionId} completed successfully in ${
            Date.now() - matchingTransition.startTime}ms`);
        }
      }
    }
  );
  
  /**
   * Handle a transition timeout by attempting recovery
   * @param transitionId The ID of the transition that timed out
   * @param strategy The recovery strategy to use
   */
  function handleTransitionTimeout(transitionId: string, strategy: RecoveryStrategy) {
    // Get the transition
    const transition = activeTransitions.get(transitionId);
    if (!transition) return;
    
    console.warn(`[TransitionGuarantor] Transition ${transitionId} timed out after ${transition.timeoutDuration}ms, using ${strategy} recovery`);
    
    // Increment recovery attempts
    transition.recoveryAttempts++;
    transition.recoveryStrategy = strategy;
    
    // Get the current game state
    const gameState = useGameStateMachine.getState();
    const currentPhase = gameState.gamePhase;
    
    // Check if we're still in the transition phase
    const isStillTransitioning = 
      (transition.to === 'transition_to_night' && currentPhase === 'transition_to_night') ||
      (transition.to === 'transition_to_day' && currentPhase === 'transition_to_day');
    
    if (isStillTransitioning) {
      console.warn(`[TransitionGuarantor] Attempting recovery for stuck transition ${transitionId} using ${strategy} strategy`);
      
      // Attempt recovery based on transition type and strategy
      let recoverySuccessful = false;
      let recoveryReason = `${strategy}_recovery_${transition.recoveryAttempts}`;
      
      try {
        if (transition.to === 'transition_to_night') {
          // Force transition to night with increasingly aggressive reasons
          recoverySuccessful = gameState.transitionToPhase('night', recoveryReason);
        } else if (transition.to === 'transition_to_day') {
          // Force transition to day with increasingly aggressive reasons
          recoverySuccessful = gameState.transitionToPhase('day', recoveryReason);
        }
        
        // Update transition state
        transition.state = recoverySuccessful ? 'recovered' : 'failed';
        
        // Log the recovery attempt
        try {
          safeDispatch(
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
                strategy,
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
          console.log(`[TransitionGuarantor] Successfully recovered transition ${transitionId} using ${strategy} strategy`);
        }
        // If failed but we have attempts left, escalate recovery
        else if (transition.recoveryAttempts < 3) {
          // Determine next recovery strategy
          let nextStrategy: RecoveryStrategy = 'normal';
          
          if (strategy === 'normal') {
            nextStrategy = 'aggressive';
          } else if (strategy === 'aggressive') {
            nextStrategy = 'direct_override';
          }
          
          // Double the timeout duration for next attempt with escalated strategy
          transition.timeoutDuration = Math.min(transition.timeoutDuration * 1.5, 5000);
          
          // Set a new timeout with escalated strategy
          const newTimeout = setTimeout(() => {
            handleTransitionTimeout(transitionId, nextStrategy);
          }, transition.timeoutDuration);
          
          // Update the timeout reference
          safetyTimeouts.set(transitionId, newTimeout);
          
          console.log(`[TransitionGuarantor] Recovery failed, will retry in ${
            transition.timeoutDuration}ms with ${nextStrategy} strategy`);
        } 
        // Out of attempts or using direct_override, execute most aggressive approach
        else {
          console.error(`[TransitionGuarantor] Multiple recovery attempts failed, forcing direct override for ${transitionId}`);
          
          // Perform direct setting of state using the internal store 
          // This is a last resort to escape the broken transition
          try {
            // Target phase to directly set
            const targetPhase = transition.to === 'transition_to_night' ? 'night' : 'day';
            
            // Force UI state reset through global window access
            if (typeof window !== 'undefined') {
              if ((window as any).__GAME_STATE_MACHINE_DEBUG__) {
                (window as any).__GAME_STATE_MACHINE_DEBUG__.forceTransition(
                  targetPhase, 
                  'emergency_guarantor_override'
                );
                
                console.warn(`[TransitionGuarantor] Executed emergency direct state override to ${targetPhase}`);
                
                // Consider this a success
                recoverySuccessful = true;
              }
            }
            
            // Clean up after forced override
            activeTransitions.delete(transitionId);
          } catch (overrideError) {
            console.error(`[TransitionGuarantor] Even direct override failed:`, overrideError);
            activeTransitions.delete(transitionId);
          }
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
   * Periodic check for stuck transitions
   * This provides an extra layer of safety beyond timeouts
   */
  function checkStuckTransitions() {
    const now = Date.now();
    
    // Check for any stuck transitions that might have been missed
    for (const [id, transition] of activeTransitions.entries()) {
      // If transition has been active for too long
      const transitionDuration = now - transition.startTime;
      
      // If stuck too long but no recovery attempts yet, start recovery
      if (transitionDuration > 5000 && transition.recoveryAttempts === 0) {
        console.warn(`[TransitionGuarantor] Periodic check found stuck transition: ${id} (${transitionDuration}ms)`);
        
        // Clear existing timeout if any
        if (safetyTimeouts.has(id)) {
          clearTimeout(safetyTimeouts.get(id)!);
        }
        
        // Start immediate recovery
        handleTransitionTimeout(id, 'normal');
      }
      // Very long stuck transition with failed recovery attempts
      else if (transitionDuration > 10000 && transition.recoveryAttempts > 0) {
        console.error(`[TransitionGuarantor] Critically stuck transition detected: ${id} (${transitionDuration}ms with ${transition.recoveryAttempts} failed attempts)`);
        
        // Force immediate direct override
        handleTransitionTimeout(id, 'direct_override');
      }
    }
    
    // Verify that UI state is not inconsistent with game state
    try {
      const gameState = useGameStateMachine.getState();
      const currentPhase = gameState.gamePhase;
      
      // If in transition phase, check how long
      if (currentPhase === 'transition_to_night' || currentPhase === 'transition_to_day') {
        // For any transition phase, if there are no active transitions being tracked,
        // it may indicate a missed event - force create a transition record
        if (activeTransitions.size === 0) {
          console.warn(`[TransitionGuarantor] Found orphaned transition phase: ${currentPhase} with no active transitions`);
          
          // Create synthetic transition based on current state
          const transitionId = `synthetic-${++transitionCounter}-${now}`;
          const transitionType: TransitionType = 
            currentPhase === 'transition_to_night' ? 'day_to_night' : 'night_to_day';
            
          const syntheticTransition: TransitionRecord = {
            id: transitionId,
            type: transitionType,
            from: currentPhase === 'transition_to_night' ? 'day' : 'night',
            to: currentPhase,
            state: 'in_progress',
            startTime: now - 5000, // Assume it's been active for 5 seconds
            timeoutDuration: 2000, // Short timeout for quick recovery
            recoveryAttempts: 0,
            reason: 'synthetic_detection'
          };
          
          // Store and start monitoring
          activeTransitions.set(transitionId, syntheticTransition);
          
          // Set immediate timeout
          const safetyTimeout = setTimeout(() => {
            handleTransitionTimeout(transitionId, 'aggressive');
          }, 1000); // Very short timeout
          
          safetyTimeouts.set(transitionId, safetyTimeout);
          
          console.log(`[TransitionGuarantor] Created synthetic transition ${transitionId} for orphaned phase ${currentPhase}`);
        }
      }
    } catch (stateCheckError) {
      console.error(`[TransitionGuarantor] Error checking game state:`, stateCheckError);
    }
  }
  
  // Set up periodic checks
  periodicCheckInterval = setInterval(checkStuckTransitions, 2000);
  
  /**
   * Clean up all resources
   */
  function cleanup() {
    // Clear all timeouts
    for (const timeout of safetyTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    // Clear periodic check
    if (periodicCheckInterval) {
      clearInterval(periodicCheckInterval);
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
    }),
    forceRepairAll: () => {
      console.log(`[TransitionGuarantor] Force repairing all active transitions`);
      
      for (const [id, transition] of activeTransitions.entries()) {
        handleTransitionTimeout(id, 'direct_override');
      }
      
      return activeTransitions.size;
    }
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
  
  // Run immediate check on startup
  setTimeout(checkStuckTransitions, 1000);
  
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
  
  // Store instance for emergency debugging and repair
  (window as any).__transitionGuarantorInstance = {
    diagnostics: {},
    setup: () => {
      const instance = setupTransitionGuarantor();
      (window as any).__transitionGuarantorInstance.diagnostics = instance.diagnostics;
      return instance;
    },
    forceRepairAllTransitions: () => {
      if ((window as any).__transitionGuarantorInstance.diagnostics.forceRepairAll) {
        return (window as any).__transitionGuarantorInstance.diagnostics.forceRepairAll();
      }
      return { error: 'Force repair function not available' };
    }
  };
}

// Default export
export default setupTransitionGuarantor;