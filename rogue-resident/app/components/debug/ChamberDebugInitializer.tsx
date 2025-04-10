'use client';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import GameContainer from './components/GameContainer';
import JournalAcquisitionAnimation from './components/journal/JournalAcquisitionAnimation';
import PixelThemeProvider from './components/PixelThemeProvider';
import { useCoreInitialization } from './core/init';

// Fix the import to use absolute path with the @/ alias
import ChamberDebugInitializer from '@/app/components/debug/ChamberDebugInitializer';

/**
 * Vertical Slice Entry Point
 * 
 * Entry point for the Rogue Resident vertical slice. This component:
 * 1. Initializes core systems (event bus, state machine, progression resolver)
 * 2. Provides error boundary for crash resilience
 * 3. Wraps the game in necessary theme providers
 * 4. Handles journal acquisition animation
 * 5. Initializes Chamber Pattern debug utilities
 */
export default function VerticalSlicePage() {
  // Initialize core systems
  const { initialized, reinitialize } = useCoreInitialization();
  
  // Track journal animation state
  const [journalAnimationCompleted, setJournalAnimationCompleted] = useState(false);
  
  // Make the reinitialize function available globally for emergency recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__FORCE_REINITIALIZE__ = reinitialize;
    }
    
    console.log(`Core systems ${initialized ? 'are initialized' : 'initialization pending'}`);
    
    // Cleanup when component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__FORCE_REINITIALIZE__;
      }
    };
  }, [initialized, reinitialize]);

  // Fallback UI for critical errors
  const ErrorFallback = ({ error, resetErrorBoundary }: { 
    error: Error, 
    resetErrorBoundary: () => void 
  }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Game Error</h1>
        <div className="bg-gray-800 p-4 rounded mb-4 font-mono text-sm overflow-auto max-h-64">
          {error.message}
          {error.stack && (
            <pre className="mt-2 text-xs text-gray-400">
              {error.stack.split('\n').slice(0, 5).join('\n')}
            </pre>
          )}
        </div>
        <button 
          onClick={() => {
            // First reinitialize core systems
            reinitialize();
            console.log('Core systems reinitialized after error');
            // Then reset the error boundary
            resetErrorBoundary();
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded ml-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Core systems will be reinitialized in the ErrorFallback component
        console.log('Error boundary reset');
      }}
    >
      {/* Initialize Chamber Pattern debug utilities */}
      {process.env.NODE_ENV !== 'production' && <ChamberDebugInitializer />}
      
      <div className="min-h-screen bg-black text-white">
        <GameContainer />
        {/* Journal acquisition animation overlay */}
        <JournalAcquisitionAnimation 
          onComplete={() => setJournalAnimationCompleted(true)} 
        />
      </div>
    </ErrorBoundary>
  );
}