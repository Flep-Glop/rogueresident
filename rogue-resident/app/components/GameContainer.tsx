
// app/components/GameContainer.tsx
'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import { useJournalStore } from '../store/journalStore';
import { clinicalChallenges } from '../data/clinicalChallenges';
import SimplifiedMap from './SimplifiedMap'; // Import the enhanced simplified map
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
  useSimplifiedMap?: boolean; // Flag to use the simplified map
}

/**
 * GameContainer - Main game interface container with enhanced phase transitions
 * 
 * Features:
 * - Rhythmic day/night transitions with thematic context
 * - Adaptive sidebar with collapsible behavior
 * - Contextual content rendering based on node types
 * - Preservation of progression state across phases
 */
export default function GameContainer({ useSimplifiedMap = true }: GameContainerProps) {
  const { currentNodeId, completedNodeIds, map, gamePhase, player, completeDay, currentDay } = useGameStore();
  const { currentChallenge, startChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Phase transition states
  const [showTransition, setShowTransition] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<'day' | 'night'>('day');
  const [transitionTo, setTransitionTo] = useState<'day' | 'night'>('night');
  
  // UI states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Replace the entire getCurrentNodeType function with this implementation
  const getCurrentNodeType = () => {
    if (!currentNodeId || !map) return null;
    
    // Direct node ID to type mapping for simplified map
    const nodeTypeMap = {
      'start': 'entrance',
      'qa-1': 'kapoor-calibration',
      'experimental-1': 'quinn-experiment',
      'storage-1': 'storage',
      'clinical-1': 'clinical', 
      'qualification-1': 'qualification',
      'boss-ionix': 'boss-ionix'
    };
    
    // If we have a direct mapping, use it
    if (nodeTypeMap[currentNodeId]) {
      console.log(`Node ${currentNodeId} mapped to type: ${nodeTypeMap[currentNodeId]}`);
      return nodeTypeMap[currentNodeId];
    }
    
    // Fallback to map-based lookup for non-simplified cases
    const currentNode = map.nodes.find(node => node.id === currentNodeId);
    if (!currentNode) {
      console.warn(`Current node ${currentNodeId} not found in map!`);
      return null;
    }
    
    return currentNode.type;
  };
  
  // Replace the entire useEffect that handles node selection with this implementation
  useEffect(() => {
    if (currentNodeId && !currentChallenge && !completedNodeIds.includes(currentNodeId)) {
      const nodeType = getCurrentNodeType();
      console.log(`Starting interaction with ${nodeType} node: ${currentNodeId}`);
      
      // Based on node ID directly (more reliable than type)
      switch(currentNodeId) {
        case 'qa-1':
          // Kapoor's LINAC calibration
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
          
        case 'start':
          // Entrance node
          startChallenge({
            id: currentNodeId,
            type: 'entrance',
            content: {
              title: "Department Entrance",
              character: "kapoor",
              initialized: true
            }
          });
          break;
          
        case 'storage-1':
          // Storage closet
          startChallenge({
            id: currentNodeId,
            type: 'storage',
            content: { initialized: true }
          });
          break;
          
        case 'experimental-1':
          // Quinn's experiment
          startChallenge({
            id: currentNodeId,
            type: 'experimental',
            content: { 
              character: "quinn", 
              initialized: true 
            }
          });
          break;
          
        case 'clinical-1':
          // Clinical challenge
          startChallenge({
            id: currentNodeId,
            type: 'clinical',
            content: { 
              character: "kapoor", 
              initialized: true 
            }
          });
          break;
          
        case 'qualification-1':
          // Qualification test
          startChallenge({
            id: currentNodeId,
            type: 'qualification',
            content: { 
              title: "Qualification Test",
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
          // For unknown node IDs, create minimal challenge state
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
    
    // Hide the transition component
    setShowTransition(false);
  };
  
  const renderMainContent = () => {
    // First check if we're in night phase
    if (gamePhase === 'night') {
      return <HillHomeScene onComplete={handleNightCompletion} />;
    }
    
    // If we have a selected unfinished node, route directly by node ID
    if (currentNodeId && !completedNodeIds.includes(currentNodeId)) {
      console.log(`Rendering content for node: ${currentNodeId}`);
      
      // Direct routing by node ID
      switch (currentNodeId) {
        case 'qa-1':
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
          // Insert appropriate component here
          return <CharacterInteractionNode character="kapoor" />;
        case 'start':
          // Handle entrance/start node
          return <CharacterInteractionNode character="kapoor" />;
      }
    }
    
    // Default: show the map
    return <SimplifiedMap />;
  };

  // Toggle sidebar with animation
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    
    // Play UI feedback sound
    if (playSound) playSound('click');
  };

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
    </div>
  );
}