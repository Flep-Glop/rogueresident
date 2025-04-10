// app/hooks/usePrimitiveStoreValue.ts

import { useCallback } from 'react';

/**
 * A hook to safely extract primitive values from Zustand stores.
 * This pattern prevents recursive rendering loops by ensuring stable references
 * and direct primitive extraction.
 * 
 * Similar to the "Aspect Selection Pattern" used in Hades' UI system.
 * 
 * @param useStore A Zustand store hook
 * @param selector A selector function that extracts a primitive value
 * @param defaultValue A fallback default if the value is undefined
 * @returns The selected primitive value
 */
export function usePrimitiveStoreValue<T, V>(
  useStore: () => T,
  selector: (state: T) => V,
  defaultValue: V
): V {
  // The callback is memoized to maintain reference stability
  const stableSelector = useCallback(state => selector(state), []);
  
  // Extract the value directly, falling back to default if undefined
  const value = useStore(stableSelector);
  return value ?? defaultValue;
}

/**
 * A more flexible version that allows extracting multiple primitive values
 * with a stable selector reference. Use this when you need multiple primitives
 * but still want to avoid reference stability issues.
 * 
 * @param useStore A Zustand store hook
 * @param selectorFn A selector function that returns an object of primitive values
 * @returns An object containing the selected primitive values
 */
export function usePrimitiveStoreValues<T, R extends Record<string, any>>(
  useStore: () => T,
  selectorFn: (state: T) => R
): R {
  // Create a stable reference selector
  const stableSelector = useCallback(state => selectorFn(state), []);
  
  // Extract the values directly
  return useStore(stableSelector);
}

/**
 * A typed version for gameState specifically, providing helpful autocomplete
 * for commonly accessed game state properties
 * 
 * @param selector A selector function for gameState
 * @param defaultValue The default value if the selected value is undefined
 * @returns The selected game state value
 */
export function useGameStateValue<V>(
  selector: (state: GameState) => V,
  defaultValue: V
): V {
  return usePrimitiveStoreValue(useGameState, selector, defaultValue);
}

// Example usage:
/*
// Single primitive:
const gamePhase = usePrimitiveStoreValue(
  useGameState,
  state => state.gamePhase,
  'day'
);

// Multiple primitives:
const playerStats = usePrimitiveStoreValues(
  useGameStore,
  state => ({
    health: state.player?.health ?? 100,
    insight: state.player?.insight ?? 0,
    momentum: state.player?.momentum ?? 0
  })
);
*/