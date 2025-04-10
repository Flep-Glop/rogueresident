// app/core/utils/storeAnalyzer.ts
/**
 * Zustand Store Access Analyzer
 * 
 * Provides diagnostic tools to detect:
 * 1. Large object extraction instead of primitives
 * 2. Unstable selector functions
 * 3. Function references that change on every render
 * 4. Improper subscription patterns
 */

import { useRef, useEffect } from 'react';

// Track subscriptions by component to detect patterns
interface SubscriptionPattern {
  component: string;
  store: string;
  selector: string;
  extractedType: 'primitive' | 'object' | 'function' | 'mixed';
  extractSize: number;  // Approx size of extracted data (bytes)
  subCount: number;     // How many times subscribed
  renderCount: number;  // Component render count
  lastRender: number;   // Timestamp
  selectorStable: boolean; // Is the selector stable?
}

// Global storage for subscription patterns
const subscriptionPatterns: Record<string, SubscriptionPattern> = {};

/**
 * Wraps a store to detect non-Chamber access patterns
 * @param store The Zustand store to monitor
 * @param storeName Name of the store for logging
 */
export function createMonitoredStore(store: any, storeName: string) {
  const originalStore = store;
  
  // Create a proxy around the store
  const monitoredStore = new Proxy(originalStore, {
    apply: function(target, thisArg, argumentsList) {
      // Only track in development
      if (process.env.NODE_ENV === 'production') {
        return Reflect.apply(target, thisArg, argumentsList);
      }
      
      try {
        // Get calling component from stack trace
        const stack = new Error().stack || '';
        const callerMatch = stack.match(/at\s+(\w+)\s+\(/);
        const caller = callerMatch ? callerMatch[1] : 'unknown';
        
        // Get selector function as string
        const selector = argumentsList[0]?.toString() || 'unknown';
        
        // Call original function to get result
        const result = Reflect.apply(target, thisArg, argumentsList);
        
        // Analyze result type and size
        const resultType = typeof result;
        const isObject = resultType === 'object' && result !== null;
        const isFunction = resultType === 'function';
        const isPrimitive = !isObject && !isFunction;
        
        // Determine extract type
        let extractedType: 'primitive' | 'object' | 'function' | 'mixed' = 'primitive';
        if (isObject) extractedType = 'object';
        else if (isFunction) extractedType = 'function';
        
        // Calculate approximate size
        const extractSize = getApproxSize(result);
        
        // Check if selector is using anonymous function (unstable)
        const selectorStable = !selector.includes('function anonymous');
        
        // Create identifier for this pattern
        const patternId = `${caller}:${storeName}:${selector.substring(0, 40)}`;
        
        // Update pattern tracking
        if (!subscriptionPatterns[patternId]) {
          subscriptionPatterns[patternId] = {
            component: caller,
            store: storeName,
            selector: selector.substring(0, 100),
            extractedType,
            extractSize,
            subCount: 0,
            renderCount: 0,
            lastRender: Date.now(),
            selectorStable
          };
        }
        
        subscriptionPatterns[patternId].subCount += 1;
        subscriptionPatterns[patternId].renderCount += 1;
        subscriptionPatterns[patternId].lastRender = Date.now();
        
        // Log non-chamber pattern access
        if (process.env.NODE_ENV !== 'production') {
          if (!isPrimitive || !selectorStable) {
            const isBad = (isObject && extractSize > 500) || 
                          !selectorStable ||
                          subscriptionPatterns[patternId].subCount > 10;
                          
            if (isBad) {
              console.warn(
                `%c[StoreAnalyzer] Non-Chamber access pattern in ${caller}:`, 
                'color: #f97316; font-weight: bold'
              );
              console.warn(`  - Store: ${storeName}`);
              console.warn(`  - Type: ${extractedType}`);
              console.warn(`  - Size: ~${extractSize} bytes`);
              console.warn(`  - Stable Selector: ${selectorStable ? 'Yes' : 'No ⚠️'}`);
              
              if (extractSize > 1000) {
                console.warn('  - Consider extracting only needed primitives');
              }
              if (!selectorStable) {
                console.warn('  - Use createStableSelector or useCallback for selector');
              }
            }
          }
        }
        
        return result;
      } catch (error) {
        // Don't break application if analysis fails
        console.error('[StoreAnalyzer] Error monitoring store access:', error);
        return Reflect.apply(target, thisArg, argumentsList);
      }
    }
  });
  
  return monitoredStore;
}

/**
 * Calculate approximate size of an object in bytes
 */
function getApproxSize(obj: any): number {
  if (obj === null || obj === undefined) return 0;
  
  const type = typeof obj;
  
  if (type === 'number') return 8;
  if (type === 'string') return obj.length * 2;
  if (type === 'boolean') return 4;
  if (type === 'object') {
    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + getApproxSize(item), 0);
    }
    
    return Object.keys(obj).reduce((size, key) => {
      // Avoid infinite recursion
      if (obj[key] === obj) return size + 8;
      return size + key.length * 2 + getApproxSize(obj[key]);
    }, 0);
  }
  if (type === 'function') return 0; // Functions don't count toward size
  
  return 8; // Default size for unknown types
}

/**
 * Get suspicious store access patterns
 */
export function getStoreAccessIssues() {
  return Object.values(subscriptionPatterns)
    .filter(pattern => {
      return (
        (pattern.extractedType === 'object' && pattern.extractSize > 500) ||
        !pattern.selectorStable ||
        pattern.subCount > 20
      );
    })
    .sort((a, b) => b.extractSize - a.extractSize);
}

/**
 * Reset subscription tracking
 */
export function resetStoreMonitoring() {
  Object.keys(subscriptionPatterns).forEach(key => {
    subscriptionPatterns[key].subCount = 0;
    subscriptionPatterns[key].renderCount = 0;
  });
}

/**
 * Hook to analyze store access patterns in a component
 */
export function useStoreAccessAnalysis(componentName: string) {
  const renderCountRef = useRef(0);
  
  useEffect(() => {
    renderCountRef.current += 1;
    
    // Check if any pattern for this component exists
    const componentPatterns = Object.values(subscriptionPatterns)
      .filter(p => p.component === componentName);
    
    if (componentPatterns.length > 0) {
      console.log(`[StoreAnalyzer] ${componentName} store access:`);
      componentPatterns.forEach(pattern => {
        console.log(`  - ${pattern.store}: ${pattern.extractedType} (~${pattern.extractSize} bytes)`);
      });
    }
    
    // Return cleanup function
    return () => {};
  });
  
  return renderCountRef.current;
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__STORE_ANALYZER__ = {
    getIssues: getStoreAccessIssues,
    reset: resetStoreMonitoring,
    patterns: () => subscriptionPatterns
  };
}

// Create tracked versions of common stores
export function createTrackedStores() {
  // Import this function dynamically to avoid import cycles
  // Call it in your _app.tsx or init.ts
  try {
    // Example usage - replace with your actual stores
    // const trackedGameStore = createMonitoredStore(useGameStore, 'gameStore');
    // const trackedResourceStore = createMonitoredStore(useResourceStore, 'resourceStore');
    
    console.log('[StoreAnalyzer] Store monitoring initialized');
  } catch (error) {
    console.error('[StoreAnalyzer] Failed to create tracked stores:', error);
  }
}