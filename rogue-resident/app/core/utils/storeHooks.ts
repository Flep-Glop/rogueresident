// app/core/utils/storeHooks.ts
/**
 * Enhanced Chamber Pattern Store Hooks
 * 
 * Hardened implementation with improved:
 * 1. Error handling during initialization
 * 2. Defensive access for uninitialized stores
 * 3. Better type safety and fallback mechanisms
 * 4. Performance optimizations for primitive extraction
 */

import { useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';

// Global error tracking to avoid console spam during initialization
let globalErrorCount = 0;
const ERROR_REPORTING_THRESHOLD = 3;

// ========= ENHANCED TYPE SAFETY =========

/**
 * Type guard to check if value is a primitive
 */
function isPrimitive(value: any): value is string | number | boolean | undefined | null {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

// ========= SELECTOR CREATORS =========

/**
 * Creates a stable selector function that only returns the specified keys from a store
 */
export function createStableSelector<T extends Record<string, any>>(
  keys: (keyof T)[]
) {
  return useShallow((state: T) => {
    if (!state) return {} as Pick<T, typeof keys[number]>;
    
    const result: Partial<T> = {};
    for (const key of keys) {
      result[key] = state[key];
    }
    return result as Pick<T, typeof keys[number]>;
  });
}

/**
 * Creates a selector that safely extracts primitive values
 */
export function createPrimitiveSelector<T, V extends string | number | boolean | undefined | null>(
  selector: (state: T) => V,
  fallback?: V
) {
  return (state: T) => {
    if (!state) return fallback;
    
    try {
      const value = selector(state);
      if (!isPrimitive(value)) {
        return fallback !== undefined ? fallback : null as any;
      }
      return value ?? fallback;
    } catch (error) {
      // Only log errors if we're under threshold to avoid spamming
      if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in primitive selector:', error);
        globalErrorCount++;
      }
      return fallback;
    }
  };
}

// ========= ENHANCED STORE TYPE UTILITIES =========

/**
 * Safely determine if an object is a zustand store with better type checking
 */
function isZustandStore(obj: any): boolean {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.getState === 'function' && 
         typeof obj.subscribe === 'function';
}

/**
 * Safely determine if an object is a zustand store hook with better type checking
 */
function isZustandHook(obj: any): boolean {
  return typeof obj === 'function' && 
         (
           // Either it has these methods directly
           (typeof obj.getState === 'function' && typeof obj.subscribe === 'function') ||
           // Or it's a hook that returns a state object
           true
         );
}

/**
 * Safely access store state with enhanced error handling and initialization awareness
 */
function safeGetState<T>(store: any, defaultValue: any = {}): T {
  // Handle null/undefined store
  if (!store) return defaultValue as T;
  
  try {
    // Case 1: It's a store object with getState
    if (isZustandStore(store)) {
      const state = store.getState();
      return state || defaultValue as T;
    }
    
    // Case 2: It's a hook function
    if (isZustandHook(store)) {
      // Try to use getState if available
      if (typeof store.getState === 'function') {
        const state = store.getState();
        return state || defaultValue as T;
      }
      
      // Calling hooks directly is unsafe outside components
      // This should never execute in component context, only in callbacks/listeners
      try {
        return store() || defaultValue as T;
      } catch (e) {
        return defaultValue as T;
      }
    }
    
    // Case 3: It might be the state object itself
    if (store && typeof store === 'object') {
      return store as T;
    }
    
    // Default case: we don't know what this is
    if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Unknown store type:', store);
      globalErrorCount++;
    }
    return defaultValue as T;
  } catch (error) {
    if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Error getting state:', error);
      globalErrorCount++;
    }
    return defaultValue as T;
  }
}

/**
 * Create a safe subscription function with better error handling
 */
function createSafeSubscription(store: any): (callback: () => void) => () => void {
  return (callback: () => void) => {
    if (!store) return () => {}; // No-op for null/undefined store
    
    try {
      // Case 1: It's a store object with subscribe
      if (isZustandStore(store)) {
        return store.subscribe(callback);
      }
      
      // Case 2: It's a hook function with subscribe
      if (isZustandHook(store) && typeof store.subscribe === 'function') {
        return store.subscribe(callback);
      }
      
      // Default case: no subscription
      if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Cannot create subscription for:', store);
        globalErrorCount++;
      }
      return () => {}; // No-op
    } catch (error) {
      if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error creating subscription:', error);
        globalErrorCount++;
      }
      return () => {}; // No-op
    }
  };
}

// ========= ENHANCED PRIMARY STORE HOOKS =========

/**
 * Hook that subscribes to a specific slice of a store and provides a stable reference
 * Now with better initialization handling and error recovery
 */
export function useStableStoreValue<StoreType, ValueType>(
  store: any,
  selector: (state: StoreType) => ValueType
): ValueType | null {
  // Create a memoized selector for stable references
  const stableSelector = useCallback(selector, []);
  
  // Keep the result in a ref to maintain reference stability
  const resultRef = useRef<ValueType | null>(null);
  const errorCountRef = useRef(0);
  
  // Subscribe to the store changes with enhanced error handling
  useEffect(() => {
    if (!store) return () => {}; // No-op for null store
    
    try {
      // Initialize with current value
      const state = safeGetState<StoreType>(store);
      try {
        resultRef.current = stableSelector(state);
      } catch (e) {
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in initial selector call:', e);
          errorCountRef.current++;
        }
      }
      
      // Create subscription based on store type
      const subscribe = createSafeSubscription(store);
      
      // Subscribe to changes with better error handling
      return subscribe(() => {
        try {
          const state = safeGetState<StoreType>(store);
          const newValue = stableSelector(state);
          // Only update if reference changed, which is expected for objects
          if (newValue !== resultRef.current) {
            resultRef.current = newValue;
          }
        } catch (error) {
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn('[storeHooks] Error in subscription callback:', error);
            errorCountRef.current++;
          }
        }
      });
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error setting up store subscription:', error);
        errorCountRef.current++;
      }
      return () => {}; // No-op cleanup
    }
  }, [store, stableSelector]);
  
  // Safe extraction using the store with shallow comparison
  try {
    // Best effort to get current value based on store type
    let value: ValueType | null = null;
    
    // If it's a hook function we can call directly - with better error handling
    if (isZustandHook(store) && !isZustandStore(store)) {
      try {
        // Try to use it as a Zustand hook with shallow comparison
        value = store(useShallow(stableSelector));
      } catch (e) {
        // Fallback to manual state extraction
        const state = safeGetState<StoreType>(store);
        try {
          value = stableSelector(state);
        } catch (innerError) {
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn('[storeHooks] Error in selector call:', innerError);
            errorCountRef.current++;
          }
        }
      }
    } else {
      // Get state manually for other store types
      const state = safeGetState<StoreType>(store);
      try {
        value = stableSelector(state);
      } catch (e) {
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in selector call:', e);
          errorCountRef.current++;
        }
      }
    }
    
    // Update ref with latest value if we got one
    if (value !== null) {
      resultRef.current = value;
    }
    
    return resultRef.current;
  } catch (error) {
    if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Error extracting stable store value:', error);
      errorCountRef.current++;
    }
    return resultRef.current;
  }
}

/**
 * Simplified version of usePrimitiveStoreValue with better error handling
 * Reliable for bootstrapping when stores might still be initializing
 */
export function usePrimitiveStoreFallback<T, V>(
  store: any,
  selector: (state: T) => V,
  fallback: V
): V {
  // Handle null/undefined store
  if (!store) return fallback;
  
  try {
    // If it's a function (zustand hook), call it with the selector
    if (typeof store === 'function') {
      try {
        const value = store(selector);
        return value ?? fallback;
      } catch (e) {
        // During initialization this often fails - try getState
        if (typeof store.getState === 'function') {
          try {
            const state = store.getState();
            if (!state) return fallback;
            return selector(state) ?? fallback;
          } catch (innerE) {
            return fallback;
          }
        }
        return fallback;
      }
    }
    
    // If it has getState, use that
    if (typeof store.getState === 'function') {
      try {
        const state = store.getState();
        if (!state) return fallback;
        return selector(state) ?? fallback;
      } catch (e) {
        return fallback;
      }
    }
    
    // Last resort, try to use it directly
    return selector(store as T) ?? fallback;
  } catch (error) {
    if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Fallback store access error:', error);
      globalErrorCount++;
    }
    return fallback;
  }
}

/**
 * Enhanced primitive value extraction with better error handling and initialization awareness
 */
export function usePrimitiveStoreValue<StoreType, ValueType extends string | number | boolean | undefined | null>(
  store: any,
  selector: (state: StoreType) => ValueType,
  fallback: ValueType
): ValueType {
  // Handle null/undefined store
  if (!store) return fallback;
  
  // Create a stable selector reference
  const stableSelector = useCallback(selector, []);
  
  // Refs for tracking last value to avoid unnecessary updates
  const valueRef = useRef<ValueType>(fallback);
  const errorCountRef = useRef(0);
  
  // Create getSnapshot function that returns the primitive value
  const getSnapshot = useCallback(() => {
    try {
      // Try to get state based on store type
      const state = safeGetState<StoreType>(store, null);
      if (!state) return fallback;
      
      let value: any;
      try {
        value = stableSelector(state);
      } catch (e) {
        // Selector error (often initialization related)
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in selector execution:', e);
          errorCountRef.current++;
        }
        return fallback;
      }
      
      // Validate it's a primitive
      if (isPrimitive(value)) {
        // Only update ref if value actually changed and is valid
        if (value !== valueRef.current) {
          valueRef.current = value;
        }
        return valueRef.current;
      }
      
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Non-primitive value returned from selector:', value);
        errorCountRef.current++;
      }
      return fallback;
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in getSnapshot:', error);
        errorCountRef.current++;
      }
      return fallback;
    }
  }, [store, stableSelector, fallback]);
  
  // Create subscribe function with better error handling
  const subscribe = useCallback((callback: () => void) => {
    if (!store) return () => {}; // No-op for null store
    
    try {
      // Create subscription based on store type
      const safeSubscribe = createSafeSubscription(store);
      return safeSubscribe(callback);
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in subscribe:', error);
        errorCountRef.current++;
      }
      return () => {}; // No-op
    }
  }, [store]);

  // Use sync external store to properly handle subscription
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server version is same as client
  );
}

/**
 * Enhanced multi-value primitive extraction with better error handling
 */
export function usePrimitiveValues<
  StoreType,
  SelectorMap extends Record<string, (state: StoreType) => string | number | boolean | undefined | null>,
  Fallbacks extends Partial<Record<keyof SelectorMap, string | number | boolean | null | undefined>>
>(
  store: any,
  selectors: SelectorMap,
  fallbacks: Fallbacks
): { [K in keyof SelectorMap]: ReturnType<SelectorMap[K]> | (K extends keyof Fallbacks ? Fallbacks[K] : undefined) } {
  // Handle null/undefined store
  if (!store) return { ...fallbacks } as any;
  
  // Stabilize selectors object reference
  const stableSelectors = useMemo(() => selectors, []);
  
  // Stabilize fallbacks object reference
  const stableFallbacks = useMemo(() => fallbacks, []);
  
  // Ref to store the result object with stable reference
  const resultRef = useRef<any>({...fallbacks});
  const errorCountRef = useRef(0);
  
  // Create getSnapshot function with enhanced error handling
  const getSnapshot = useCallback(() => {
    try {
      // Skip snapshot if store is null/undefined
      if (!store) return resultRef.current;
      
      // Get state based on store type with better error handling
      const state = safeGetState<StoreType>(store, null);
      if (!state) return resultRef.current;
      
      let hasChanged = false;
      const newValues: Record<string, any> = {};
      
      // Check each selector with better error handling
      for (const key in stableSelectors) {
        try {
          const selector = stableSelectors[key];
          let value: any;
          
          try {
            value = selector(state);
          } catch (selectorError) {
            // Selector execution error (often during initialization)
            value = stableFallbacks[key as keyof Fallbacks];
            
            if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
              console.warn(`[storeHooks] Error executing selector for ${key}:`, selectorError);
              errorCountRef.current++;
            }
          }
          
          // Ensure it's a primitive value
          const isValidValue = isPrimitive(value);
          const currentValue = isValidValue ? value : stableFallbacks[key as keyof Fallbacks];
          
          // Compare with previous value
          if (resultRef.current[key] !== currentValue) {
            hasChanged = true;
          }
          
          // Store value
          newValues[key] = currentValue;
        } catch (e) {
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn(`[storeHooks] Error processing value for ${key}:`, e);
            errorCountRef.current++;
          }
          newValues[key] = stableFallbacks[key as keyof Fallbacks];
        }
      }
      
      // Only update reference if values changed
      if (hasChanged) {
        resultRef.current = newValues;
      }
      
      return resultRef.current;
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in getSnapshot for primitiveValues:', error);
        errorCountRef.current++;
      }
      return resultRef.current;
    }
  }, [store, stableSelectors, stableFallbacks]);
  
  // Create subscribe function with better error handling
  const subscribe = useCallback((callback: () => void) => {
    if (!store) return () => {}; // No-op for null store
    
    try {
      // Create subscription based on store type
      const safeSubscribe = createSafeSubscription(store);
      return safeSubscribe(callback);
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in subscribe for primitiveValues:', error);
        errorCountRef.current++;
      }
      return () => {}; // No-op
    }
  }, [store]);

  // Use sync external store to properly handle subscription
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server version is same as client
  );
}

/**
 * Creates a memoized value with stable reference identity
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
 * Now with better error handling and initialization awareness
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[] = []
): T {
  // Create refs to store the most recent callback
  const callbackRef = useRef<T>(callback);
  const errorCountRef = useRef(0);
  
  // Update ref whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return a stable function that calls the latest callback
  return useCallback(
    ((...args: any[]) => {
      try {
        return callbackRef.current(...args);
      } catch (error) {
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in stable callback execution:', error);
          errorCountRef.current++;
        }
        return undefined;
      }
    }) as T,
    deps
  );
}

/**
 * Creates a selector function that only executes when dependencies change
 */
export function useMemoizedSelector<T, U>(
  selectorFn: () => (state: T) => U, 
  deps: any[] = []
) {
  return useCallback(selectorFn(), deps);
}

// The rest of the original code...

/**
 * IMPORTANT: You can keep the remaining code from the original file.
 * For brevity, I've focused on enhancing the core hooks that are most critical 
 * for bootstrapping. This includes:
 * 
 * - safeGetState
 * - createSafeSubscription
 * - useStableStoreValue
 * - usePrimitiveStoreFallback
 * - usePrimitiveStoreValue
 * - usePrimitiveValues
 * - useStableCallback
 * 
 * The other utility functions like useStoreValueObserver, useGamePhaseObserver, etc.
 * should be kept as they were, but would benefit from similar error handling enhancements.
 */
 
// ========= OBSERVER HOOKS =========

/**
 * Safe equality comparison for primitive values or objects
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
 */
export function useStoreValueObserver<T, U>(
  store: any,
  selector: (state: T) => U,
  onChange: (newValue: U, prevValue: U | undefined) => void,
  deps: any[] = []
) {
  // Skip if store is null/undefined
  if (!store) return;
  
  const prevValueRef = useRef<U>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const errorCountRef = useRef(0);
  
  // Use stable selector to prevent unnecessary re-renders
  const stableSelector = useCallback(selector, []);
  
  // Extract the value, handling different store types
  let value: U | undefined;
  try {
    // Try to use it as a Zustand hook with shallow comparison
    if (typeof store === 'function') {
      try {
        value = store(useShallow(stableSelector));
      } catch (e) {
        // Fallback to manual state extraction
        const state = safeGetState<T>(store);
        if (state) {
          try {
            value = stableSelector(state);
          } catch (innerE) {
            // Selector execution error, likely during initialization
            if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
              console.warn('[storeHooks] Error executing selector in observer:', innerE);
              errorCountRef.current++;
            }
          }
        }
      }
    } else {
      // Get state manually
      const state = safeGetState<T>(store);
      if (state) {
        try {
          value = stableSelector(state);
        } catch (e) {
          // Selector execution error, likely during initialization
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn('[storeHooks] Error executing selector in observer:', e);
            errorCountRef.current++;
          }
        }
      }
    }
  } catch (error) {
    if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Error in store value observer:', error);
      errorCountRef.current++;
    }
    return; // Exit early if we can't extract the value
  }
  
  useEffect(() => {
    if (value === undefined) return;
    
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
        try {
          onChangeRef.current(value, prevValueRef.current);
        } catch (callbackError) {
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn('[storeHooks] Error in observer onChange callback:', callbackError);
            errorCountRef.current++;
          }
        }
        
        // Update the reference for next comparison
        prevValueRef.current = typeof value === 'object' && value !== null ? 
          // For objects, create a deep copy to prevent reference issues
          JSON.parse(JSON.stringify(value)) : 
          // For primitives, store directly
          value;
      }
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error in observer effect:', error);
        errorCountRef.current++;
      }
    }
  }, [value, ...deps]);
}

/**
 * Hook specifically for observing game phase changes safely
 */
export function useGamePhaseObserver<StoreType>(
  store: any,
  onChange: (newPhase: string, oldPhase: string | undefined) => void,
  deps: any[] = []
): void {
  // Skip if store is null/undefined
  if (!store) return;
  
  // Create refs to prevent unnecessary effect triggers
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const prevPhaseRef = useRef<string | undefined>(undefined);
  const errorCountRef = useRef(0);

  useEffect(() => {
    // Try to get initial phase value
    try {
      const state = safeGetState<any>(store);
      if (state) {
        prevPhaseRef.current = state.gamePhase;
      }
    } catch (error) {
      if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
        console.warn('[storeHooks] Error getting initial game phase:', error);
        errorCountRef.current++;
      }
    }

    // Subscribe to changes
    const safeSubscribe = createSafeSubscription(store);
    const unsubscribe = safeSubscribe(() => {
      try {
        const state = safeGetState<any>(store);
        if (!state) return;
        
        // Only trigger if the phase actually changed
        const newPhase = state.gamePhase;
        const oldPhase = prevPhaseRef.current;
        
        if (newPhase !== oldPhase) {
          try {
            onChangeRef.current(newPhase, oldPhase);
          } catch (callbackError) {
            if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
              console.warn('[storeHooks] Error in game phase observer callback:', callbackError);
              errorCountRef.current++;
            }
          }
          prevPhaseRef.current = newPhase;
        }
      } catch (error) {
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in game phase observer:', error);
          errorCountRef.current++;
        }
      }
    });
    
    return unsubscribe;
  }, [store, ...deps]);
}

// ========= DIRECT ACCESS UTILITIES =========

/**
 * Access the current store state directly (no subscription)
 */
export function useStoreSnapshot<T>(store: any): <R>(selector: (state: T) => R) => R {
  return useCallback(<R>(selector: (state: T) => R): R => {
    try {
      const state = safeGetState<T>(store);
      if (!state) throw new Error('Store state is null/undefined');
      return selector(state);
    } catch (error) {
      console.warn('[storeHooks] Error in store snapshot:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }, [store]);
}

/**
 * Creates a callback that gets the latest store state when invoked
 */
export function useStoreCallback<T, Args extends any[]>(
  store: any,
  callback: (state: T, ...args: Args) => void,
  deps: any[] = []
) {
  // Store callback in ref for latest version
  const callbackRef = useRef(callback);
  const errorCountRef = useRef(0);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    (...args: Args) => {
      try {
        const state = safeGetState<T>(store);
        if (!state) {
          if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
            console.warn('[storeHooks] Store state is null/undefined in callback');
            errorCountRef.current++;
          }
          return;
        }
        callbackRef.current(state, ...args);
      } catch (error) {
        if (errorCountRef.current < ERROR_REPORTING_THRESHOLD) {
          console.warn('[storeHooks] Error in store callback:', error);
          errorCountRef.current++;
        }
      }
    },
    [store, ...deps]
  );
}

// ========= MIGRATION UTILITIES =========

/**
 * Bridge helper to transition between direct state and Chamber Pattern
 */
export function useTransitionalStore<StoreType, ValueType>(
  store: any, 
  selector: (state: StoreType) => ValueType,
  defaultValue: ValueType,
  usePrimitives = false
): ValueType {
  if (!store) return defaultValue;
  
  try {
    if (usePrimitives && isPrimitive(defaultValue)) {
      // Only use primitive extraction if the value is actually a primitive
      return usePrimitiveStoreFallback<StoreType, ValueType>(
        store, 
        selector, 
        defaultValue
      );
    } else {
      // Direct store access for backwards compatibility or objects
      if (typeof store === 'function') {
        try {
          return (store(selector) ?? defaultValue);
        } catch (e) {
          // Hook function failed, try getState
          if (typeof store.getState === 'function') {
            const state = store.getState();
            if (!state) return defaultValue;
            return selector(state) ?? defaultValue;
          }
          return defaultValue;
        }
      } else {
        // Try to use getState if available
        if (typeof store.getState === 'function') {
          const state = store.getState();
          if (!state) return defaultValue;
          return selector(state) ?? defaultValue;
        }
        // Last resort - try to use it directly
        return selector(store as StoreType) ?? defaultValue;
      }
    }
  } catch (e) {
    if (globalErrorCount < ERROR_REPORTING_THRESHOLD) {
      console.warn('[storeHooks] Store access error:', e);
      globalErrorCount++;
    }
    return defaultValue;
  }
}

// ========= DEBUGGING SUPPORT =========

/**
 * Reset global error count, useful during initialization
 */
export function resetStoreHookErrors() {
  globalErrorCount = 0;
  console.log('[storeHooks] Error count reset');
}

/**
 * Log store updates during development
 */
export function useStoreLogger(storeName: string, store: any) {
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      if (!store) return () => {}; // No-op for null store
      
      try {
        // Create subscription based on store type
        const safeSubscribe = createSafeSubscription(store);
        
        const unsubscribe = safeSubscribe(() => {
          try {
            const currentState = safeGetState(store);
            console.group(`[Store] ${storeName} updated`);
            console.log('New state:', currentState);
            console.groupEnd();
          } catch (error) {
            console.warn('[storeHooks] Error in store logger:', error);
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.warn('[storeHooks] Error setting up store logger:', error);
        return () => {}; // No-op
      }
    }, [storeName, store]);
  }
}

// Extend window type for debugging features
declare global {
  interface Window {
    __FORCE_REINITIALIZE__?: () => void;
    __GAME_STATE_MACHINE_DEBUG__?: any;
    __EVENT_SYSTEM_DIAGNOSTICS__?: () => any;
    __STORE_HOOKS_DEBUG__?: {
      resetErrorCount: () => void;
      getErrorCount: () => number;
      testSelector: <T, V>(store: any, selector: (state: T) => V, fallback: V) => V;
    };
  }
}

// Add debug API to window
if (typeof window !== 'undefined') {
  window.__STORE_HOOKS_DEBUG__ = {
    resetErrorCount: () => {
      globalErrorCount = 0;
      console.log('[storeHooks] Error count reset');
    },
    getErrorCount: () => globalErrorCount,
    testSelector: <T, V>(store: any, selector: (state: T) => V, fallback: V): V => {
      try {
        const state = safeGetState<T>(store);
        if (!state) return fallback;
        return selector(state) ?? fallback;
      } catch (e) {
        console.error('[storeHooks] Test selector error:', e);
        return fallback;
      }
    }
  };
}