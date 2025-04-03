// app/components/GameContainer.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import SimplifiedMap from './SimplifiedMap';
import PlayerStats from './PlayerStats';
import Inventory from './Inventory';
import StorageCloset from './challenges/StorageCloset';
import BossNode from './challenges/BossNode';
import KapoorCalibration from './challenges/KapoorCalibration';
import HillHomeScene from './HillHomeScene';
import PhaseTransition from './PhaseTransition';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import CharacterInteractionNode from './challenges/CharacterInteractionNode';
import Journal from './journal/Journal';
import JournalIcon from './journal/JournalIcon';

interface GameContainerProps {
  useSimplifiedMap?: boolean;
}

/**
 * GameContainer - Main game interface container with enhanced phase transitions
 * and added loading state management to prevent display flicker
 */
export default function GameContainer({ useSimplifiedMap = true }: GameContainerProps) {
  const { currentNodeId, completedNodeIds, map, gamePhase, player, completeDay, currentDay } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Loading state management
  const [assetsReady, setAssetsReady] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const initialLoadComplete = useRef(false);
  
  // Phase transition states
  const [showTransition, setShowTransition] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<'day' | 'night'>('day');
  const [transitionTo, setTransitionTo] = useState<'day' | 'night'>('night');
  
  // UI states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Initial game loading and asset preparation
  useEffect(() => {
    const prepareGame = async () => {
      // Don't run initialization multiple times
      if (initialLoadComplete.current) return;
      
      try {
        // Simulate asset loading (replace with actual asset loading logic)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Mark assets as ready
        setAssetsReady(true);
        
        // For new game, we want to show the day transition first
        if (currentDay === 1 && gamePhase === 'day' && !initialLoadComplete.current) {
          setTransitionFrom('night');
          setTransitionTo('day');
          setShowTransition(true);
        } else {
          // For saved games or continuing, just mark as initialized
          setGameInitialized(true);
        }
        
        initialLoadComplete.current = true;
      } catch (error) {
        console.error('Failed to load game assets:', error);
        // Still mark as initialized to avoid blocking the UI completely
        setAssetsReady(true);
        setGameInitialized(true);
      }
    };
    
    prepareGame();
  }, [currentDay, gamePhase]);
  
  // In the getCurrentNodeType function - add explicit support for kapoorCalibration type
  const getCurrentNodeType = () => {
    if (!currentNodeId || !map) {
      console.log("No current node or map available");
      return null;
    }
    
    // Explicit logging to debug routing
    const currentNode = map.nodes.find(node => node.id === currentNodeId);
    if (!currentNode) {
      console.warn(`Current node ${currentNodeId} not found in map!`);
      return null;
    }
    
    console.log(`Node ${currentNodeId} has type: ${currentNode.type}`);
    return currentNode.type;
  };
  
  // In your useEffect for node selection, update the routing logic
  useEffect(() => {
    if (currentNodeId && !currentChallenge && !completedNodeIds.includes(currentNodeId)) {
      const nodeType = getCurrentNodeType();
      console.log(`Starting interaction with ${nodeType} node: ${currentNodeId}`);
      
      // Direct routing for specific node types
      switch(nodeType) {
        case 'kapoorCalibration':
          console.log("Launching KapoorCalibration experience");
          startChallenge({
            id: currentNodeId,
            type: 'calibration',
            content: {
              title: "LINAC Output Calibration",
              character: "kapoor",
              initialized: true
            }
          });
          break;
          
        case 'boss-ionix':
          // Boss encounter
          startChallenge({
            id: currentNodeId,
            type: 'boss',
            content: { 
              title: "IONIX Challenge",
              character: "quinn",
              phase: 1,
              initialized: true 
            }
          });
          break;
          
        default:
          console.log(`Using generic initialization for node: ${currentNodeId}`);
          if (nodeType) {
            startChallenge({
              id: currentNodeId,
              type: nodeType,
              content: { initialized: true }
            });
          }
      }
    }
  }, [currentNodeId, currentChallenge, completedNodeIds, startChallenge, map]);
    
  // Handle transition to night phase
  const handleDayCompletion = () => {
    // Mark that we're transitioning from day to night
    setTransitionFrom('day');
    setTransitionTo('night');
    setShowTransition(true);
    
    // Play transition sound
    if (playSound) playSound('phase-transition');
  };
  
  // Handle transition back to day phase
  const handleNightCompletion = () => {
    // Mark that we're transitioning from night to day
    setTransitionFrom('night');
    setTransitionTo('day');
    setShowTransition(true);
    
    // Play transition sound
    if (playSound) playSound('phase-transition');
  };
  
  // Called when the phase transition animation completes
  const handleTransitionComplete = () => {
    // Update the game state based on transition direction
    if (transitionFrom === 'day' && transitionTo === 'night') {
      completeDay();
    } else if (transitionFrom === 'night' && transitionTo === 'day') {
      useGameStore.getState().completeNight();
    }
    
    // Hide the transition component and mark game as initialized
    setShowTransition(false);
    setGameInitialized(true);
  };
  
  // Enhanced renderMainContent with dual-approach node resolution 
  // Uses both explicit ID routing and type-based adaptive routing
  const renderMainContent = () => {
    // First check if we're in night phase - preserve the rhythm of the day/night cycle
    if (gamePhase === 'night') {
      return <HillHomeScene onComplete={handleNightCompletion} />;
    }
    
    // If we have a selected unfinished node, determine appropriate content to render
    if (currentNodeId && !completedNodeIds.includes(currentNodeId)) {
      // Get node type for more semantic routing decisions
      const nodeType = getCurrentNodeType();
      console.log(`Rendering content for node: ${currentNodeId} (type: ${nodeType || 'unknown'})`);
      
      // Type-based routing for our specialized experiences
      if (nodeType === 'kapoorCalibration') {
        console.log("Launching specialized Kapoor Calibration sequence");
        return <KapoorCalibration />;
      }
      
      // Explicit ID-based routing with fallbacks for legacy compatibility
      // This hybrid approach ensures robustness during the transition
      switch (currentNodeId) {
        case 'kapoorCalibrationNode':
          return <KapoorCalibration />;
          
        case 'qa-1':
          // Legacy calibration node ID
          return <KapoorCalibration />;
          
        case 'experimental-1':
          return <CharacterInteractionNode character="quinn" />;
          
        case 'storage-1':
          return <StorageCloset />;
          
        case 'clinical-1':
          return <CharacterInteractionNode character="kapoor" />;
          
        case 'boss-ionix':
          return <BossNode />;
          
        case 'qualification-1':
          return <CharacterInteractionNode character="kapoor" />;
          
        case 'start':
          return <CharacterInteractionNode character="kapoor" />;
          
        default:
          // Adaptive fallback based on node type when no explicit routing exists
          console.log(`No explicit routing for node ID "${currentNodeId}", attempting type-based routing...`);
          
          if (nodeType === 'qa' || nodeType === 'calibration') {
            return <KapoorCalibration />;
          } else if (nodeType === 'storage') {
            return <StorageCloset />;
          } else if (nodeType === 'boss' || nodeType === 'boss-ionix') {
            return <BossNode />;
          } else {
            // Last-resort character-based routing
            const node = map?.nodes.find(n => n.id === currentNodeId);
            if (node?.character) {
              console.log(`Falling back to character-based interaction for ${node.character}`);
              return <CharacterInteractionNode character={node.character as any} />;
            }
            
            // If all else fails, show a helpful error with recovery option
            console.warn(`Unable to resolve appropriate component for node: ${currentNodeId}`);
            return (
              <div className="p-6 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[400px]">
                <PixelText className="text-xl text-warning-light mb-4">Encounter Resolution Issue</PixelText>
                <PixelText className="text-text-secondary text-center mb-6">
                  The system couldn't determine how to render this node type.
                  <br />
                  Node ID: {currentNodeId}
                  <br />
                  Type: {nodeType || 'unknown'}
                </PixelText>
                <PixelButton
                  className="bg-clinical text-white"
                  onClick={() => useGameStore.getState().setCurrentNode(null)} // Return to map view
                >
                  Return to Map
                </PixelButton>
              </div>
            );
          }
      }
    }
    
    // Default: show the map as our hub space
    // This acts as both our fallback and our intentional "between encounters" state
    return <SimplifiedMap />;
  };

  // Add a debug overlay to help during development
  const debugOverlay = process.env.NODE_ENV !== 'production' && (
    <div className="fixed bottom-0 left-0 bg-black/70 text-white p-2 font-mono text-xs z-50">
      Current Node: {currentNodeId || 'none'} | Type: {getCurrentNodeType() || 'none'}
    </div>
  );

  // Toggle sidebar with animation
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    
    // Play UI feedback sound
    if (playSound) playSound('click');
  };

  // Show loading state if assets aren't ready or game isn't initialized
  if (!assetsReady) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="pixel-borders bg-surface-dark p-6 max-w-md text-center">
          <div className="w-12 h-12 border-4 border-clinical border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <PixelText className="text-2xl text-text-primary">Loading Rogue Resident</PixelText>
          <PixelText className="text-sm text-text-secondary mt-2">Preparing hospital systems...</PixelText>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Phase Transition Component (Overlay) */}
      {showTransition && (
        <PhaseTransition 
          fromPhase={transitionFrom} 
          toPhase={transitionTo} 
          onComplete={handleTransitionComplete} 
        />
      )}
    
      {/* Only show game content when initialized and not in transition */}
      {gameInitialized && !showTransition && (
        <>
          <header className="p-4 bg-dark-gray/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
            <div className="flex justify-between items-center">
              <PixelText className="text-2xl text-text-primary font-pixel-heading glow-text">
                Rogue Resident
              </PixelText>
              
              <div className="flex items-center space-x-4">
                {/* Game phase indicator with enhanced styling */}
                <div className="px-3 py-1 rounded-full bg-surface-dark flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${gamePhase === 'day' ? 'bg-yellow-300' : 'bg-blue-400'} animate-pulse-slow`}></div>
                  <PixelText className="text-sm">
                    {gamePhase === 'day' ? `Day ${currentDay} - Hospital` : gamePhase === 'night' ? 'Night - Hill Home' : ''}
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
            
            {/* Journal Icon and Component */}
            <JournalIcon />
            <Journal />
          </main>
          
          {/* Add scanlines effect over the entire interface */}
          <div className="pointer-events-none fixed inset-0 scanlines opacity-10 z-50"></div>
          
          {/* Add pixel noise overlay for retro effect */}
          <div className="pointer-events-none fixed inset-0 pixel-noise z-40"></div>
        </>
      )}
      
      {/* Always show debug overlay regardless of initialization state */}
      {debugOverlay}
    </div>
  );
}