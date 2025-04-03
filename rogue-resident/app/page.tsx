// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import GameContainer from './components/GameContainer';
import StartScreen from './components/StartScreen';
import GameOver from './components/GameOver';
import VictoryScreen from './components/VictoryScreen';
import PhaseTransition from './components/PhaseTransition';

export default function Home() {
  const { gameState, gamePhase, player } = useGameStore();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<'day' | 'night'>('day');
  const [transitionTo, setTransitionTo] = useState<'day' | 'night'>('night');
  
  // Store initialization protection
  useEffect(() => {
    const store = useGameStore.getState();
    console.log("🎮 Store state in page.tsx:", store);
    
    // Only initialize if needed
    if (store.gameState === 'not_started' && !store.map) {
      console.log("🔰 Initializing game from page component");
      // Use the store action directly to avoid potential hooks issues
      store.startGame();
      
      // Log the result after a short delay to ensure state updates
      setTimeout(() => {
        console.log("🗺️ Map initialization result:", {
          mapExists: !!useGameStore.getState().map,
          nodeCount: useGameStore.getState().map?.nodes?.length || 0
        });
      }, 100);
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
  
  // Handle phase transitions
  useEffect(() => {
    // We need to track previous phase to know transition direction
    const prevPhase = transitionTo;
    
    if (gamePhase === 'day' && prevPhase === 'night') {
      // If we're transitioning from night to day
      setTransitionFrom('night');
      setTransitionTo('day');
      setShowTransition(true);
    } else if (gamePhase === 'night' && prevPhase === 'day') {
      // If we're transitioning from day to night
      setTransitionFrom('day');
      setTransitionTo('night');
      setShowTransition(true);
    }
  }, [gamePhase, transitionTo]);
  
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