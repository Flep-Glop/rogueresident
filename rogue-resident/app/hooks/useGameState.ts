// app/hooks/useGameState.ts
/**
 * Enhanced Game State Hook
 * 
 * This hook provides a centralized, type-safe way to access game state
 * while preventing recursive rendering issues. It also serves as a layer
 * of abstraction over the direct state machine and store access.
 * 
 * Inspired by Hades' Chamber State integration approach, this hook ensures
 * consistent state access across components.
 */

import { useMemo, useCallback } from 'react';
import useGameStateMachine, { GamePhase as GamePhaseType } from '@/app/core/statemachine/GameStateMachine';
import { useGameStore } from '@/app/store/gameStore';
import { usePrimitiveStoreValue, useStableStoreValue } from '@/app/core/utils/storeHooks';
import { shallow } from 'zustand/shallow';

// Re-export GamePhase for convenience and type safety
export type GamePhase = GamePhaseType;

/**
 * Access consolidated game state with type safety and rendering optimization
 * 
 * This implementation follows the "Chamber Transition Pattern" from Hades:
 * 1. Extracts only the primitive values needed
 * 2. Uses stable references for functions
 * 3. Computes derived values in a controlled manner
 * 4. Returns a consolidated object with proper types
 */
export default function useGameState() {
  // Access phase as a primitive to avoid reference-based re-renders
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.gamePhase,
    'day' // Default to day if we get a non-string value
  ) as GamePhase; // Cast to our explicit type

  const isTransitioning = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.isTransitioning,
    false
  );

  const currentDay = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.currentDay,
    1
  );

  // Stable access to phase transition functions - memoize the selector function
  // This is a key improvement to prevent regenerating the functions object
  const stateFunctions = useGameStateMachine(
    useCallback(state => ({
      beginDayCompletion: state.beginDayCompletion,
      beginNightCompletion: state.beginNightCompletion,
      finalizeDayTransition: state.finalizeDayTransition,
      finalizeNightTransition: state.finalizeNightTransition,
      transitionToState: state.transitionToState,
      getCompletedNodeIds: state.getCompletedNodeIds
    }), []),
    shallow // Use shallow comparison to prevent unnecessary rerenders
  );

  // Access node information directly from game store - also with memoized selector
  const nodeInfo = useGameStore(
    useCallback(state => ({
      currentNodeId: state.currentNodeId,
      currentSystem: state.currentSystem
    }), []),
    shallow
  );

  // Compute derived state values once per render
  const derivedState = useMemo(() => ({
    // Phase flags for easier conditionals
    isDay: gamePhase === 'day',
    isNight: gamePhase === 'night',
    isDayTransition: gamePhase === 'transition_to_day',
    isNightTransition: gamePhase === 'transition_to_night',
    
    // Time of day formatting
    timeOfDay: gamePhase === 'day' ? 'Morning' : 'Night',
    
    // Location info
    atNode: !!nodeInfo.currentNodeId,
    onMap: gamePhase === 'day' && !nodeInfo.currentNodeId,
    atHome: gamePhase === 'night',
    
    // Day progress formatting
    dayFormatted: `Day ${currentDay}`,
    
    // Completed nodes count - safely access if available
    completedNodesCount: stateFunctions.getCompletedNodeIds ? 
      stateFunctions.getCompletedNodeIds().length : 
      0
  }), [gamePhase, nodeInfo.currentNodeId, currentDay, stateFunctions]);
  
  // Return a consolidated state object with proper type handling
  // This object is created fresh each render, but its contents are stable
  return {
    // Core state values
    gamePhase,
    isTransitioning,
    currentDay,
    currentNodeId: nodeInfo.currentNodeId,
    currentSystem: nodeInfo.currentSystem,
    
    // Transition triggers - these references are stable across renders
    beginDayCompletion: stateFunctions.beginDayCompletion,
    beginNightCompletion: stateFunctions.beginNightCompletion,
    finalizeDayTransition: stateFunctions.finalizeDayTransition,
    finalizeNightTransition: stateFunctions.finalizeNightTransition,
    
    // Derived state for easier conditionals
    ...derivedState
  };
}

/**
 * Usage examples:
 * 
 * // In a component that needs phase info:
 * const { isDay, isNight } = useGameState();
 * 
 * // In a component that needs transitions:
 * const { beginDayCompletion } = useGameState();
 * 
 * // Full access pattern:
 * const { 
 *   gamePhase,        // The current game phase string
 *   isDay,            // Boolean flag for day phase
 *   isNight,          // Boolean flag for night phase
 *   isTransitioning,  // Whether a transition is in progress
 *   timeOfDay,        // Formatted time string
 *   dayFormatted,     // Formatted day string (e.g. "Day 3")
 *   currentDay,       // Current day number
 *   currentNodeId,    // Currently selected node ID, if any
 *   beginDayCompletion, // Function to start day→night transition
 *   beginNightCompletion // Function to start night→day transition
 * } = useGameState();
 */