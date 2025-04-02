// app/components/GameContainer.tsx
'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import GameMap from './GameMap';
import SimplifiedMap from './SimplifiedMap'; // Import the enhanced simplified map
import ChallengeContainer from './challenges/ChallengeContainer';
import PlayerStats from './PlayerStats';
import Inventory from './Inventory';
import StorageCloset from './challenges/StorageCloset';
import BossNode from './challenges/BossNode';
import KapoorLINACCalibration from './challenges/KapoorLINACCalibration';
import HillHomeScene from './HillHomeScene';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import CharacterInteractionNode from './challenges/CharacterInteractionNode';

interface GameContainerProps {
  useSimplifiedMap?: boolean; // Flag to use the simplified map
}

/**
 * GameContainer - Main game interface container with enhanced visual treatments
 * 
 * Features:
 * - Elegant phase transitions with visual feedback
 * - Adaptive sidebar with collapsible behavior
 * - Contextual content rendering based on node types
 * - Visual effects for game state changes
 */
export default function GameContainer({ useSimplifiedMap = true }: GameContainerProps) {
  const { currentNodeId, completedNodeIds, map, gamePhase, player, completeDay } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  const { flashScreen, playSound } = useGameEffects();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'in' | 'out'>('in');
  
  // Get current node details from map to determine node type
  const getCurrentNodeType = () => {
    if (!currentNodeId || !map) return null;
    
    // Special handling for simplified map
    if (useSimplifiedMap) {
      if (currentNodeId === 'qa-1') return 'kapoor-calibration';
      if (currentNodeId === 'experimental-1') return 'quinn-experiment';
      if (currentNodeId === 'boss-ionix') return 'boss-ionix';
      if (currentNodeId === 'storage-1') return 'storage';
      if (currentNodeId === 'clinical-1') return 'clinical';
      if (currentNodeId === 'qualification-1') return 'qualification';
      
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
  
  // Handle transition to night phase with enhanced visual feedback
  const handleDayCompletion = () => {
    setIsTransitioning(true);
    setTransitionDirection('out');
    
    // Play transition sound effect
    if (playSound) playSound('phase-transition');
    
    // Apply screen transition effect
    if (flashScreen) flashScreen('white');
    
    // Short delay for transition effect
    setTimeout(() => {
      completeDay();
      setTransitionDirection('in');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 500);
  };

  // Handle transition back to day phase from night with enhanced visual feedback
  const handleNightCompletion = () => {
    setIsTransitioning(true);
    setTransitionDirection('out');
    
    // Play transition sound effect
    if (playSound) playSound('phase-transition');
    
    // Apply screen transition effect
    if (flashScreen) flashScreen('white');
    
    // Short delay for transition effect
    setTimeout(() => {
      useGameStore.getState().completeNight();
      setTransitionDirection('in');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 500);
  };
  
  // Determine what to render in the main content area
  const renderMainContent = () => {
    // If we're transitioning, show a loading screen with direction
    if (isTransitioning) {
      return (
        <div className="flex items-center justify-center h-full bg-background">
          <div className={`text-center transition-all duration-500 transform
            ${transitionDirection === 'out' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="animate-spin w-12 h-12 border-4 border-clinical border-t-transparent rounded-full mx-auto mb-4"></div>
            <PixelText className="text-lg text-text-primary glow-text">
              {gamePhase === 'day' ? 'Night Approaches...' : 'Dawn Breaks...'}
            </PixelText>
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
        if (currentNodeId && !completedNodeIds.includes(currentNodeId)) {
          const nodeType = getCurrentNodeType();
          
          // Handle Dr. Kapoor's calibration node
          if (nodeType === 'kapoor-calibration') {
            return <KapoorLINACCalibration />;
          }
          
          // Handle Dr. Quinn's experimental node
          if (nodeType === 'quinn-experiment') {
            return <CharacterInteractionNode />;
          }
          
          // Handle storage node
          if (nodeType === 'storage') {
            return <StorageCloset />;
          }
          
          // Handle boss node
          if (nodeType === 'boss-ionix' || nodeType === 'boss') {
            return <BossNode />;
          }
          
          // If there's an active challenge (for clinical and other nodes)
          if (currentChallenge) {
            return <ChallengeContainer />;
          }
        }
        
        // Default: show the map (either simplified or original)
        return useSimplifiedMap ? <SimplifiedMap /> : <GameMap />;
        
      default:
        return useSimplifiedMap ? <SimplifiedMap /> : <GameMap />;
    }
  };

  // Toggle sidebar with animation
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    
    // Play UI feedback sound
    if (playSound) playSound('click');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 bg-dark-gray/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <PixelText className="text-2xl text-text-primary font-pixel-heading glow-text">
            Rogue Resident
          </PixelText>
          
          <div className="flex items-center space-x-4">
            {/* Game phase indicator with enhanced styling */}
            <div className="px-3 py-1 rounded-full bg-surface-dark flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${gamePhase === 'day' ? 'bg-yellow-300' : 'bg-blue-400'} animate-pulse-slow`}></div>
              <PixelText className="text-sm">
                {gamePhase === 'day' ? 'Day Phase' : gamePhase === 'night' ? 'Night Phase' : ''}
              </PixelText>
            </div>
            
            {/* Sidebar toggle button with enhanced feedback */}
            <button 
              className="p-2 bg-surface hover:bg-clinical transition-colors enhanced-button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? '◀' : '▶'}
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex flex-1 relative overflow-hidden">
        {/* Main content area with smooth width transition */}
        <section className={`
          transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-full' : 'w-[calc(100%-320px)]'} relative
        `}>
          {renderMainContent()}
        </section>
        
        {/* Sidebar with smooth width transition */}
        <aside 
          className={`
            transition-all duration-300 ease-in-out
            ${sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[320px] opacity-100'}
            overflow-hidden border-l border-border
          `}
        >
          <PlayerStats />
          <Inventory />
        </aside>
        
        {/* Collapsed sidebar indicator - small floating player stats */}
        {sidebarCollapsed && (
          <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm pixel-borders-thin p-2 z-40">
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
      
      {/* Add pixel noise overlay for retro effect */}
      <div className="pointer-events-none fixed inset-0 pixel-noise z-40"></div>
    </div>
  );
}