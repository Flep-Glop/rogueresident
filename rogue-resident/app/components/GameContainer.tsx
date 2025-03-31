// app/components/GameContainer.tsx
'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import GameMap from './GameMap';
import ChallengeContainer from './challenges/ChallengeContainer';
import PlayerStats from './PlayerStats';
import Inventory from './Inventory';
import StorageCloset from './challenges/StorageCloset';
import BossNode from './challenges/BossNode';
import HillHomeScene from './HillHomeScene';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';

export default function GameContainer() {
  const { currentNodeId, completedNodeIds, map, gamePhase, setGamePhase, player, completeDay } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  const { flashScreen, playSound } = useGameEffects();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
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
  
  // Handle transition to night phase
  const handleDayCompletion = () => {
    setIsTransitioning(true);
    
    // Play sound effect
    if (playSound) playSound('click');
    
    // Apply screen transition effect
    if (flashScreen) flashScreen('white');
    
    // Short delay for transition effect
    setTimeout(() => {
      completeDay();
      setIsTransitioning(false);
    }, 500);
  };

  // Handle transition back to day phase from night
  const handleNightCompletion = () => {
    setIsTransitioning(true);
    
    // Play sound effect
    if (playSound) playSound('click');
    
    // Apply screen transition effect
    if (flashScreen) flashScreen('white');
    
    // Short delay for transition effect
    setTimeout(() => {
      useGameStore.getState().completeNight();
      setIsTransitioning(false);
    }, 500);
  };
  
  // Determine what to render in the main content area
  const renderMainContent = () => {
    // If we're transitioning, show a loading screen
    if (isTransitioning) {
      return (
        <div className="flex items-center justify-center h-full bg-background">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-clinical border-t-transparent rounded-full mx-auto mb-4"></div>
            <PixelText className="text-lg text-text-primary">Transitioning...</PixelText>
          </div>
        </div>
      );
    }
    
    // Based on game phase, render different content
    switch (gamePhase) {
      case 'night':
        return (
          <HillHomeScene onComplete={handleNightCompletion} />
        );
        
      case 'day':
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
        return (
          <div className="relative h-full">
            <GameMap />
            
            {/* Day completion button */}
            <div className="absolute bottom-4 right-4">
              <PixelButton
                className="bg-surface hover:bg-clinical text-text-primary px-4 py-2"
                onClick={handleDayCompletion}
              >
                End Day
              </PixelButton>
            </div>
          </div>
        );
        
      default:
        return <GameMap />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 bg-dark-gray border-b border-border">
        <div className="flex justify-between items-center">
          <PixelText className="text-2xl text-text-primary font-pixel-heading">Rogue Resident</PixelText>
          
          {/* Game phase indicator */}
          <div className="px-3 py-1 rounded-full bg-surface-dark">
            <PixelText className="text-sm">
              {gamePhase === 'day' ? '☀️ Day Phase' : gamePhase === 'night' ? '🌙 Night Phase' : ''}
            </PixelText>
          </div>
        </div>
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