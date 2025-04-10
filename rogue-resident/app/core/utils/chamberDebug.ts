// app/core/utils/chamberDebug.ts
/**
 * Chamber Pattern Debug Utility
 * 
 * This utility helps identify components that aren't following
 * the Chamber Pattern correctly by monitoring render counts and
 * store subscription patterns.
 */

import { useRef, useEffect } from 'react';

interface RenderStats {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  renderDelta: number;
  suspiciousRenders: number;  // Rapid consecutive renders < 50ms apart
}

// Global render statistics
const renderStats: Record<string, RenderStats> = {};
const RENDER_THRESHOLD_MS = 50;  // Consider renders < 50ms apart suspicious

/**
 * Tracks render frequency for a component
 * Add this to components you suspect might have Chamber Pattern issues
 */
export function useRenderTracker(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const delta = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    // Update global stats
    if (!renderStats[componentName]) {
      renderStats[componentName] = {
        componentName,
        renderCount: 0,
        lastRenderTime: now,
        renderDelta: 0,
        suspiciousRenders: 0
      };
    }
    
    renderStats[componentName].renderCount += 1;
    renderStats[componentName].renderDelta = delta;
    renderStats[componentName].lastRenderTime = now;
    
    if (delta < RENDER_THRESHOLD_MS) {
      renderStats[componentName].suspiciousRenders += 1;
      
      // Log warning for rapid renders
      console.warn(
        `%c[ChamberDebug] ${componentName} re-rendered after just ${delta}ms!`, 
        'color: #f87171; font-weight: bold'
      );
    }
    
    // Log each render in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `%c[ChamberDebug] ${componentName} render #${renderCountRef.current} (${delta}ms since last)`,
        delta < RENDER_THRESHOLD_MS ? 'color: #f87171' : 'color: #34d399'
      );
    }
  });
  
  return renderCountRef.current;
}

/**
 * Check if a component is using the Chamber Pattern correctly
 */
export function validateChamberPattern(componentName: string, props: any, state: any) {
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

/**
 * Get render statistics for all components
 */
export function getRenderStats() {
  return renderStats;
}

/**
 * Get components with potential Chamber Pattern issues
 */
export function getSuspiciousComponents() {
  return Object.values(renderStats)
    .filter(stats => stats.suspiciousRenders > 0)
    .sort((a, b) => b.suspiciousRenders - a.suspiciousRenders);
}

/**
 * Reset render statistics
 */
export function resetRenderStats() {
  Object.keys(renderStats).forEach(key => {
    renderStats[key].renderCount = 0;
    renderStats[key].suspiciousRenders = 0;
  });
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__CHAMBER_DEBUG__ = {
    getStats: getRenderStats,
    getSuspiciousComponents,
    resetStats: resetRenderStats
  };
}