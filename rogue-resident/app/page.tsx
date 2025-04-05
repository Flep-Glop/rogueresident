// app/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import GameContainer from './components/GameContainer';
import StartScreen from './components/StartScreen';
import GameOver from './components/GameOver';
import VictoryScreen from './components/VictoryScreen';
import PhaseTransition from './components/PhaseTransition';
import { useGameState } from './core/statemachine/GameStateMachine';
import { initializeSystems } from './core/init';

export default function Home() {
  const { gameState, gamePhase, player } = useGameStore();
  const { isTransitioning, transitionData } = useGameState();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<'day' | 'night'>('day');
  const [transitionTo, setTransitionTo] = useState<'day' | 'night'>('night');
  const mountCountRef = useRef<number>(0);
  const cleanupRef = useRef<boolean>(false);
  const systemsCleanupRef = useRef<(() => void) | null>(null);
  
  // Anti-duplication mount tracking
  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`Home component mounted (count: ${mountCountRef.current})`);
    
    // Set up core systems on mount
    if (!systemsCleanupRef.current) {
      console.log("🚀 Initializing core systems");
      systemsCleanupRef.current = initializeSystems();
    }
    
    // Detect and clean up duplicate mounts after a short delay
    setTimeout(() => {
      const gameContainers = document.querySelectorAll('[data-game-container]');
      if (gameContainers.length > 1) {
        console.warn(`Found ${gameContainers.length} game containers, cleaning extras`);
        
        // Remove all but the first container
        for (let i = 1; i < gameContainers.length; i++) {
          gameContainers[i].remove();
        }
      }
    }, 100);
    
    return () => {
      cleanupRef.current = true;
      console.log("Home component unmounting");
      
      // Clean up core systems
      if (systemsCleanupRef.current) {
        systemsCleanupRef.current();
        systemsCleanupRef.current = null;
      }
    };
  }, []);
  
  // Store initialization if needed
  useEffect(() => {
    // Skip if we're already cleaning up
    if (cleanupRef.current) return;
    
    const store = useGameStore.getState();
    console.log("🎮 Store state in page.tsx:", store);
    
    // Only initialize if needed
    if (store.gameState === 'not_started' && !store.map) {
      console.log("🔰 Initializing game from page component");
      // Use the store action directly to avoid potential hooks issues
      store.startGame();
    }
  }, []);
  
  // DEV-ONLY: Global store debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // @ts-ignore - Development helper
      window.useGameStore = useGameStore;
      
      // @ts-ignore - Development helper
      window.debugGame = () => {
        const store = useGameStore.getState();
        console.table({
          gameState: store.gameState,
          gamePhase: store.gamePhase,
          currentNodeId: store.currentNodeId,
          mapNodes: store?.map?.nodes?.length || 0,
          completedNodes: store.completedNodeIds.length,
          health: store.player.health,
          insight: store.player.insight,
          currentDay: store.currentDay
        });
        return "Game State Debugged";
      };
      
      console.log("🎮 Game debug tools enabled. Run window.debugGame() to inspect state");
    }
  }, []);
  
  // Handle phase transitions based on state machine
  useEffect(() => {
    // If we have transition data from the state machine, use it
    if (isTransitioning && transitionData) {
      const { from, to } = transitionData;
      
      // Set transition direction based on state machine data
      setTransitionFrom(from as 'day' | 'night');
      setTransitionTo(to as 'day' | 'night');
      setShowTransition(true);
    } else if (gamePhase === 'day' && transitionTo === 'night') {
      // If we're transitioning from night to day (legacy support)
      setTransitionFrom('night');
      setTransitionTo('day');
      setShowTransition(true);
    } else if (gamePhase === 'night' && transitionTo === 'day') {
      // If we're transitioning from day to night (legacy support)
      setTransitionFrom('day');
      setTransitionTo('night');
      setShowTransition(true);
    }
  }, [gamePhase, transitionTo, isTransitioning, transitionData]);
  
  // Handle transition completion
  const handleTransitionComplete = () => {
    setShowTransition(false);
  };
  
  // Render based on game state
  if (gameState === 'not_started') {
    return <StartScreen />;
  }

  if (gameState === 'game_over' || player.health <= 0) {
    return <GameOver />;
  }
  
  if (gameState === 'victory') {
    return <VictoryScreen />;
  }

  return (
    <>
      <GameContainer />
      {showTransition && (
        <PhaseTransition 
          fromPhase={transitionFrom} 
          toPhase={transitionTo} 
          onComplete={handleTransitionComplete} 
        />
      )}
    </>
  );
}