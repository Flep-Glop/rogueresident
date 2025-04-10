// app/core/utils/storeHooks.ts
/**
 * Store Subscription Utilities
 * 
 * This module provides standardized hooks for subscribing to Zustand stores
 * with proper type safety and React 18 compatibility.
 * 
 * Based on patterns developed during Hades to ensure stable subscription patterns
 * that avoid common React rendering pitfalls.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Creates a stable selector function that only returns the specified keys from a store
 * 
 * @param keys Array of keys to select from the store
 * @returns A selector function for use with Zustand stores
 */
export function createStableSelector<T extends Record<string, any>>(
  keys: (keyof T)[]
) {
  return useShallow((state: T) => {
    const result: Partial<T> = {};
    for (const key of keys) {
      result[key] = state[key];
    }
    return result as Pick<T, typeof keys[number]>;
  });
}

/**
 * Creates a selector that safely extracts primitive values, preventing object references
 * that could cause render loops. Use this for gamePhase and other string/number values.
 * 
 * @param selector Function that extracts a primitive value from state
 * @param fallback Optional fallback value if the extracted value is not a primitive
 * @returns A safe selector for primitive values
 */
export function createPrimitiveSelector<T, V extends string | number | boolean>(
  selector: (state: T) => V,
  fallback?: V
) {
  return (state: T) => {
    const value = selector(state);
    if (value === null || value === undefined) {
      return fallback !== undefined ? fallback : value;
    }
    return typeof value !== 'object' ? value : fallback;
  };
}

/**
 * Hook that subscribes to a specific slice of a store and provides a stable reference
 * 
 * @param useStore The Zustand store hook
 * @param selector Selector function to extract values from the store
 * @returns The selected slice of state with stable reference
 */
export function useStableStoreValue<T, U>(
  useStore: (selector: (state: T) => U) => U,
  selector: (state: T) => U
): U {
  // Use memoized selector to prevent recreation on render
  const stableSelector = useCallback(selector, []);
  return useStore(useShallow(stableSelector));
}

/**
 * Hook that safely subscribes to primitive values from a store
 * Prevents recursive rendering issues by ensuring value is a primitive
 * 
 * @param useStore The Zustand store hook
 * @param selector Selector function targeting a primitive value 
 * @param fallback Optional fallback value if the extracted value is not a primitive
 * @returns A primitive value with stable reference
 */
export function usePrimitiveStoreValue<T, V extends string | number | boolean>(
  useStore: (selector: (state: T) => V | undefined) => V | undefined,
  selector: (state: T) => V | undefined,
  fallback?: V
): V | undefined {
  // Use memoized primitive selector to prevent recreation on render
  const stableSelector = useCallback(createPrimitiveSelector(selector, fallback), []);
  return useStore(stableSelector);
}

/**
 * Creates a selector function that only executes when dependencies change
 * 
 * @param selectorFn Function that creates a selector for the store
 * @param deps Dependencies array for the selector
 * @returns A memoized selector function
 */
export function useMemoizedSelector<T, U>(
  selectorFn: () => (state: T) => U, 
  deps: any[] = []
) {
  return useCallback(selectorFn(), deps);
}

/**
 * Safe equality comparison for primitive values or objects
 * Prevents update loops by ensuring proper comparison
 */
function safeEqual(a: any, b: any): boolean {
  // If either value is null or undefined, use Object.is
  if (a == null || b == null) {
    return Object.is(a, b);
  }
  
  // If both values are primitive, use strict equality
  if (
    typeof a !== 'object' || 
    typeof b !== 'object'
  ) {
    return Object.is(a, b);
  }
  
  // For arrays, compare lengths and each element
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => safeEqual(val, b[i]));
  }
  
  // For objects, compare stringified JSON (simple but effective for most cases)
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    // Fallback to reference equality if JSON stringify fails
    console.warn('Failed to compare objects with JSON.stringify', e);
    return Object.is(a, b);
  }
}

/**
 * Hook to observe changes to a store value and execute side effects
 * Enhanced with strict equality checks to prevent update loops
 * 
 * @param useStore The Zustand store hook
 * @param selector Selector function to extract value to observe
 * @param onChange Callback to execute when value changes
 * @param deps Additional dependencies for the effect
 */
export function useStoreValueObserver<T, U>(
  useStore: (selector: (state: T) => U) => U,
  selector: (state: T) => U,
  onChange: (newValue: U, prevValue: U | undefined) => void,
  deps: any[] = []
) {
  const prevValueRef = useRef<U>();
  
  // Use stable selector to prevent unnecessary re-renders
  const stableSelector = useCallback(selector, []);
  const value = useStore(useShallow(stableSelector));
  
  // Memoize the onChange callback to prevent effect re-runs
  const stableOnChange = useCallback(onChange, deps);
  
  useEffect(() => {
    // Critical fix: Use safeEqual for proper equality check
    if (!safeEqual(prevValueRef.current, value)) {
      // Only log phase changes if they're strings (for debugging)
      if (
        typeof value === 'string' && 
        typeof prevValueRef.current === 'string' &&
        value !== prevValueRef.current &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.log(`[StoreObserver] Value changed: ${prevValueRef.current} -> ${value}`);
      }
      
      // Call the onChange handler with previous and new values
      stableOnChange(value, prevValueRef.current);
      
      // Update the reference for next comparison
      prevValueRef.current = typeof value === 'object' ? 
        // For objects, create a deep copy to prevent reference issues
        JSON.parse(JSON.stringify(value)) : 
        // For primitives, store directly
        value;
    }
  }, [value, stableOnChange]);
}

/**
 * Hook specifically for observing game phase changes safely
 * 
 * @param useGameStateHook The game state hook that contains phase information
 * @param onChange Callback to execute when phase changes
 * @param deps Additional dependencies for the effect
 */
export function useGamePhaseObserver(
  useGameStateHook: any,
  onChange: (newPhase: string, oldPhase: string | undefined) => void,
  deps: any[] = []
) {
  // Use primitive selector to avoid object reference issues
  const gamePhaseSelector = useCallback((state: any) => 
    createPrimitiveSelector<any, string>(
      s => s.gamePhase,
      'unknown' // Fallback if phase is not a string
    )(state),
  []);
  
  // Use store observer with the safe selector
  useStoreValueObserver(
    useGameStateHook,
    gamePhaseSelector,
    onChange as any,
    deps
  );
}

/**
 * Hook to extract multiple primitive values from a store
 * More efficient than multiple usePrimitiveStoreValue calls
 * 
 * @param useStore The Zustand store hook
 * @param selectors Object mapping output keys to selector functions
 * @param fallbacks Optional fallback values
 * @returns Object with selected primitive values
 */
export function usePrimitiveValues<
  T,
  S extends Record<string, (state: T) => string | number | boolean | undefined>,
  F extends Partial<Record<keyof S, string | number | boolean>>
>(
  useStore: (selector: (state: T) => any) => any,
  selectors: S,
  fallbacks?: F
): { [K in keyof S]: ReturnType<S[K]> | F[K] } {
  // Create a memoized selector that extracts all primitives at once
  const combinedSelector = useCallback((state: T) => {
    const result: Record<string, any> = {};
    for (const key in selectors) {
      const value = selectors[key](state);
      result[key] = (value === undefined || value === null || typeof value === 'object') 
        ? (fallbacks?.[key] as any) 
        : value;
    }
    return result;
  }, []);
  
  return useStore(useShallow(combinedSelector));
}

/**
 * Access the current store state directly (no subscription)
 * Useful inside callbacks and effects when you need latest state
 * 
 * @param useStore The Zustand store hook
 * @returns A function to access the latest state
 */
export function useStoreSnapshot<T>(useStore: () => T) {
  return useCallback(<R>(selector: (state: T) => R): R => {
    return selector(useStore.getState());
  }, []);
}

/**
 * Creates a callback that gets the latest store state when invoked
 * Prevents stale closures in callbacks while maintaining stable references
 * 
 * @param useStore The Zustand store hook
 * @param callback Callback that receives the current store state and args
 * @param deps Additional dependencies for the callback
 * @returns A stable callback with access to fresh store state
 */
export function useStoreCallback<T, Args extends any[]>(
  useStore: () => T,
  callback: (state: T, ...args: Args) => void,
  deps: any[] = []
) {
  return useCallback(
    (...args: Args) => callback(useStore.getState(), ...args),
    deps
  );
}

/**
 * Example usage patterns:
 * 
 * // 1. Select specific keys from a store
 * const { insight, momentum } = useResourceStore(
 *   createStableSelector(['insight', 'momentum'])
 * );
 * 
 * // 2. Create a stable custom selector
 * const playerStats = useGameStore(
 *   useStableStoreValue(state => ({
 *     health: state.player.health,
 *     level: state.player.level,
 *     displayName: `Level ${state.player.level} Resident`
 *   }))
 * );
 * 
 * // 3. Watch for store changes
 * useStoreValueObserver(
 *   useGameStore,
 *   state => state.gamePhase,
 *   (newPhase, oldPhase) => {
 *     console.log(`Game phase changed from ${oldPhase} to ${newPhase}`);
 *   }
 * );
 * 
 * // 4. Safe primitive value extraction
 * const gamePhase = usePrimitiveStoreValue(
 *   useGameState,
 *   state => state.gamePhase,
 *   'day' // Default fallback if gamePhase is not a string
 * );
 * 
 * // 5. Multiple primitive values at once
 * const { health, mana, stamina } = usePrimitiveValues(
 *   usePlayerStore,
 *   {
 *     health: state => state.health,
 *     mana: state => state.mana,
 *     stamina: state => state.stamina
 *   },
 *   { health: 100, mana: 50, stamina: 100 } // Fallbacks
 * );
 * 
 * // 6. Access latest state in a callback
 * const snapshot = useStoreSnapshot(useGameStore);
 * const handleClick = () => {
 *   const currentPhase = snapshot(s => s.gamePhase);
 *   console.log(`Current phase when clicked: ${currentPhase}`);
 * };
 * 
 * // 7. Create callback with fresh state
 * const handleAttack = useStoreCallback(
 *   useGameStore,
 *   (state, targetId) => {
 *     const target = state.enemies.find(e => e.id === targetId);
 *     if (target) {
 *       state.attackEnemy(targetId);
 *     }
 *   },
 *   []
 * );
 */