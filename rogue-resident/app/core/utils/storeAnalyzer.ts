// app/core/utils/storeAnalyzer.ts
/**
 * Zustand Store Access Analyzer
 * 
 * Provides diagnostic tools to detect:
 * 1. Large object extraction instead of primitives
 * 2. Unstable selector functions
 * 3. Function references that change on every render
 * 4. Improper subscription patterns
 * 
 * Enhanced with better performance and memory management.
 */

import { useRef, useEffect } from 'react';

// ======================================================
// TYPES & CONSTANTS
// ======================================================

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

// Size thresholds for warnings (in bytes)
const SIZE_THRESHOLDS = {
  SMALL: 100,    // Primitives and tiny objects
  MEDIUM: 500,   // Medium objects that might be OK
  LARGE: 2000,   // Large objects that should be avoided
  HUGE: 10000    // Huge objects that will definitely cause performance issues
};

// Maximum patterns to track to prevent memory leaks
const MAX_PATTERNS = 1000;

// ======================================================
// STORE STATE
// ======================================================

// Global storage for subscription patterns
const subscriptionPatterns: Record<string, SubscriptionPattern> = {};

// Tracked stores for monitoring
const monitoredStores: Record<string, any> = {};

// Stats for monitoring
const stats = {
  patternCount: 0,
  nonChamberAccesses: 0,
  primitiveAccesses: 0,
  objectAccesses: 0,
  functionAccesses: 0,
  unstableSelectorCount: 0,
  largeObjectCount: 0
};

// ======================================================
// MONITORING FUNCTIONS
// ======================================================

/**
 * Wraps a store to detect non-Chamber access patterns
 * @param store The Zustand store to monitor
 * @param storeName Name of the store for logging
 */
export function createMonitoredStore(store: any, storeName: string) {
  // Skip in production for performance
  if (process.env.NODE_ENV === 'production') {
    return store;
  }
  
  // Don't monitor the same store twice
  if (monitoredStores[storeName]) {
    console.warn(`[StoreAnalyzer] Store "${storeName}" is already being monitored.`);
    return monitoredStores[storeName];
  }
  
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
        
        // Skip tracking for known utility functions
        if (
          caller === 'usePrimitiveStoreValue' || 
          caller === 'usePrimitiveValues' ||
          caller === 'useStableStoreValue' ||
          caller === 'getSnapshot'
        ) {
          // These are our optimized hooks, so don't warn about them
          return Reflect.apply(target, thisArg, argumentsList);
        }
        
        // Get selector function as string for analysis
        const selector = argumentsList[0]?.toString() || 'unknown';
        const selectorStr = selector.length > 100 ? selector.substring(0, 100) + '...' : selector;
        
        // Call original function to get result
        const result = Reflect.apply(target, thisArg, argumentsList);
        
        // Analyze result type and size
        const resultType = typeof result;
        const isObject = resultType === 'object' && result !== null;
        const isFunction = resultType === 'function';
        const isPrimitive = !isObject && !isFunction;
        
        // Determine extract type
        let extractedType: 'primitive' | 'object' | 'function' | 'mixed' = 'primitive';
        if (isObject) {
          extractedType = 'object';
          stats.objectAccesses++;
        } else if (isFunction) {
          extractedType = 'function';
          stats.functionAccesses++;
        } else {
          stats.primitiveAccesses++;
        }
        
        // Calculate approximate size
        const extractSize = getApproxSize(result);
        
        // Check if selector is using anonymous function (unstable)
        const selectorStable = !selector.includes('function anonymous');
        if (!selectorStable) {
          stats.unstableSelectorCount++;
        }
        
        // Check for large objects
        if (isObject && extractSize > SIZE_THRESHOLDS.LARGE) {
          stats.largeObjectCount++;
        }
        
        // Create identifier for this pattern
        const patternId = `${caller}:${storeName}:${selectorStr.substring(0, 40)}`;
        
        // Limit the number of tracked patterns to prevent memory leaks
        if (!subscriptionPatterns[patternId] && stats.patternCount >= MAX_PATTERNS) {
          // Clean up old patterns (remove least recently used)
          const oldestPattern = Object.entries(subscriptionPatterns)
            .sort(([, a], [, b]) => a.lastRender - b.lastRender)[0];
          
          if (oldestPattern) {
            delete subscriptionPatterns[oldestPattern[0]];
            stats.patternCount--;
          }
        }
        
        // Update pattern tracking
        if (!subscriptionPatterns[patternId]) {
          subscriptionPatterns[patternId] = {
            component: caller,
            store: storeName,
            selector: selectorStr,
            extractedType,
            extractSize,
            subCount: 0,
            renderCount: 0,
            lastRender: Date.now(),
            selectorStable
          };
          stats.patternCount++;
        }
        
        // Update existing pattern
        subscriptionPatterns[patternId].subCount += 1;
        subscriptionPatterns[patternId].renderCount += 1;
        subscriptionPatterns[patternId].lastRender = Date.now();
        
        // Log non-chamber pattern access
        if (process.env.NODE_ENV !== 'production') {
          // Check for concerning patterns
          const isBad = (isObject && extractSize > SIZE_THRESHOLDS.LARGE) || 
                        !selectorStable ||
                        subscriptionPatterns[patternId].subCount > 10;
                        
          if (isBad) {
            stats.nonChamberAccesses++;
            
            // Don't log too frequently for the same pattern
            if (subscriptionPatterns[patternId].subCount === 1 || 
                subscriptionPatterns[patternId].subCount % 10 === 0) {
              console.warn(
                `%c[StoreAnalyzer] Non-Chamber access pattern in ${caller}:`, 
                'color: #f97316; font-weight: bold'
              );
              console.warn(`  - Store: ${storeName}`);
              console.warn(`  - Type: ${extractedType}`);
              console.warn(`  - Size: ~${extractSize} bytes`);
              console.warn(`  - Stable Selector: ${selectorStable ? 'Yes' : 'No ⚠️'}`);
              
              if (extractSize > SIZE_THRESHOLDS.LARGE) {
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
  
  // Store reference for future lookups
  monitoredStores[storeName] = monitoredStore;
  
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
    // Handle cycles with a WeakSet
    const seen = new WeakSet();
    
    function getSize(obj: any): number {
      // Handle cycles
      if (obj === null || obj === undefined) return 0;
      if (typeof obj !== 'object') return 8; // Basic size for primitives
      if (seen.has(obj)) return 0; // Already counted
      
      seen.add(obj);
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.reduce((size, item) => size + getSize(item), 0) + 32; // Array overhead
      }
      
      // Handle objects
      let size = 40; // Object overhead
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          size += key.length * 2; // Key size in UTF-16
          size += getSize(obj[key]); // Value size
        }
      }
      
      return size;
    }
    
    return getSize(obj);
  }
  
  if (type === 'function') return 0; // Functions don't count toward size
  
  return 8; // Default size for unknown types
}

/**
 * Get suspicious store access patterns
 */
export function getStoreAccessIssues(): any[] {
  return Object.values(subscriptionPatterns)
    .filter(pattern => {
      return (
        (pattern.extractedType === 'object' && pattern.extractSize > SIZE_THRESHOLDS.MEDIUM) ||
        !pattern.selectorStable ||
        pattern.subCount > 20
      );
    })
    .sort((a, b) => b.extractSize - a.extractSize)
    .map(pattern => ({
      component: pattern.component,
      store: pattern.store,
      extractedType: pattern.extractedType,
      extractSize: pattern.extractSize,
      selectorStable: pattern.selectorStable,
      subCount: pattern.subCount,
      recommendation: getRecommendation(pattern)
    }));
}

/**
 * Generate recommendation based on pattern
 */
function getRecommendation(pattern: SubscriptionPattern): string {
  const issues: string[] = [];
  
  if (pattern.extractedType === 'object' && pattern.extractSize > SIZE_THRESHOLDS.MEDIUM) {
    issues.push("Extract primitives instead of objects");
  }
  
  if (!pattern.selectorStable) {
    issues.push("Use stable selector function (wrapped in useCallback)");
  }
  
  if (pattern.subCount > 20) {
    issues.push("Check for excessive store subscription frequency");
  }
  
  return issues.join(", ");
}

/**
 * Reset subscription tracking
 */
export function resetStoreMonitoring(): void {
  // Clear all patterns
  for (const key in subscriptionPatterns) {
    delete subscriptionPatterns[key];
  }
  
  // Reset stats
  stats.patternCount = 0;
  stats.nonChamberAccesses = 0;
  stats.primitiveAccesses = 0;
  stats.objectAccesses = 0;
  stats.functionAccesses = 0;
  stats.unstableSelectorCount = 0;
  stats.largeObjectCount = 0;
  
  console.log('[StoreAnalyzer] Store monitoring reset');
}

/**
 * Hook to analyze store access patterns in a component
 */
export function useStoreAccessAnalysis(componentName: string): number {
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

/**
 * Create tracked versions of common stores
 */
export function createTrackedStores(): void {
  // Call this function in your _app.tsx or init.ts
  try {
    console.log('[StoreAnalyzer] Store monitoring initialized');
    
    // Re-export window debugging functions
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      (window as any).__STORE_ANALYZER__ = {
        getIssues: getStoreAccessIssues,
        reset: resetStoreMonitoring,
        getPatterns: () => subscriptionPatterns,
        getStats: () => stats,
        monitorStore: createMonitoredStore
      };
    }
    
  } catch (error) {
    console.error('[StoreAnalyzer] Failed to create tracked stores:', error);
  }
}

// Utility function to monitor a store on demand
export function monitorStore(storeName: string, storeHook: any): any {
  if (process.env.NODE_ENV === 'production') {
    return storeHook;
  }
  
  return createMonitoredStore(storeHook, storeName);
}

export default {
  createMonitoredStore,
  getStoreAccessIssues,
  resetStoreMonitoring,
  useStoreAccessAnalysis,
  createTrackedStores,
  monitorStore
};