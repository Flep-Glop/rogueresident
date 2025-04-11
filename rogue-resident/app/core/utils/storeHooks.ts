// app/core/utils/storeHooks.ts
/**
 * Optimized Chamber Pattern Store Hooks
 * 
 * Improvements:
 * 1. Reduced error logging to prevent console spam
 * 2. Consolidated similar functions to reduce code duplication
 * 3. Better performance with memoization and bailout optimizations
 * 4. Simplified error handling for development vs production
 */

import { useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';

// ========= ERROR HANDLING CONFIG =========

// Centralized error handling configuration
const errorConfig = {
  // Only log the first N errors of each type to avoid console spam
  maxErrorsPerType: 2,
  // Track error counts by type to avoid flooding console
  errorCounts: new Map<string, number>(),
  // Development mode detection
  isDev: process.env.NODE_ENV !== 'production',
  // Log an error with rate limiting
  logError: (errorType: string, message: string, error?: any) => {
    const currentCount = errorConfig.errorCounts.get(errorType) || 0;
    
    if (currentCount < errorConfig.maxErrorsPerType) {
      // Only log in development or for critical errors
      if (errorConfig.isDev || errorType.includes('CRITICAL')) {
        if (error) {
          console.warn(`[storeHooks] ${message}:`, error);
        } else {
          console.warn(`[storeHooks] ${message}`);
        }
      }
      errorConfig.errorCounts.set(errorType, currentCount + 1);
    } else if (currentCount === errorConfig.maxErrorsPerType) {
      // Log a final message that we're suppressing future errors of this type
      console.warn(`[storeHooks] Suppressing further "${errorType}" errors after ${errorConfig.maxErrorsPerType} occurrences`);
      errorConfig.errorCounts.set(errorType, currentCount + 1);
    }
    // Return true if we're over the threshold to allow conditional logic
    return currentCount >= errorConfig.maxErrorsPerType;
  },
  // Reset all error counts
  resetErrorCounts: () => {
    errorConfig.errorCounts.clear();
  }
};

// ========= TYPE UTILITIES =========

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

/**
 * Safely determine if an object is a zustand store
 */
function isZustandStore(obj: any): boolean {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.getState === 'function' && 
         typeof obj.subscribe === 'function';
}

/**
 * Safely determine if an object is a zustand store hook
 */
function isZustandHook(obj: any): boolean {
  return typeof obj === 'function' && 
         (
           // Either it has these methods directly
           (obj.getState && typeof obj.getState === 'function') ||
           // Or it's a hook that returns a state object
           true
         );
}

// ========= CORE STORE ACCESS =========

/**
 * Safely access store state with better error handling
 * Works with any store type and handles initialization gracefully
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
    
    // Case 2: It's a hook function with getState
    if (isZustandHook(store) && typeof store.getState === 'function') {
      const state = store.getState();
      return state || defaultValue as T;
    }
    
    // Case 3: It's a hook function to call directly (unsafe outside components)
    if (typeof store === 'function') {
      // This should only run in callback contexts, not during render
      try {
        return store() || defaultValue as T;
      } catch (e) {
        return defaultValue as T;
      }
    }
    
    // Case 4: It might be the state object itself
    if (typeof store === 'object') {
      return store as T;
    }
    
    // Default: unknown store type
    errorConfig.logError('UNKNOWN_STORE_TYPE', `Unknown store type: ${typeof store}`);
    return defaultValue as T;
  } catch (error) {
    errorConfig.logError('SAFE_GET_STATE', 'Error getting state', error);
    return defaultValue as T;
  }
}

/**
 * Create a safe subscription function that works with any store type
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
      
      // Default: no viable subscription method
      errorConfig.logError('NO_SUBSCRIPTION', 'Cannot create subscription for store');
      return () => {}; // No-op
    } catch (error) {
      errorConfig.logError('SUBSCRIPTION_ERROR', 'Error creating subscription', error);
      return () => {}; // No-op
    }
  };
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
        errorConfig.logError('NON_PRIMITIVE', 'Non-primitive value in primitive selector');
        return fallback !== undefined ? fallback : null as any;
      }
      return value ?? fallback;
    } catch (error) {
      errorConfig.logError('PRIMITIVE_SELECTOR', 'Error in primitive selector', error);
      return fallback;
    }
  };
}

// ========= PRIMARY STORE HOOKS =========

/**
 * Extract a primitive value from a store with optimized performance 
 * and stable references - the core Chamber Pattern hook
 */
export function usePrimitiveStoreValue<StoreType, ValueType extends string | number | boolean | undefined | null>(
  store: any,
  selector: (state: StoreType) => ValueType,
  fallback: ValueType
): ValueType {
  // Create stable selector reference
  const stableSelector = useCallback(selector, []);
  
  // Create getSnapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    try {
      const state = safeGetState<StoreType>(store, null);
      if (!state) return fallback;
      
      let value: any;
      try {
        value = stableSelector(state);
      } catch (e) {
        // Selector execution error
        errorConfig.logError('SELECTOR_ERROR', 'Error in selector execution', e);
        return fallback;
      }
      
      // Validate it's a primitive
      if (isPrimitive(value)) {
        return value ?? fallback;
      }
      
      errorConfig.logError('NON_PRIMITIVE', 'Non-primitive value returned from selector');
      return fallback;
    } catch (error) {
      errorConfig.logError('GET_SNAPSHOT', 'Error in getSnapshot', error);
      return fallback;
    }
  }, [store, stableSelector, fallback]);
  
  // Create subscribe function
  const subscribe = useCallback((callback: () => void) => {
    if (!store) return () => {}; // No-op for null store
    return createSafeSubscription(store)(callback);
  }, [store]);

  // Use sync external store to subscribe to changes
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server version is same as client
  );
}

/**
 * Extract a stable store value that may not be a primitive
 * Use with caution as this can cause unnecessary rerenders if objects change
 */
export function useStableStoreValue<StoreType, ValueType>(
  store: any,
  selector: (state: StoreType) => ValueType
): ValueType | null {
  // Create stable selector reference
  const stableSelector = useCallback(selector, []);
  const valueRef = useRef<ValueType | null>(null);
  
  // Create getSnapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    try {
      const state = safeGetState<StoreType>(store, null);
      if (!state) return valueRef.current;
      
      try {
        const newValue = stableSelector(state);
        
        // Use shallow equality check to reduce rerenders
        if (!shallow(valueRef.current, newValue)) {
          valueRef.current = newValue;
        }
        
        return valueRef.current;
      } catch (e) {
        // Selector execution error
        errorConfig.logError('OBJECT_SELECTOR_ERROR', 'Error in object selector execution', e);
        return valueRef.current;
      }
    } catch (error) {
      errorConfig.logError('OBJECT_GET_SNAPSHOT', 'Error in object getSnapshot', error);
      return valueRef.current;
    }
  }, [store, stableSelector]);
  
  // Create subscribe function
  const subscribe = useCallback((callback: () => void) => {
    if (!store) return () => {}; // No-op for null store
    return createSafeSubscription(store)(callback);
  }, [store]);

  // Use sync external store to subscribe to changes
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server version is same as client
  );
}

/**
 * Extract multiple primitive values from a store at once
 * with optimized performance
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
  // Stabilize selectors and fallbacks object references
  const stableSelectors = useMemo(() => selectors, []);
  const stableFallbacks = useMemo(() => fallbacks, []);
  
  // Use memoized result object to maintain reference stability
  const resultRef = useRef<any>({...fallbacks});
  
  // Create getSnapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    try {
      if (!store) return resultRef.current;
      
      const state = safeGetState<StoreType>(store, null);
      if (!state) return resultRef.current;
      
      let hasChanged = false;
      const newValues: Record<string, any> = {};
      
      // Process each selector
      for (const key in stableSelectors) {
        try {
          const selector = stableSelectors[key];
          let value = selector(state);
          
          // Ensure it's a primitive
          const isValidValue = isPrimitive(value);
          if (!isValidValue) {
            errorConfig.logError('NON_PRIMITIVE_MULTI', `Non-primitive value for key "${key}"`);
            value = stableFallbacks[key as keyof Fallbacks];
          } else {
            value = value ?? stableFallbacks[key as keyof Fallbacks];
          }
          
          // Only mark changed if value actually changed
          if (resultRef.current[key] !== value) {
            hasChanged = true;
          }
          
          newValues[key] = value;
        } catch (e) {
          errorConfig.logError('SELECTOR_MULTI', `Error processing selector for key "${key}"`, e);
          newValues[key] = stableFallbacks[key as keyof Fallbacks];
        }
      }
      
      // Only update reference if values changed
      if (hasChanged) {
        resultRef.current = newValues;
      }
      
      return resultRef.current;
    } catch (error) {
      errorConfig.logError('SNAPSHOT_MULTI', 'Error in getSnapshot for primitiveValues', error);
      return resultRef.current;
    }
  }, [store, stableSelectors, stableFallbacks]);
  
  // Create subscribe function
  const subscribe = useCallback((callback: () => void) => {
    if (!store) return () => {}; // No-op for null store
    return createSafeSubscription(store)(callback);
  }, [store]);

  // Use sync external store to subscribe to changes
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot // Server version is same as client
  );
}

/**
 * Create stable callbacks that maintain reference equality
 * but can always access fresh state
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[] = []
): T {
  const callbackRef = useRef<T>(callback);
  
  // Update ref whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return a stable function
  return useCallback(
    ((...args: any[]) => {
      try {
        return callbackRef.current(...args);
      } catch (error) {
        errorConfig.logError('CALLBACK_EXECUTION', 'Error in stable callback execution', error);
        return undefined;
      }
    }) as T,
    deps
  );
}

// ========= OBSERVER HOOKS =========

/**
 * Hook to observe changes to a store value and execute side effects
 * without triggering re-renders
 */
export function useStoreValueObserver<T, U>(
  store: any,
  selector: (state: T) => U,
  onChange: (newValue: U, prevValue: U | undefined) => void,
  deps: any[] = []
) {
  // Store callback and selector in refs
  const onChangeRef = useRef(onChange);
  const prevValueRef = useRef<U>();
  
  // Update refs when dependencies change
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  const stableSelector = useCallback(selector, []);
  
  // Subscribe to store changes
  useEffect(() => {
    if (!store) return;
    
    // Get initial value
    try {
      const state = safeGetState<T>(store);
      if (state) {
        prevValueRef.current = stableSelector(state);
      }
    } catch (error) {
      errorConfig.logError('OBSERVER_INIT', 'Error getting initial value for observer', error);
    }
    
    // Subscribe to changes
    const unsubscribe = createSafeSubscription(store)(() => {
      try {
        const state = safeGetState<T>(store);
        if (!state) return;
        
        const newValue = stableSelector(state);
        const oldValue = prevValueRef.current;
        
        // Only trigger if value changed (shallow comparison)
        if (!Object.is(newValue, oldValue)) {
          try {
            onChangeRef.current(newValue, oldValue);
          } catch (error) {
            errorConfig.logError('OBSERVER_CALLBACK', 'Error in observer callback', error);
          }
          prevValueRef.current = newValue;
        }
      } catch (error) {
        errorConfig.logError('OBSERVER', 'Error in store observer', error);
      }
    });
    
    return unsubscribe;
  }, [store, stableSelector, ...deps]);
}

/**
 * Hook specifically for observing game phase changes safely
 */
export function useGamePhaseObserver<StoreType>(
  store: any,
  onChange: (newPhase: string, oldPhase: string | undefined) => void,
  deps: any[] = []
): void {
  // Store callback in ref
  const onChangeRef = useRef(onChange);
  const prevPhaseRef = useRef<string | undefined>(undefined);
  
  // Update ref when callback changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Subscribe to store changes
  useEffect(() => {
    if (!store) return;
    
    // Get initial phase
    try {
      const state = safeGetState<any>(store);
      if (state) {
        prevPhaseRef.current = state.gamePhase;
      }
    } catch (error) {
      errorConfig.logError('PHASE_OBSERVER_INIT', 'Error getting initial game phase', error);
    }
    
    // Subscribe to phase changes
    const unsubscribe = createSafeSubscription(store)(() => {
      try {
        const state = safeGetState<any>(store);
        if (!state) return;
        
        // Only trigger if phase changed
        const newPhase = state.gamePhase;
        const oldPhase = prevPhaseRef.current;
        
        if (newPhase !== oldPhase) {
          try {
            onChangeRef.current(newPhase, oldPhase);
          } catch (callbackError) {
            errorConfig.logError('PHASE_CALLBACK', 'Error in game phase observer callback', callbackError);
          }
          prevPhaseRef.current = newPhase;
        }
      } catch (error) {
        errorConfig.logError('PHASE_OBSERVER', 'Error in game phase observer', error);
      }
    });
    
    return unsubscribe;
  }, [store, ...deps]);
}

// ========= STORE CALLBACK UTILITIES =========

/**
 * Creates a callback that gets the latest store state when invoked
 */
export function useStoreCallback<T, Args extends any[]>(
  store: any,
  callback: (state: T, ...args: Args) => void,
  deps: any[] = []
) {
  const callbackRef = useRef(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return a stable callback
  return useCallback(
    (...args: Args) => {
      try {
        const state = safeGetState<T>(store);
        callbackRef.current(state, ...args);
      } catch (error) {
        errorConfig.logError('STORE_CALLBACK', 'Error in store callback', error);
      }
    },
    [store, ...deps]
  );
}

// ========= DEBUGGING SUPPORT =========

/**
 * Reset error tracking - useful for testing
 */
export function resetStoreHookErrors() {
  errorConfig.resetErrorCounts();
  console.log('[storeHooks] Error counts reset');
}

// Add debug API to window in development only
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  window.__STORE_HOOKS_DEBUG__ = {
    resetErrorCount: resetStoreHookErrors,
    getErrorStats: () => {
      const stats: Record<string, number> = {};
      errorConfig.errorCounts.forEach((count, type) => {
        stats[type] = count;
      });
      return stats;
    },
    testSelector: <T, V>(store: any, selector: (state: T) => V, fallback: V): V => {
      try {
        const state = safeGetState<T>(store);
        return selector(state) ?? fallback;
      } catch (e) {
        console.error('[storeHooks] Test selector error:', e);
        return fallback;
      }
    },
    config: {
      setMaxErrors: (max: number) => {
        errorConfig.maxErrorsPerType = max;
        return `Max errors per type set to ${max}`;
      }
    }
  };
}

// ========= EXPORTS =========

// Export primitive value extraction
export {
  usePrimitiveStoreValue,
  usePrimitiveValues,
  useStableStoreValue,
  useStableCallback,
  useStoreValueObserver,
  useGamePhaseObserver,
  useStoreCallback,
  isPrimitive,
  safeGetState,
  createSafeSubscription,
  resetStoreHookErrors
};

// Backward compatibility exports
export const useMemoizedSelector = createPrimitiveSelector;
export const useStableMemo = useMemo;

// Default export
export default {
  usePrimitiveStoreValue,
  usePrimitiveValues,
  useStableStoreValue,
  useStableCallback,
  useStoreValueObserver,
  useGamePhaseObserver,
  createStableSelector,
  createPrimitiveSelector,
  useStoreCallback,
  resetStoreHookErrors
};