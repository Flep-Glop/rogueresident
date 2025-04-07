// app/page.tsx
"use client";

// Import the emergency hotfix to stabilize the event system first
import '@/app/core/events/InstallEmergencyHotfix';

import { useState, useEffect } from 'react';
import GameContainer from '@/app/components/GameContainer';
import SimplifiedKapoorMap from '@/app/components/vs/SimplifiedKapoorMap';
import VerticalSliceDebugPanel from '@/app/components/debug/VerticalSliceDebugPanel';
import DebugStatePanel from '@/app/components/debug/DebugStatePanel';

/**
 * Main page component with integration of the vertical slice
 * This demonstrates the core loop with the Kapoor calibration path
 */
export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Simple preloader
  useEffect(() => {
    // Simulate asset loading - would be replaced with actual asset loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl text-blue-400 mb-6">Initializing Rogue Resident</h1>
          <div className="w-64 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse transition-all duration-500" style={{width: '70%'}}></div>
          </div>
          <p className="mt-4 text-gray-500">Preparing knowledge constellation...</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className="h-screen w-full relative overflow-hidden bg-black">
      {/* Main game container with vertical slice map integration */}
      <GameContainer 
        mapSlotContent={<SimplifiedKapoorMap />}
      />
      
      {/* Debug panels (only visible in development) */}
      {process.env.NODE_ENV !== 'production' && (
        <>
          <VerticalSliceDebugPanel />
          <DebugStatePanel />
        </>
      )}
    </main>
  );
}