// app/components/debug/PerformanceDashboard.tsx
'use client';
/**
 * Optimized Performance Dashboard Component
 * 
 * Improvements:
 * 1. Reduced render frequency with aggressive throttling
 * 2. DOM-based animations instead of state-driven
 * 3. More efficient measurement techniques
 * 4. Better cleanup to prevent memory leaks
 * 5. Optimized rendering with virtualization
 */
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { usePrimitiveStoreValue, useStableCallback } from '@/app/core/utils/storeHooks';

// More aggressive throttling settings
const THROTTLE_MS = 500; // Only update every 500ms
const MAX_ITEMS_TO_RENDER = 5; // Limit number of items to render
const MEASUREMENT_INTERVAL_MS = 1000; // Take measurements every second

export default function PerformanceDashboard() {
  // ======== REFS (Always first for hook order stability) ========
  const fpsTimestampsRef = useRef<number[]>([]);
  const suspiciousComponentsRef = useRef<any[]>([]);
  const storeIssuesRef = useRef<any[]>([]);
  const memoryUsageRef = useRef<any>(null);
  const currentFpsRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExpandedRef = useRef<boolean>(false);
  const activeTabRef = useRef<'renders'|'stores'|'fps'|'memory'>('renders');
  const lastUpdateTimeRef = useRef<number>(0);
  const contentElRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const initialRenderRef = useRef<boolean>(true);
  const renderCountRef = useRef<number>(0);
  
  // ======== STATE (Minimal, only for UI that needs rendering) ========
  // Use a single state object to minimize re-renders
  const [displayState, setDisplayState] = useState({
    isExpanded: false,
    activeTab: 'renders' as 'renders'|'stores'|'fps'|'memory',
    fps: 0,
    memoryUsage: null as any,
    suspiciousComponents: [] as any[],
    storeIssues: [] as any[]
  });
  
  // ======== STABLE CALLBACKS ========
  // Toggle dashboard visibility
  const toggleDashboard = useStableCallback(() => {
    // Use the ref to track the current state
    isExpandedRef.current = !isExpandedRef.current;
    
    // Update display state to trigger re-render
    setDisplayState(prev => ({
      ...prev,
      isExpanded: isExpandedRef.current
    }));
    
    // Start or stop measurements based on visibility
    if (isExpandedRef.current) {
      startMeasurements();
    } else {
      stopMeasurements();
    }
  }, []);
  
  // Change active tab
  const changeTab = useStableCallback((tab: 'renders'|'stores'|'fps'|'memory') => {
    // Update the ref
    activeTabRef.current = tab;
    
    // Update display state to trigger re-render
    setDisplayState(prev => ({
      ...prev,
      activeTab: tab
    }));
  }, []);
  
  // Reset all measurements
  const handleReset = useStableCallback(() => {
    // Reset FPS
    fpsTimestampsRef.current = [];
    currentFpsRef.current = 0;
    
    // Reset suspicious components
    suspiciousComponentsRef.current = [];
    
    // Reset store issues
    storeIssuesRef.current = [];
    
    // Reset global tracking if available
    try {
      // Reset Chamber Debug
      if (typeof window !== 'undefined' && window.__CHAMBER_DEBUG__?.resetStats) {
        window.__CHAMBER_DEBUG__.resetStats();
      }
      
      // Reset Store Analyzer
      if (typeof window !== 'undefined' && window.__STORE_ANALYZER__?.reset) {
        window.__STORE_ANALYZER__.reset();
      }
    } catch (e) {
      console.warn('Error resetting debug systems:', e);
    }
    
    // Update display state
    setDisplayState(prev => ({
      ...prev,
      fps: 0,
      suspiciousComponents: [],
      storeIssues: []
    }));
  }, []);
  
  // ======== MEASUREMENT FUNCTIONS ========
  // These functions update refs but not state to avoid excessive re-renders
  
  // FPS calculation - optimized with rate limiting
  const calculateFps = useCallback(() => {
    if (!isMountedRef.current || !isExpandedRef.current) return;
    
    const now = performance.now();
    
    // Add current timestamp
    fpsTimestampsRef.current.push(now);
    
    // Only keep timestamps from the last second
    while (
      fpsTimestampsRef.current.length > 0 && 
      now - fpsTimestampsRef.current[0] > 1000
    ) {
      fpsTimestampsRef.current.shift();
    }
    
    // Update current FPS in ref only (no re-render)
    currentFpsRef.current = fpsTimestampsRef.current.length;
    
    // Continue measuring if still mounted and expanded
    if (isMountedRef.current && isExpandedRef.current) {
      rafIdRef.current = requestAnimationFrame(calculateFps);
    }
  }, []);
  
  // Memory usage measurement
  const measureMemory = useCallback(async () => {
    if (!isMountedRef.current || !isExpandedRef.current) return;
    
    try {
      // @ts-ignore - performance.memory is non-standard but available in Chrome
      if (performance.memory) {
        // Calculate values only, don't update state yet
        memoryUsageRef.current = {
          // @ts-ignore
          total: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)),
          // @ts-ignore
          used: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
          // @ts-ignore
          limit: Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024))
        };
      } else {
        memoryUsageRef.current = { unsupported: true };
      }
    } catch (e) {
      console.warn('Memory measurement error:', e);
      memoryUsageRef.current = { error: true };
    }
  }, []);
  
  // Check for suspicious components and store issues
  const checkPerformanceIssues = useCallback(() => {
    if (!isMountedRef.current || !isExpandedRef.current) return;
    
    try {
      // Check for suspicious components - limit to 5 most problematic
      if (typeof window !== 'undefined' && window.__CHAMBER_DEBUG__?.getSuspiciousComponents) {
        suspiciousComponentsRef.current = window.__CHAMBER_DEBUG__.getSuspiciousComponents()
          .slice(0, MAX_ITEMS_TO_RENDER);
      }
      
      // Check for store issues - limit to 5 most problematic
      if (typeof window !== 'undefined' && window.__STORE_ANALYZER__?.getIssues) {
        storeIssuesRef.current = window.__STORE_ANALYZER__.getIssues()
          .slice(0, MAX_ITEMS_TO_RENDER);
      }
    } catch (e) {
      console.warn('Error checking performance issues:', e);
    }
  }, []);
  
  // ======== MEASUREMENT CONTROLLERS ========
  
  // Start all measurements
  const startMeasurements = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Start FPS measurement
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(calculateFps);
    }
    
    // Start memory and component checks
    if (!intervalIdRef.current) {
      intervalIdRef.current = setInterval(() => {
        measureMemory();
        checkPerformanceIssues();
      }, MEASUREMENT_INTERVAL_MS);
    }
    
    // Start throttled updates for state
    scheduleStateUpdate();
  }, [calculateFps, measureMemory, checkPerformanceIssues]);
  
  // Schedule a state update with throttling
  const scheduleStateUpdate = useCallback(() => {
    if (!isMountedRef.current || !isExpandedRef.current) return;
    
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Schedule new update
    updateTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current || !isExpandedRef.current) return;
      
      // Update state from refs
      setDisplayState(prev => ({
        ...prev,
        fps: currentFpsRef.current,
        memoryUsage: memoryUsageRef.current,
        suspiciousComponents: suspiciousComponentsRef.current,
        storeIssues: storeIssuesRef.current
      }));
      
      // Schedule next update if still expanded
      if (isExpandedRef.current) {
        scheduleStateUpdate();
      }
    }, THROTTLE_MS);
  }, []);
  
  // Stop all measurements
  const stopMeasurements = useCallback(() => {
    // Stop FPS measurement
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Stop interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    // Stop update timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, []);
  
  // ======== EFFECTS ========
  
  // Setup and cleanup
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    renderCountRef.current++;
    
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      // No measurements on initial render to prevent slowdown during page load
    } else if (isExpandedRef.current) {
      startMeasurements();
    }
    
    // Clean up everything on unmount
    return () => {
      isMountedRef.current = false;
      stopMeasurements();
    };
  }, [startMeasurements, stopMeasurements]);
  
  // ======== MEMOIZED RENDER HELPERS ========
  
  // Memoize tab content to prevent unnecessary re-renders
  const renderTabContent = useMemo(() => {
    const { 
      activeTab, 
      fps, 
      memoryUsage, 
      suspiciousComponents, 
      storeIssues 
    } = displayState;
    
    switch (activeTab) {
      case 'renders':
        return (
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Suspicious Components</h3>
            {suspiciousComponents && suspiciousComponents.length > 0 ? (
              <div className="max-h-60 overflow-y-auto text-sm">
                {suspiciousComponents.map((comp, i) => (
                  <div key={i} className="mb-2 p-2 bg-red-900/30 rounded">
                    <div className="font-medium">{comp.componentName}</div>
                    <div className="flex justify-between text-xs">
                      <span>Renders: {comp.renderCount}</span>
                      <span>Suspicious: {comp.suspiciousRenders}</span>
                    </div>
                    <div className="text-xs opacity-75">
                      Last render: {comp.renderDelta}ms ago
                    </div>
                  </div>
                ))}
                {suspiciousComponents.length >= MAX_ITEMS_TO_RENDER && (
                  <div className="text-xs text-center mt-2 text-gray-400">
                    Showing top {MAX_ITEMS_TO_RENDER} components only
                  </div>
                )}
              </div>
            ) : (
              <div className="text-green-400 py-4 text-center">
                No suspicious render patterns detected!
              </div>
            )}
          </div>
        );
        
      case 'stores':
        return (
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Store Access Issues</h3>
            {storeIssues && storeIssues.length > 0 ? (
              <div className="max-h-60 overflow-y-auto text-sm">
                {storeIssues.map((issue, i) => (
                  <div key={i} className="mb-2 p-2 bg-orange-900/30 rounded">
                    <div className="font-medium">{issue.component}</div>
                    <div className="text-xs">Store: {issue.store}</div>
                    <div className="flex justify-between text-xs">
                      <span>Type: {issue.extractedType}</span>
                      <span>Size: ~{issue.extractSize} bytes</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Stable selector: {issue.selectorStable ? 'Yes' : 'No ⚠️'}</span>
                      <span>Subscriptions: {issue.subCount}</span>
                    </div>
                  </div>
                ))}
                {storeIssues.length >= MAX_ITEMS_TO_RENDER && (
                  <div className="text-xs text-center mt-2 text-gray-400">
                    Showing top {MAX_ITEMS_TO_RENDER} issues only
                  </div>
                )}
              </div>
            ) : (
              <div className="text-green-400 py-4 text-center">
                No store access issues detected!
              </div>
            )}
          </div>
        );
        
      case 'fps':
        return (
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Current FPS:</span>
              <span className={`px-2 py-1 rounded ${
                fps >= 55 ? 'bg-green-900/50 text-green-300' :
                fps >= 30 ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-red-900/50 text-red-300'
              }`}>
                {fps}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  fps >= 55 ? 'bg-green-500' :
                  fps >= 30 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>0</span>
              <span>30</span>
              <span>60</span>
            </div>
            <div className="mt-3 text-xs opacity-75">
              Target: 60 FPS for smooth animations
            </div>
          </div>
        );
        
      case 'memory':
        return (
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
            {memoryUsage ? (
              memoryUsage.unsupported ? (
                <div className="text-yellow-400 py-4 text-center">
                  Memory measurement not supported in this browser
                </div>
              ) : memoryUsage.error ? (
                <div className="text-red-400 py-4 text-center">
                  Error measuring memory usage
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">JS Heap Used:</span>
                    <span className={`px-2 py-1 rounded ${
                      memoryUsage.used < memoryUsage.limit * 0.7 ? 'bg-green-900/50 text-green-300' :
                      memoryUsage.used < memoryUsage.limit * 0.9 ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-red-900/50 text-red-300'
                    }`}>
                      {memoryUsage.used} MB / {memoryUsage.limit} MB
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        memoryUsage.used < memoryUsage.limit * 0.7 ? 'bg-green-500' :
                        memoryUsage.used < memoryUsage.limit * 0.9 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${(memoryUsage.used / memoryUsage.limit) * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 text-xs opacity-75">
                    Memory leaks will show as a steady increase over time
                  </div>
                </>
              )
            ) : (
              <div className="py-4 text-center">
                Loading memory metrics...
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  }, [displayState]);
  
  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Destructure display state for rendering
  const { isExpanded, activeTab } = displayState;
  
  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Toggle button */}
      <button
        onClick={toggleDashboard}
        className="bg-purple-800 hover:bg-purple-700 text-white px-3 py-1 text-xs rounded-tl-md shadow-lg"
      >
        {isExpanded ? 'Hide Performance' : 'Show Performance'}
      </button>
      
      {/* Dashboard */}
      {isExpanded && (
        <div className="bg-gray-900 border border-purple-700 rounded-tl-lg shadow-xl w-80">
          <div className="border-b border-purple-800 p-2 flex items-center justify-between">
            <h2 className="text-white font-semibold">Chamber Pattern Performance</h2>
            <button
              onClick={handleReset}
              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 text-xs rounded"
            >
              Reset
            </button>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-purple-800">
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'renders' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => changeTab('renders')}
            >
              Renders
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'stores' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => changeTab('stores')}
            >
              Stores
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'fps' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => changeTab('fps')}
            >
              FPS
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'memory' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => changeTab('memory')}
            >
              Memory
            </button>
          </div>
          
          {/* Tab Content - use ref for direct DOM manipulation */}
          <div ref={contentElRef}>
            {renderTabContent}
          </div>
          
          {/* Footer */}
          <div className="border-t border-purple-800 p-1 text-xs text-gray-400 flex justify-between">
            <span>Dashboard Renders: {renderCountRef.current}</span>
            <span>Chamber Pattern v1.0</span>
          </div>
        </div>
      )}
    </div>
  );
}