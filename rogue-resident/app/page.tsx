// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import GameContainer from './components/GameContainer';
import StartScreen from './components/StartScreen';
import GameOver from './components/GameOver';

export default function Home() {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const { player, resetGame } = useGameStore();
  
  // Check if the player has started a game
  useEffect(() => {
    // If a player has more than 0 health and has started the game,
    // we consider the game in progress
    if (player.health > 0 && gameStarted) {
      // Game is in progress
    } else if (player.health <= 0 && gameStarted) {
      // Player has lost all health
    } else {
      // Game hasn't started yet
    }
  }, [player.health, gameStarted]);

  // Handle game start
  useEffect(() => {
    const handleGameStart = () => {
      setGameStarted(true);
    };

    // Listen for the resetGame function being called
    const unsubscribe = useGameStore.subscribe(
      (state: any, prevState: any) => {
        // If the state was reset (comparing completedNodeIds length as a simple check)
        if (
          prevState.completedNodeIds.length > 0 &&
          state.completedNodeIds.length === 0
        ) {
          handleGameStart();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Render the appropriate screen based on game state
  if (!gameStarted) {
    return <StartScreen />;
  }

  if (player.health <= 0) {
    return <GameOver />;
  }

  return <GameContainer />;
}