// app/components/GameContainer.tsx
'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import GameMap from './GameMap';
import SimplifiedMap from './SimplifiedMap'; // Import the new simplified map
import ChallengeContainer from './challenges/ChallengeContainer';
import PlayerStats from './PlayerStats';
import Inventory from './Inventory';
import StorageCloset from './challenges/StorageCloset';
import BossNode from './challenges/BossNode';
import KapoorLINACCalibration from './challenges/KapoorLINACCalibration'; // Import the new calibration component
import HillHomeScene from './HillHomeScene';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import CharacterInteractionNode from './challenges/CharacterInteractionNode';

interface GameContainerProps {
  useSimplifiedMap?: boolean; // Optional flag to use the simplified 3-node map
}

export default function GameContainer({ useSimplifiedMap = false }: GameContainerProps) {
  const { currentNodeId, completedNodeIds, map, gamePhase, setGamePhase, player, completeDay } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  const { flashScreen, playSound } = useGameEffects();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Get current node details from map to determine node type
  const getCurrentNodeType = () => {
    if (!currentNodeId || !map) return null;
    
    // Special handling for simplified map
    if (useSimplifiedMap) {
      // Parse node ID to get index (e.g., 'node-0' => 0)
      const nodeIndex = parseInt(currentNodeId.split('-')[1]);
      
      if (nodeIndex === 0) return 'kapoor-calibration';
      if (nodeIndex === 1) return 'quinn-experiment';
      if (nodeIndex === 2) return 'boss'; 
      
      return null;
    }
    
    // Original map logic
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
        // Special node handling for simplified map
        if (useSimplifiedMap && currentNodeId) {
          const nodeType = getCurrentNodeType();
          
          // Handle Dr. Kapoor's calibration node (first node in simplified map)
          if (nodeType === 'kapoor-calibration' && !completedNodeIds.includes(currentNodeId)) {
            return <KapoorLINACCalibration />;
          }
          
          // Handle Dr. Quinn's experimental node
          if (nodeType === 'quinn-experiment' && !completedNodeIds.includes(currentNodeId)) {
            return <CharacterInteractionNode />;
          }
          
          // For other node types, pass through to existing handling
        }
        
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
        
        // Default: show the map (either simplified or original)
        return (
          <div className="relative h-full">
            {useSimplifiedMap ? <SimplifiedMap /> : <GameMap />}
            
            {/* Floating bottom bar with End Day button and game stats */}
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-surface/90 pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-30">
              <div className="flex items-center">
                <span className="px-2 py-1 bg-danger text-white text-sm mr-2">❤️ {player.health}/{player.maxHealth}</span>
                <span className="px-2 py-1 bg-clinical text-white text-sm">💡 {player.insight}</span>
              </div>
              
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
        return useSimplifiedMap ? <SimplifiedMap /> : <GameMap />;
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 bg-dark-gray border-b border-border">
        <div className="flex justify-between items-center">
          <PixelText className="text-2xl text-text-primary font-pixel-heading">Rogue Resident</PixelText>
          
          <div className="flex items-center space-x-4">
            {/* Game phase indicator */}
            <div className="px-3 py-1 rounded-full bg-surface-dark">
              <PixelText className="text-sm">
                {gamePhase === 'day' ? '☀️ Day Phase' : gamePhase === 'night' ? '🌙 Night Phase' : ''}
              </PixelText>
            </div>
            
            {/* Sidebar toggle button */}
            <button 
              className="p-2 bg-surface hover:bg-clinical transition-colors"
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? '◀' : '▶'}
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex flex-1 relative">
        <section className={`${sidebarCollapsed ? 'w-full' : 'w-[calc(100%-320px)]'} relative transition-all duration-300`}>
          {renderMainContent()}
        </section>
        
        <aside 
          className={`${sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[320px] opacity-100'} overflow-auto transition-all duration-300`}
        >
          <PlayerStats />
        </aside>
        
        {/* Collapsed sidebar indicator - small floating player stats */}
        {sidebarCollapsed && (
          <div className="absolute top-4 right-4 bg-surface/90 pixel-borders-thin p-2 z-40">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-danger rounded-full"></span>
              <PixelText className="text-sm">Health: {player.health}/{player.maxHealth}</PixelText>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-clinical rounded-full"></span>
              <PixelText className="text-sm">Insight: {player.insight}</PixelText>
            </div>
          </div>
        )}
      </main>
      
      {/* Add scanlines effect over the entire interface */}
      <div className="pointer-events-none fixed inset-0 scanlines opacity-10 z-50"></div>
    </div>
  );
}