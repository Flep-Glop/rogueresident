'use client';
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import GameMap from './GameMap';
import ChallengeContainer from './challenges/ChallengeContainer';
import PlayerStats from './PlayerStats';

export default function GameContainer() {
  const { currentNodeId } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  
  // Start challenge when node is selected
  useEffect(() => {
    if (currentNodeId && !currentChallenge) {
      // For prototype, just use a random clinical challenge
      const randomChallenge = 
        clinicalChallenges[Math.floor(Math.random() * clinicalChallenges.length)];
      
      startChallenge({
        id: currentNodeId,
        type: 'clinical',
        content: randomChallenge,
      });
    }
  }, [currentNodeId, currentChallenge]);
  
  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Rogue Resident</h1>
      </header>
      <main className="flex flex-1">
        <section className="w-3/4 relative">
          {currentChallenge ? <ChallengeContainer /> : <GameMap />}
        </section>
        <aside className="w-1/4 bg-gray-100">
          <PlayerStats />
        </aside>
      </main>
    </div>
  );
}