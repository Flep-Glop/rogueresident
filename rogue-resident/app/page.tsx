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
      <GameContainer useSimplifiedMap={true} />
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