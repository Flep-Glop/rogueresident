// app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { initializeSystems } from './core/init';
import GameContainer from './components/GameContainer';
import DebugStatePanel from './components/debug/DebugStatePanel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Main App Page
 * 
 * Entry point for the Rogue Resident experience with quick access to
 * vertical slice mode for developers.
 */
export default function MainApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDevTools, setShowDevTools] = useState(process.env.NODE_ENV !== 'production');
  const router = useRouter();
  
  // Initialize core systems on mount
  useEffect(() => {
    // Ensure initialization happens only once
    if (!isInitialized) {
      console.log('🚀 Initializing core systems...');
      initializeSystems();
      setIsInitialized(true);
    }
    
    // Check for keyboard shortcut to toggle dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle dev tools
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDevTools(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInitialized]);
  
  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl text-blue-300 mb-4">
            Initializing Rogue Resident
          </h1>
          <div className="w-48 h-2 bg-gray-800 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full relative">
      {/* Main game container */}
      <GameContainer />
      
      {/* Debug panel in development */}
      {process.env.NODE_ENV !== 'production' && <DebugStatePanel />}
      
      {/* Developer tools floating panel */}
      {showDevTools && (
        <div className="fixed bottom-4 right-4 bg-gray-900/90 p-4 rounded-lg shadow-xl z-50">
          <h3 className="font-bold text-white mb-3">Developer Tools</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <Link
              href="/vertical-slice"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-center rounded transition-colors"
            >
              Vertical Slice Mode
            </Link>
            
            <button
              onClick={() => {
                localStorage.removeItem('rogue-resident-game');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            >
              Clear State & Reload
            </button>
            
            <button
              onClick={() => setShowDevTools(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Hide Dev Tools
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            Press Ctrl+Shift+D to toggle this panel
          </div>
        </div>
      )}
    </div>
  );
}