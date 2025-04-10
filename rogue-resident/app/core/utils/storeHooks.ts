// app/core/utils/storeHooks.ts
/**
 * Chamber Pattern Store Hooks
 * 
 * These hooks implement the core of the Chamber Pattern, focusing on:
 * 1. Primitive value extraction to prevent reference loops
 * 2. Stable function reference management
 * 3. Type-safe store access patterns
 * 4. Seamless migration between architectural approaches
 * 
 * Based on techniques developed during Hades and refined through Pyre's development,
 * these utilities ensure stable performance even with complex state transitions.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';

// ========= SELECTOR CREATORS =========

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
export function createPrimitiveSelector<T, V extends string | number | boolean | undefined>(
  selector: (state: T) => V,
  fallback?: V
) {
  return (state: T) => {
    try {
      const value = selector(state);
      if (value === null || value === undefined) {
        return fallback !== undefined ? fallback : value;
      }
      return typeof value !== 'object' ? value : fallback;
    } catch (error) {
      console.warn('[storeHooks] Error in primitive selector:', error);
      return fallback;
    }
  };
}

// ========= PRIMARY STORE HOOKS =========

/**
 * Hook that subscribes to a specific slice of a store and provides a stable reference
 * 
 * @param useStore The Zustand store hook
 * @param selector Selector function to extract values from the store
 * @returns The selected slice of state with stable reference
 */
export function useStableStoreValue<StoreType, ValueType>(
  store: any,
  selector: (state: StoreType) => ValueType
): ValueType | null {
  // Type assertion for zustand store
  const storeHook = store as { 
    <U>(selector: (state: StoreType) => U): U;
    getState: () => StoreType
  };

  // Create a memoized selector for stable references
  const stableSelector = useCallback(selector, []);
  
  // Safe extraction using the store with shallow comparison
  try {
    return storeHook(useShallow(stableSelector));
  } catch (error) {
    console.warn('[storeHooks] Error extracting stable store value:', error);
    return null;
  }
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
export function usePrimitiveStoreValue<StoreType, ValueType extends string | number | boolean | undefined>(
  store: any,
  selector: (state: StoreType) => ValueType,
  fallback: ValueType
): ValueType {
  // Type assertion for zustand store
  const storeHook = store as { 
    <U>(selector: (state: StoreType) => U): U;
    getState: () => StoreType
  };

  // Create a safe primitive selector
  const primitiveSelector = useCallback(
    createPrimitiveSelector(selector, fallback),
    [selector, fallback]
  );
  
  // Safe extraction using the store
  try {
    // Extract the value with the primitive selector
    const value = storeHook(primitiveSelector);
    // Return the value or fallback
    return value !== undefined ? value : fallback;
  } catch (error) {
    console.warn('[storeHooks] Error extracting primitive value:', error);
    return fallback;
  }
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
  StoreType,
  SelectorMap extends Record<string, (state: StoreType) => string | number | boolean | undefined>,
  Fallbacks extends Partial<Record<keyof SelectorMap, string | number | boolean>>
>(
  store: any,
  selectors: SelectorMap,
  fallbacks: Fallbacks
): { [K in keyof SelectorMap]: ReturnType<SelectorMap[K]> | (K extends keyof Fallbacks ? Fallbacks[K] : undefined) } {
  // Type assertion for zustand store
  const storeHook = store as { 
    <U>(selector: (state: StoreType) => U, equals?: (a: U, b: U) => boolean): U;
    getState: () => StoreType
  };

  // Create a combined selector function with memoization
  const combinedSelector = useCallback((state: StoreType) => {
    const result: Record<string, any> = {};
    for (const key in selectors) {
      try {
        const value = selectors[key](state);
        result[key] = (value === undefined || value === null || typeof value === 'object') 
          ? (fallbacks[key as keyof Fallbacks] as any) 
          : value;
      } catch (error) {
        console.warn(`[storeHooks] Error selecting ${String(key)}:`, error);
        result[key] = fallbacks[key as keyof Fallbacks];
      }
    }
    return result;
  }, [selectors]);
  
  // Extract all values at once with shallow comparison for maximum performance
  try {
    return storeHook(combinedSelector, shallow);
  } catch (error) {
    console.warn('[storeHooks] Error extracting primitive values:', error);
    
    // Construct fallback object
    const result: Record<string, any> = {};
    for (const key in selectors) {
      result[key] = fallbacks[key as keyof Fallbacks];
    }
    return result as any;
  }
}

/**
 * Creates a memoized value with stable reference identity
 * 
 * This is a Chamber Pattern utility that wraps React's useMemo
 * but focuses on reducing rerenders in the performance-critical path
 * 
 * @param factory Function that creates the memoized value
 * @param deps Dependencies array for the memoized value
 * @returns The memoized value with stable reference
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: any[] = []
): T {
  // Simply wraps useMemo but with Chamber Pattern naming convention
  return useMemo(factory, deps);
}

/**
 * Creates a stable callback that maintains reference equality
 * between renders but can still access fresh state
 * 
 * @param callback Function to memoize
 * @param deps Dependencies array for the callback
 * @returns A stable callback with consistent reference identity
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[] = []
): T {
  // Wraps useCallback but with more semantic naming
  // to indicate Chamber Pattern compliance
  return useCallback(callback, deps);
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

// ========= OBSERVER HOOKS =========

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
    console.warn('[storeHooks] Failed to compare objects with JSON.stringify:', e);
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
  useStore: any,
  selector: (state: T) => U,
  onChange: (newValue: U, prevValue: U | undefined) => void,
  deps: any[] = []
) {
  const prevValueRef = useRef<U>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  // Use stable selector to prevent unnecessary re-renders
  const stableSelector = useCallback(selector, []);
  
  // Extract the value with shallow comparison
  let value: U;
  try {
    value = useStore(useShallow(stableSelector));
  } catch (error) {
    console.warn('[storeHooks] Error in store value observer:', error);
    return; // Exit early if we can't extract the value
  }
  
  useEffect(() => {
    try {
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
        onChangeRef.current(value, prevValueRef.current);
        
        // Update the reference for next comparison
        prevValueRef.current = typeof value === 'object' ? 
          // For objects, create a deep copy to prevent reference issues
          JSON.parse(JSON.stringify(value)) : 
          // For primitives, store directly
          value;
      }
    } catch (error) {
      console.warn('[storeHooks] Error in observer effect:', error);
    }
  }, [value, ...deps]);
}

/**
 * Hook specifically for observing game phase changes safely
 * 
 * @param store Zustand store hook
 * @param onChange Callback to execute when phase changes
 * @param deps Additional dependencies for the effect
 */
export function useGamePhaseObserver<StoreType>(
  store: any,
  onChange: (newPhase: string, oldPhase: string | undefined) => void,
  deps: any[] = []
): void {
  // Type assertion for zustand store
  const storeHook = store as { 
    getState: () => StoreType;
    subscribe: (listener: (state: StoreType, prevState: StoreType) => void) => () => void;
  };

  // Create refs to prevent unnecessary effect triggers
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const prevPhaseRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Try to get initial phase value
    try {
      const state = storeHook.getState() as any;
      prevPhaseRef.current = state.gamePhase;
    } catch (error) {
      console.warn('[storeHooks] Error getting initial game phase:', error);
    }

    // Subscribe to changes
    const unsubscribe = storeHook.subscribe((state: any, prevState: any) => {
      try {
        // Only trigger if the phase actually changed
        const newPhase = state.gamePhase;
        const oldPhase = prevPhaseRef.current || prevState.gamePhase;
        
        if (newPhase !== oldPhase) {
          onChangeRef.current(newPhase, oldPhase);
          prevPhaseRef.current = newPhase;
        }
      } catch (error) {
        console.warn('[storeHooks] Error in game phase observer:', error);
      }
    });
    
    return unsubscribe;
  }, [storeHook, ...deps]);
}

// ========= DIRECT ACCESS UTILITIES =========

/**
 * Access the current store state directly (no subscription)
 * Useful inside callbacks and effects when you need latest state
 * 
 * @param useStore The Zustand store hook
 * @returns A function to access the latest state
 */
export function useStoreSnapshot<T>(useStore: any): <R>(selector: (state: T) => R) => R {
  return useCallback(<R>(selector: (state: T) => R): R => {
    try {
      const state = useStore.getState();
      return selector(state);
    } catch (error) {
      console.warn('[storeHooks] Error in store snapshot:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }, [useStore]);
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
  useStore: any,
  callback: (state: T, ...args: Args) => void,
  deps: any[] = []
) {
  return useCallback(
    (...args: Args) => {
      try {
        const state = useStore.getState();
        callback(state, ...args);
      } catch (error) {
        console.warn('[storeHooks] Error in store callback:', error);
      }
    },
    [useStore, callback, ...deps]
  );
}

// ========= MIGRATION UTILITIES =========

/**
 * Bridge helper to transition between direct state and Chamber Pattern
 * 
 * @param store Zustand store
 * @param selector Selector function to extract value
 * @param defaultValue Default value if extraction fails
 * @param usePrimitives Whether to use Chamber Pattern or direct extraction
 * @returns The extracted value
 */
export function useTransitionalStore<StoreType, ValueType>(
  store: any, 
  selector: (state: StoreType) => ValueType,
  defaultValue: ValueType,
  usePrimitives = false
): ValueType {
  try {
    if (usePrimitives) {
      return usePrimitiveStoreValue<StoreType, ValueType extends string | number | boolean | undefined ? ValueType : never>(
        store, 
        selector as any, 
        defaultValue as any
      ) as any;
    } else {
      // Direct store access for backwards compatibility
      return (store(selector) ?? defaultValue);
    }
  } catch (e) {
    console.warn('[storeHooks] Store access error:', e);
    return defaultValue;
  }
}

// ========= DEBUGGING SUPPORT =========

/**
 * Log store updates during development
 * 
 * @param storeName Name of the store for logging
 * @param useStore The Zustand store hook
 */
export function useStoreLogger(storeName: string, useStore: any) {
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      const unsubscribe = useStore.subscribe((state: any, prevState: any) => {
        // Find changed keys
        const changedKeys: string[] = [];
        for (const key in state) {
          if (!safeEqual(state[key], prevState[key])) {
            changedKeys.push(key);
          }
        }
        
        if (changedKeys.length > 0) {
          console.group(`[Store] ${storeName} updated`);
          console.log('Changed keys:', changedKeys);
          console.log('New state:', state);
          console.log('Previous state:', prevState);
          console.groupEnd();
        }
      });
      
      return unsubscribe;
    }, [storeName, useStore]);
  }
}

// Extend window type for debugging features
declare global {
  interface Window {
    __FORCE_REINITIALIZE__?: () => void;
    __GAME_STATE_MACHINE_DEBUG__?: any;
    __EVENT_SYSTEM_DIAGNOSTICS__?: () => any;
  }
}

/**
 * =====================================================================
 * CHAMBER PATTERN IMPLEMENTATION GUIDE - BASED ON HADES ARCHITECTURE
 * =====================================================================
 * 
 * The Chamber Pattern is our solution to React's performance challenges 
 * in complex, real-time game state. The key principles:
 * 
 * 1. PRIMITIVE VALUE EXTRACTION
 *    - Extract only primitive values (strings, numbers, booleans) from stores
 *    - Prevents unnecessary re-renders caused by object reference changes
 *    - Minimizes React's reconciliation workload during state updates
 * 
 * 2. STABLE FUNCTION REFERENCES
 *    - Use callbacks with minimal dependencies
 *    - Access latest state via getState() within handlers
 *    - Prevents the "stale closure" problem in event handlers
 * 
 * 3. DOM-BASED ANIMATIONS
 *    - Move visual effects outside React's render cycle
 *    - Use CSS classes and DOM manipulation for animations
 *    - Prevents jank during complex transitions
 * 
 * 4. ATOMIC STATE UPDATES
 *    - Group related state changes in single transactions
 *    - Create predictable, synchronized state transitions
 *    - Follows the Chamber transition pattern from Hades
 * 
 * === EXAMPLE USAGE PATTERNS ===
 * 
 * // 1. Extract a primitive value with fallback
 * const gamePhase = usePrimitiveStoreValue(
 *   useGameStateMachine,
 *   state => state.gamePhase,
 *   'day' // Default fallback
 * );
 * 
 * // 2. Extract multiple primitives at once (more efficient)
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
 * // 3. Extract complex objects with stable references
 * const playerInventory = useStableStoreValue(
 *   useGameStore,
 *   state => state.player.inventory
 * );
 * 
 * // 4. Observe game phase changes without re-renders
 * useGamePhaseObserver(
 *   useGameStateMachine,
 *   (newPhase, oldPhase) => {
 *     console.log(`Phase changed: ${oldPhase} -> ${newPhase}`);
 *     if (newPhase === 'night') {
 *       playNightAmbience();
 *     }
 *   }
 * );
 * 
 * // 5. Access fresh state in callbacks
 * const handleAttack = useStoreCallback(
 *   useGameStore,
 *   (state, targetId) => {
 *     const target = state.enemies.find(e => e.id === targetId);
 *     if (target && state.player.canAttack) {
 *       attackEnemy(targetId, state.player.attackPower);
 *     }
 *   },
 *   [] // No dependencies = stable reference
 * );
 * 
 * // 6. Bridge between old and new patterns during migration
 * const currentNodeId = useTransitionalStore(
 *   useGameStore,
 *   state => state.currentNodeId,
 *   null,
 *   true // Use Chamber pattern primitives
 * );
 * 
 * // 7. Create stable memoized values that don't change unnecessarily
 * const sortedItems = useStableMemo(() => {
 *   return items
 *     .filter(item => item.isActive)
 *     .sort((a, b) => a.name.localeCompare(b.name));
 * }, [items]);
 * 
 * // 8. Create stable event handlers with stable references
 * const handleItemClick = useStableCallback((itemId) => {
 *   const { canSelect, selectItem } = useItemStore.getState();
 *   if (canSelect(itemId)) {
 *     selectItem(itemId);
 *   }
 * }, []);
 */