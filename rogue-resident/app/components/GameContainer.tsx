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
import { PixelText } from './PixelThemeProvider';

export default function GameContainer() {
  const { currentNodeId, completedNodeIds, map } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  
  // Get current node details from map to determine node type
  const getCurrentNodeType = () => {
    if (!currentNodeId || !map) return null;
    
    const currentNode = map.nodes.find(node => node.id === currentNodeId);
    if (!currentNode) {
      console.warn(`Current node ${currentNodeId} not found in map!`);
      return null;
    }
    
    return currentNode.type;
  };
  
  // Start challenge when node is selected
  useEffect(() => {
    if (currentNodeId && !currentChallenge && !completedNodeIds.includes(currentNodeId)) {
      const nodeType = getCurrentNodeType();
      console.log(`Starting interaction with ${nodeType} node: ${currentNodeId}`);
      
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
  }, [currentNodeId, currentChallenge, completedNodeIds, startChallenge, map]);
  
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
      
      if (nodeType === 'boss') return <BossNode />;
      // if (nodeType === 'vendor') return <VendorNode />;
    }
    
    // Default: show the map
    return <GameMap />;
  };
  
  const handleDayCompletion = () => {
    const { map, completedNodeIds, player, setGamePhase } = useGameStore.getState();
    
    // Can't complete if no map
    if (!map) {
      console.error("Cannot complete day: No map available");
      return;
    }
    
    // Check if player has run out of health
    if (player.health <= 0) {
      console.log("Player has run out of health, transitioning to game over");
      setGamePhase('game_over');
      return;
    }
    
    // Check if boss is defeated
    const isBossDefeated = completedNodeIds.includes(map.bossNodeId);
    
    // Check if all non-boss nodes are completed
    const allNodesCompleted = map.nodes
      .filter(node => node.type !== 'boss')
      .every(node => completedNodeIds.includes(node.id));
      
    // Check if player has enough completed nodes to progress
    // (Allow progress even if not everything is complete)
    const hasMinimumProgress = completedNodeIds.length >= 3;
    
    if (isBossDefeated) {
      console.log("Boss defeated, transitioning to victory");
      setGamePhase('victory');
      return;
    }
    
    if (allNodesCompleted || hasMinimumProgress) {
      console.log("Day complete, transitioning to night phase");
      setGamePhase('night');
      return;
    }
    
    console.log("Cannot complete day: Not enough progress");
    // Maybe show a message to the player that they need to complete more nodes
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 bg-dark-gray border-b border-border">
        <PixelText className="text-2xl text-text-primary font-pixel-heading">Rogue Resident</PixelText>
      </header>
      <main className="flex flex-1">
        <section className="w-3/4 relative">
          {renderMainContent()}
        </section>
        <aside className="w-1/4 overflow-auto">
          <PlayerStats />
          <Inventory />
        </aside>
      </main>
      
      {/* Add scanlines effect over the entire interface */}
      <div className="pointer-events-none fixed inset-0 scanlines opacity-10 z-50"></div>
    </div>
  );
}