// app/vertical-slice/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { initializeSystems } from '../core/init';
import GameContainer from '../components/GameContainer';
import VerticalSliceDebugPanel from '../components/debug/VerticalSliceDebugPanel';
import SimplifiedKapoorMap from '../components/vs/SimplifiedKapoorMap';
import { useGameStore } from '../store/gameStore';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';
import { useRouter } from 'next/navigation';
import DebugStatePanel from '../components/debug/DebugStatePanel';
import Link from 'next/link';

/**
 * Vertical Slice Page
 * 
 * A dedicated page that wraps the core game experience in a simplified
 * environment focused solely on validating the Dr. Kapoor calibration flow.
 * 
 * This page initializes essential systems, replaces the map component with
 * a simplified version, and adds specialized debugging tools.
 */
export default function VerticalSlicePage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [useSimplifiedMap, setUseSimplifiedMap] = useState(true);
  const { currentNodeId } = useGameStore();
  
  // Initialize core systems on mount
  useEffect(() => {
    // Ensure initialization happens only once
    if (!isInitialized) {
      try {
        console.log('🚀 Initializing Vertical Slice experience...');
        
        // Initialize core systems
        const cleanupFn = initializeSystems();
        setCleanup(() => cleanupFn);
        setIsInitialized(true);
        
        // Log event
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'verticalSlicePage',
          action: 'initialized',
          metadata: { timestamp: Date.now() }
        });
      } catch (err) {
        console.error('Failed to initialize systems:', err);
        setError(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    // Return cleanup function
    return () => {
      if (cleanup) {
        console.log('🧹 Cleaning up Vertical Slice systems...');
        cleanup();
      }
    };
  }, [isInitialized, cleanup]);
  
  // Function to restart the vertical slice
  const restartVerticalSlice = () => {
    // Clear local storage
    localStorage.removeItem('rogue-resident-game');
    
    // Log event
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'verticalSlicePage',
      action: 'restart',
      metadata: { timestamp: Date.now() }
    });
    
    // Reload the page
    window.location.reload();
  };
  
  // Content to render in map slot if simplified map is enabled
  const mapContent = useSimplifiedMap && !currentNodeId ? (
    <SimplifiedKapoorMap />
  ) : null;
  
  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl text-blue-300 mb-4">
            Initializing Vertical Slice
          </h1>
          <div className="w-48 h-2 bg-gray-800 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
          </div>
          
          {error && (
            <div className="mt-8 p-4 bg-red-900/50 text-red-200 max-w-lg mx-auto rounded">
              <p className="font-bold mb-2">Error:</p>
              <p className="font-mono text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="vs-container h-screen w-full relative">
      {/* Custom map slot wrapper */}
      <div className="h-full w-full relative">
        {/* Main game container - conditionally inject the simplified map */}
        <GameContainer mapSlotContent={mapContent} />
      </div>
      
      {/* Debug panels */}
      <VerticalSliceDebugPanel />
      {process.env.NODE_ENV !== 'production' && <DebugStatePanel />}
      
      {/* Vertical slice controls */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-700 text-white px-4 py-2 rounded-md z-50 flex items-center gap-4">
        <span className="font-bold">VERTICAL SLICE MODE</span>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useSimplifiedMap"
            checked={useSimplifiedMap}
            onChange={(e) => setUseSimplifiedMap(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="useSimplifiedMap" className="text-sm">
            Use Simplified Map
          </label>
        </div>
        
        <button
          onClick={restartVerticalSlice}
          className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white text-sm rounded"
        >
          Restart
        </button>
        
        <Link
          href="/"
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
        >
          Exit VS Mode
        </Link>
      </div>
      
      {/* Visual guide when first loading */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 text-white px-4 py-2 rounded-md z-40 pointer-events-none">
        <p className="text-center text-sm">
          Vertical Slice: Dr. Kapoor Calibration Critical Path
        </p>
      </div>
    </div>
  );
}