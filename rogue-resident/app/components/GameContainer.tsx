// app/components/GameContainer.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { initializeSystems } from '@/app/core/init';
import SimplifiedKapoorMap from './vs/SimplifiedKapoorMap';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import VerticalSliceDebugPanel from './debug/VerticalSliceDebugPanel';
import ChallengeRouter from './challenges/ChallengeRouter';

/**
 * GameContainer - Core scene router and system initializer
 * 
 * Acts as the primary orchestrator for the game's day/night rhythm, maintaining
 * the critical narrative flow between challenge (day) and reflection (night).
 */
export default function GameContainer() {
  // Game phase state with proper derivation
  const { 
    gamePhase, 
    isDay,
    isNight,
    completeNight,
    completeDay,
    transitionToPhase
  } = useGameState();
  
  // Game store access for node tracking
  const { 
    currentNodeId, 
    map,
    startGame,
    resetGame
  } = useGameStore();
  
  // Component state
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs for stable references
  const initRef = useRef(false);
  const componentMountedRef = useRef(true);
  const eventBus = useEventBus.getState();
  
  // Initialize systems only once
  useEffect(() => {
    // Skip if already initialized
    if (initRef.current) return;
    initRef.current = true;
    
    console.log("🎮 Initializing Vertical Slice systems...");
    
    try {
      // Initialize core systems
      const cleanup = initializeSystems();
      
      // Start game with vertical slice configuration
      if (!map) {
        startGame({ 
          seed: 42, 
          mapType: 'tutorial',
          forceVerticalSlice: true
        });
      }
      
      // Mark as initialized
      setIsInitialized(true);
      
      // Log initialization
      try {
        eventBus.dispatch(
          GameEventType.SESSION_STARTED, 
          { mode: 'vertical_slice', timestamp: Date.now() },
          'gameContainer'
        );
      } catch (error) {
        console.warn("Event dispatch error, continuing anyway:", error);
      }
      
      // Return cleanup function
      return () => {
        componentMountedRef.current = false;
        if (cleanup) cleanup();
      };
    } catch (error) {
      console.error("Initialization failed:", error);
      setHasError(error instanceof Error ? error.message : String(error));
    }
  }, [map, startGame, eventBus]);
  
  // Handle phase transitions
  useEffect(() => {
    // Handle transition animation
    if (gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') {
      setIsTransitioning(true);
      
      // Simulate transition animation
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        
        // Advance to next phase
        if (gamePhase === 'transition_to_night') {
          transitionToPhase('night', 'animation_complete');
        } else if (gamePhase === 'transition_to_day') {
          transitionToPhase('day', 'animation_complete');
        }
      }, 1500); // 1.5 second transition
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, transitionToPhase]);
  
  // Handle night phase completion (for returning to day)
  const handleCompleteNight = () => {
    try {
      eventBus.dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'nightCompleteButton',
          action: 'click',
          metadata: { timestamp: Date.now() }
        },
        'gameContainer'
      );
      completeNight();
    } catch (error) {
      console.error("Error transitioning from night:", error);
      // Force transition as fallback
      completeNight();
    }
  };
  
  // Content router based on game phase
  const renderGameContent = () => {
    // Show loading/error states
    if (!isInitialized) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4">
            <h2 className="text-xl mb-2">Initializing Medical Physics Department...</h2>
            <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4 max-w-md">
            <h2 className="text-xl mb-2 text-red-500">Initialization Error</h2>
            <div className="bg-red-900/20 p-4 rounded mb-4 text-sm">
              {hasError}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                resetGame();
                window.location.reload();
              }}
            >
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }
    
    // Show transition animation
    if (isTransitioning) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-black">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-blue-300 animate-pulse">
              {gamePhase === 'transition_to_night' 
                ? 'Returning to hill home...' 
                : 'Heading to the hospital...'}
            </h2>
          </div>
        </div>
      );
    }
    
    // Night phase (constellation visualization)
    if (isNight) {
      return (
        <HillHomeScene 
          onComplete={handleCompleteNight}
        />
      );
    }
    
    // Map view (day phase navigation)
    if (isDay && !currentNodeId) {
      return <SimplifiedKapoorMap />;
    }
    
    // Challenge view (conversation with Dr. Kapoor)
    if (isDay && currentNodeId) {
      return <ChallengeRouter />;
    }
    
    // Fallback for unexpected states
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center p-4">
          <h2 className="text-xl mb-2 text-yellow-500">Unknown Game State</h2>
          <div>
            <p>Current phase: {gamePhase}</p>
            <p>Current node: {currentNodeId || 'none'}</p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded mt-4"
            onClick={() => {
              // Force day phase as recovery
              transitionToPhase('day', 'recovery');
            }}
          >
            Return to Day Phase
          </button>
        </div>
      </div>
    );
  };
  
  // Main render
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container
      data-phase={gamePhase}
    >
      {/* Main content layout */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <PlayerStats />
          </div>
        </div>
        
        {/* Main gameplay area */}
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>
      </div>
      
      {/* Debug panel for vertical slice mode */}
      <VerticalSliceDebugPanel />
    </div>
  );
}