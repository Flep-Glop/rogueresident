// app/core/utils/chamberDebug.ts
/**
 * Chamber Pattern Debug Utility
 * 
 * This utility helps identify components that aren't following
 * the Chamber Pattern correctly by monitoring render counts and
 * store subscription patterns.
 *
 * Features:
 * - Render frequency tracking
 * - Suspicious render detection
 * - Chamber Pattern validation
 * - Performance monitoring
 */

import { useRef, useEffect } from 'react';

// ==========================================
// TYPES
// ==========================================

interface RenderStats {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  renderDeltas: number[];   // Track multiple deltas for pattern analysis
  suspiciousRenders: number; // Rapid consecutive renders < RENDER_THRESHOLD_MS apart
  lastRenderDuration: number; // Time spent in render
  totalRenderTime: number;   // Cumulative render time
}

// Global render statistics
const renderStats: Record<string, RenderStats> = {};
const RENDER_THRESHOLD_MS = 50;  // Consider renders < 50ms apart suspicious

// ==========================================
// RUNTIME MONITORING
// ==========================================

/**
 * Tracks render frequency for a component
 * Add this to components you suspect might have Chamber Pattern issues
 * 
 * @param componentName Name of the component being tracked
 * @returns Current render count (for display purposes)
 */
export function useRenderTracker(componentName: string): number {
  // Local refs for this instance
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());
  const renderStartTimeRef = useRef(performance.now());
  
  // Initialize render start time at beginning of component function
  if (renderCountRef.current === 0) {
    renderStartTimeRef.current = performance.now();
  } else {
    renderStartTimeRef.current = performance.now();
  }
  
  // Record render stats in effect
  useEffect(() => {
    // Get render end time as soon as component mounts/updates
    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTimeRef.current;
    
    // Increment render count
    renderCountRef.current += 1;
    
    // Calculate time since last render
    const now = performance.now();
    const delta = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    // Update global stats
    if (!renderStats[componentName]) {
      renderStats[componentName] = {
        componentName,
        renderCount: 0,
        lastRenderTime: now,
        renderDeltas: [],
        suspiciousRenders: 0,
        lastRenderDuration: 0,
        totalRenderTime: 0
      };
    }
    
    // Update stats
    renderStats[componentName].renderCount += 1;
    renderStats[componentName].lastRenderTime = now;
    renderStats[componentName].lastRenderDuration = renderDuration;
    renderStats[componentName].totalRenderTime += renderDuration;
    
    // Keep track of recent render deltas (up to 10)
    renderStats[componentName].renderDeltas.push(delta);
    if (renderStats[componentName].renderDeltas.length > 10) {
      renderStats[componentName].renderDeltas.shift();
    }
    
    // Check for suspicious renders
    if (delta < RENDER_THRESHOLD_MS) {
      renderStats[componentName].suspiciousRenders += 1;
      
      // Log warning for rapid renders
      console.warn(
        `%c[ChamberDebug] ${componentName} re-rendered after just ${delta.toFixed(0)}ms!`, 
        'color: #f87171; font-weight: bold'
      );
    }
    
    // Log each render in development with timing info
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `%c[ChamberDebug] ${componentName} render #${renderStats[componentName].renderCount} (${delta.toFixed(0)}ms since last, took ${renderDuration.toFixed(1)}ms)`,
        delta < RENDER_THRESHOLD_MS ? 'color: #f87171' : 'color: #34d399'
      );
    }
    
    // Cleanup function (runs on unmount)
    return () => {
      if (renderStats[componentName]) {
        renderStats[componentName].lastRenderTime = performance.now();
      }
    };
  });
  
  // Return current render count for component to display if needed
  return renderCountRef.current;
}

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Check if a component is using the Chamber Pattern correctly
 * By examining props and state for object references
 * 
 * @param componentName Name of the component being validated
 * @param props Component props
 * @param state Component state
 * @returns True if component follows Chamber Pattern
 */
export function validateChamberPattern(componentName: string, props: any, state: any): boolean {
  // Validate that no direct store object references exist in props or state
  const objectRefs: string[] = [];
  
  // Check props recursively
  const checkForObjectRefs = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this is a store object (has getState and subscribe)
    if (obj.getState && obj.subscribe) {
      objectRefs.push(`${path} (Store Object)`);
      return;
    }
    
    // Check children
    Object.keys(obj).forEach(key => {
      if (
        typeof obj[key] === 'object' && 
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        checkForObjectRefs(obj[key], `${path}.${key}`);
      }
    });
  };
  
  // Check both props and state
  checkForObjectRefs(props, 'props');
  checkForObjectRefs(state, 'state');
  
  // Report issues
  if (objectRefs.length > 0) {
    console.error(
      `%c[ChamberDebug] ${componentName} is NOT following Chamber Pattern!`,
      'color: #ef4444; font-weight: bold'
    );
    console.error('Object references found:', objectRefs);
    return false;
  }
  
  return true;
}

// ==========================================
// ANALYSIS UTILITIES
// ==========================================

/**
 * Get render statistics for all components
 * @returns All component render statistics
 */
export function getRenderStats(): Record<string, RenderStats> {
  return renderStats;
}

/**
 * Get components with potential Chamber Pattern issues
 * Based on suspicious render patterns
 * 
 * @returns Array of components with suspicious render patterns
 */
export function getSuspiciousComponents(): any[] {
  return Object.values(renderStats)
    .filter(stats => stats.suspiciousRenders > 0)
    .sort((a, b) => b.suspiciousRenders - a.suspiciousRenders)
    .map(stats => {
      // Calculate average render delta time
      const avgDelta = stats.renderDeltas.length > 0
        ? stats.renderDeltas.reduce((sum, delta) => sum + delta, 0) / stats.renderDeltas.length
        : 0;
      
      // Calculate average render duration
      const avgRenderDuration = stats.renderCount > 0
        ? stats.totalRenderTime / stats.renderCount
        : 0;
      
      // Return enhanced stats for display
      return {
        componentName: stats.componentName,
        renderCount: stats.renderCount,
        suspiciousRenders: stats.suspiciousRenders,
        suspiciousPercent: Math.round((stats.suspiciousRenders / Math.max(stats.renderCount, 1)) * 100),
        avgRenderDelta: Math.round(avgDelta),
        avgRenderDuration: Math.round(avgRenderDuration * 10) / 10,
        renderDelta: Math.round(performance.now() - stats.lastRenderTime)
      };
    });
}

/**
 * Reset render statistics
 * Useful after making optimization changes
 */
export function resetRenderStats(): void {
  for (const key in renderStats) {
    // Keep component name but reset all counters
    const componentName = renderStats[key].componentName;
    renderStats[key] = {
      componentName,
      renderCount: 0,
      lastRenderTime: performance.now(),
      renderDeltas: [],
      suspiciousRenders: 0,
      lastRenderDuration: 0,
      totalRenderTime: 0
    };
  }
  console.log('[ChamberDebug] Render statistics reset');
}

/**
 * Find component renders that happen too frequently
 * @returns Components that re-render too often
 */
export function getHighFrequencyComponents(): any[] {
  return Object.values(renderStats)
    .filter(stats => {
      // Check average delta time between renders
      const avgDelta = stats.renderDeltas.length > 0
        ? stats.renderDeltas.reduce((sum, delta) => sum + delta, 0) / stats.renderDeltas.length
        : Infinity;
      
      // Flag components with average render interval < 100ms and multiple renders
      return avgDelta < 100 && stats.renderCount > 5;
    })
    .sort((a, b) => {
      const avgDeltaA = a.renderDeltas.reduce((sum: number, delta: number) => sum + delta, 0) / a.renderDeltas.length;
      const avgDeltaB = b.renderDeltas.reduce((sum: number, delta: number) => sum + delta, 0) / b.renderDeltas.length;
      return avgDeltaA - avgDeltaB; // Sort by average delta (ascending)
    })
    .map(stats => {
      const avgDelta = stats.renderDeltas.reduce((sum: number, delta: number) => sum + delta, 0) / stats.renderDeltas.length;
      return {
        componentName: stats.componentName,
        renderCount: stats.renderCount,
        avgRenderInterval: Math.round(avgDelta),
        renderFrequency: Math.round(1000 / avgDelta * 100) / 100 + ' Hz' // Renders per second
      };
    });
}

/**
 * Get components that spend the most time rendering
 * @returns Components with highest render duration
 */
export function getSlowRenderingComponents(): any[] {
  return Object.values(renderStats)
    .filter(stats => stats.renderCount > 0)
    .sort((a, b) => {
      const avgDurationA = a.totalRenderTime / a.renderCount;
      const avgDurationB = b.totalRenderTime / b.renderCount;
      return avgDurationB - avgDurationA; // Sort by average duration (descending)
    })
    .map(stats => {
      return {
        componentName: stats.componentName,
        renderCount: stats.renderCount,
        avgRenderDuration: Math.round((stats.totalRenderTime / stats.renderCount) * 100) / 100,
        totalRenderTime: Math.round(stats.totalRenderTime),
        lastRenderDuration: Math.round(stats.lastRenderDuration * 100) / 100
      };
    });
}

// ==========================================
// BROWSER INTEGRATION
// ==========================================

// Add to window for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__CHAMBER_DEBUG__ = {
    getStats: getRenderStats,
    getSuspiciousComponents,
    getHighFrequencyComponents,
    getSlowRenderingComponents,
    resetStats: resetRenderStats,
    validateComponent: validateChamberPattern
  };
}

export default {
  useRenderTracker,
  validateChamberPattern,
  getRenderStats,
  getSuspiciousComponents,
  resetRenderStats
};