// app/components/GameContainer.tsx
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import GameMap from './GameMap';
import ChallengeContainer from './challenges/ChallengeContainer';
import PlayerStats from './PlayerStats';
import Inventory from './Inventory';
import StorageCloset from './challenges/StorageCloset';
import BossNode from './challenges/BossNode';

export default function GameContainer() {
  const { currentNodeId, completedNodeIds } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  
  // Get current node details from map to determine node type
  // Note: In a full implementation, you would retrieve this from your map state
  const getCurrentNodeType = () => {
    // This is a placeholder implementation
    // In reality, you would check currentNodeId against your actual map data
    
    // For prototype, assume fixed node types:
    if (currentNodeId?.includes('storage')) return 'storage';
    if (currentNodeId?.includes('boss')) return 'boss';
    return 'clinical'; // Default to clinical for prototype
  };
  
  // Start challenge when node is selected
  useEffect(() => {
    if (currentNodeId && !currentChallenge && !completedNodeIds.includes(currentNodeId)) {
      const nodeType = getCurrentNodeType();
      
      if (nodeType === 'clinical') {
        // For clinical nodes, start a challenge
        const randomChallenge = 
          clinicalChallenges[Math.floor(Math.random() * clinicalChallenges.length)];
        
        startChallenge({
          id: currentNodeId,
          type: 'clinical',
          content: randomChallenge,
        });
      }
      // Other node types are handled by their respective components
    }
  }, [currentNodeId, currentChallenge, completedNodeIds, startChallenge]);
  
  // Determine what to render in the main content area
  const renderMainContent = () => {
    // If there's an active challenge, show the challenge container
    if (currentChallenge) {
      return <ChallengeContainer />;
    }
    
    // If a node is selected but not a challenge node, render the appropriate component
    if (currentNodeId && !completedNodeIds.includes(currentNodeId)) {
      const nodeType = getCurrentNodeType();
      
      if (nodeType === 'storage') {
        return <StorageCloset />;
      }
      
      // Add other node type components here as you implement them
      if (nodeType === 'boss') return <BossNode />;
      // if (nodeType === 'vendor') return <VendorNode />;
    }
    
    // Default: show the map
    return <GameMap />;
  };
  
  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Rogue Resident</h1>
      </header>
      <main className="flex flex-1">
        <section className="w-3/4 relative">
          {renderMainContent()}
        </section>
        <aside className="w-1/4 bg-gray-100 overflow-auto">
          <PlayerStats />
          <Inventory />
        </aside>
      </main>
    </div>
  );
}