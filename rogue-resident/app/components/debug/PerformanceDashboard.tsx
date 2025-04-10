// app/components/debug/PerformanceDashboard.tsx
'use client';
/**
 * Performance Dashboard
 * 
 * A Debug UI component that shows real-time performance metrics
 * for the Chamber Pattern implementation, including:
 * - Render counts by component
 * - State access patterns
 * - Frame timings during animations
 * - Memory usage patterns
 */
import React, { useState, useEffect, useRef } from 'react';
import { useRenderTracker, getSuspiciousComponents } from '@/app/core/utils/chamberDebug';
import { getStoreAccessIssues } from '@/app/core/utils/storeAnalyzer';

export default function PerformanceDashboard() {
  // Track this component's renders
  const renderCount = useRenderTracker('PerformanceDashboard');
  
  // Local state
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'renders'|'stores'|'fps'|'memory'>('renders');
  const [fps, setFps] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [suspiciousComponents, setSuspiciousComponents] = useState<any[]>([]);
  const [storeIssues, setStoreIssues] = useState<any[]>([]);
  
  // Refs
  const fpsTimestampsRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Toggle dashboard visibility
  const toggleDashboard = () => {
    setIsExpanded(prev => !prev);
  };
  
  // FPS calculation
  const calculateFps = () => {
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
    
    // Calculate FPS
    setFps(fpsTimestampsRef.current.length);
    
    // Continue measuring
    rafIdRef.current = requestAnimationFrame(calculateFps);
  };
  
  // Memory usage measurement
  const measureMemory = async () => {
    try {
      // @ts-ignore - performance.memory is non-standard but available in Chrome
      if (performance.memory) {
        setMemoryUsage({
          // @ts-ignore
          total: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)),
          // @ts-ignore
          used: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
          // @ts-ignore
          limit: Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024))
        });
      } else {
        setMemoryUsage({ unsupported: true });
      }
    } catch (e) {
      console.warn('Memory measurement error:', e);
      setMemoryUsage({ error: true });
    }
  };
  
  // Check for suspicious components
  const checkSuspiciousComponents = () => {
    try {
      // @ts-ignore - This function comes from window global
      if (window.__CHAMBER_DEBUG__?.getSuspiciousComponents) {
        // @ts-ignore
        setSuspiciousComponents(window.__CHAMBER_DEBUG__.getSuspiciousComponents());
      }
      
      // @ts-ignore - This function comes from window global
      if (window.__STORE_ANALYZER__?.getIssues) {
        // @ts-ignore
        setStoreIssues(window.__STORE_ANALYZER__.getIssues());
      }
    } catch (e) {
      console.warn('Error checking suspicious components:', e);
    }
  };
  
  // Start/stop measurements based on dashboard visibility
  useEffect(() => {
    // Only run measurements when dashboard is expanded
    if (isExpanded) {
      // Start FPS measurement
      rafIdRef.current = requestAnimationFrame(calculateFps);
      
      // Start memory and component checks
      intervalIdRef.current = setInterval(() => {
        measureMemory();
        checkSuspiciousComponents();
      }, 1000);
    } else {
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
    }
    
    // Cleanup on unmount
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isExpanded]);
  
  // Render different tabs based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'renders':
        return (
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Suspicious Components</h3>
            {suspiciousComponents.length > 0 ? (
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
            {storeIssues.length > 0 ? (
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
  };
  
  // Reset all measurements
  const handleReset = () => {
    // Reset FPS
    fpsTimestampsRef.current = [];
    setFps(0);
    
    // Reset suspicious components
    // @ts-ignore - This function comes from window global
    if (window.__CHAMBER_DEBUG__?.resetStats) {
      // @ts-ignore
      window.__CHAMBER_DEBUG__.resetStats();
    }
    
    // Reset store analysis
    // @ts-ignore - This function comes from window global
    if (window.__STORE_ANALYZER__?.reset) {
      // @ts-ignore
      window.__STORE_ANALYZER__.reset();
    }
    
    setSuspiciousComponents([]);
    setStoreIssues([]);
  };
  
  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
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
              onClick={() => setActiveTab('renders')}
            >
              Renders
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'stores' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => setActiveTab('stores')}
            >
              Stores
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'fps' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => setActiveTab('fps')}
            >
              FPS
            </button>
            <button
              className={`px-3 py-1 text-xs ${activeTab === 'memory' ? 'bg-purple-900 text-white' : 'text-purple-300'}`}
              onClick={() => setActiveTab('memory')}
            >
              Memory
            </button>
          </div>
          
          {/* Tab Content */}
          {renderTabContent()}
          
          {/* Footer */}
          <div className="border-t border-purple-800 p-1 text-xs text-gray-400 flex justify-between">
            <span>Dashboard Renders: {renderCount}</span>
            <span>Chamber Pattern v1.0</span>
          </div>
        </div>
      )}
    </div>
  );
}