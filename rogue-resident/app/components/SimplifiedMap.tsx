// app/components/SimplifiedMap.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import { SIMPLIFIED_NODES, EncounterConfig } from '../types/encounterTypes';
import Image from 'next/image';

/**
 * SimplifiedMap component - Renders a focused 3-node progression for prototype testing
 * 
 * This is intentionally simplified to focus on one perfect node experience
 * with clear progression and visual hierarchy.
 */
export default function SimplifiedMap() {
  const { 
    currentNodeId, 
    setCurrentNode, 
    completedNodeIds, 
    player,
    completeDay
  } = useGameStore();
  
  const { playSound, flashScreen } = useGameEffects();
  const [activeNode, setActiveNode] = useState<number | null>(null);
  
  // Set initial active node if none selected
  useEffect(() => {
    if (!currentNodeId && !activeNode) {
      // Start at first (index 0) node
      setActiveNode(0);
    }
  }, [currentNodeId, activeNode]);
  
  // Handle node selection
  const handleNodeSelect = (index: number) => {
    // Skip if this node is not accessible yet
    if (!isNodeAccessible(index)) return;
    
    setActiveNode(index);
    
    // Play selection sound
    if (playSound) playSound('node-select');
    
    // Visual flash effect
    if (flashScreen) flashScreen('blue');
    
    // Update game state with selected node
    setCurrentNode(`node-${index}`);
  };
  
  // Determine if a node is accessible
  const isNodeAccessible = (index: number): boolean => {
    // First node is always accessible
    if (index === 0) return true;
    
    // For other nodes, previous node must be completed
    const previousNodeId = `node-${index - 1}`;
    return completedNodeIds.includes(previousNodeId);
  };
  
  // Determine if a node is completed
  const isNodeCompleted = (index: number): boolean => {
    const nodeId = `node-${index}`;
    return completedNodeIds.includes(nodeId);
  };
  
  // Get character image based on node config
  const getCharacterImage = (character?: string): string => {
    switch (character) {
      case 'kapoor': return '/characters/kapoor.png';
      case 'quinn': return '/characters/quinn.png';
      case 'jesse': return '/characters/jesse.png';
      default: return '/characters/kapoor.png';
    }
  };
  
  // Get node color based on character
  const getNodeColor = (character?: string): string => {
    switch (character) {
      case 'kapoor': return 'var(--clinical-color)';
      case 'quinn': return 'var(--educational-color)';
      case 'jesse': return 'var(--qa-color)';
      default: return 'var(--clinical-color)';
    }
  };
  
  // Get node classes based on status
  const getNodeClasses = (index: number, node: EncounterConfig): string => {
    const isActive = activeNode === index;
    const isCompleted = isNodeCompleted(index);
    const isAccessible = isNodeAccessible(index);
    
    let classes = 'transition-all duration-300 relative';
    
    // Node size and shadow based on state
    if (isActive) {
      classes += ' transform scale-110 z-20 shadow-pixel-lg';
    } else if (isAccessible) {
      classes += ' hover:scale-105 z-10 shadow-pixel cursor-pointer';
    } else {
      classes += ' opacity-50 grayscale z-0';
    }
    
    // Node type styles
    if (node.type === 'boss-ionix') {
      classes += ' bg-boss-dark';
    } else if (node.character === 'kapoor') {
      classes += ' bg-clinical-dark';
    } else if (node.character === 'quinn') {
      classes += ' bg-educational-dark';
    } else if (node.character === 'jesse') {
      classes += ' bg-qa-dark';
    }
    
    return classes;
  };
  
  // Handle end day click
  const handleEndDay = () => {
    if (playSound) playSound('click');
    if (flashScreen) flashScreen('white');
    
    setTimeout(() => {
      completeDay();
    }, 300);
  };
  
  return (
    <div className="h-full w-full p-8 flex flex-col items-center justify-center bg-background starfield-bg">
      <div className="text-center mb-8">
        <PixelText className="text-4xl text-white font-pixel-heading mb-2">
          Medical Physics Department
        </PixelText>
        <PixelText className="text-lg text-blue-300">
          Navigate through challenges to reach Ionix
        </PixelText>
      </div>
      
      {/* Linear node progression - made smaller and more centered */}
      <div className="flex flex-col items-center max-w-4xl mx-auto py-10">
        {/* Connect to the first node */}
        <div className="w-1 h-12 bg-gradient-to-b from-transparent to-blue-500"></div>
        
        {/* Node chain - smaller and more compact */}
        <div className="flex flex-col items-center space-y-12">
          {SIMPLIFIED_NODES.map((node, index) => (
            <div key={index} className="flex flex-col items-center">
              {/* Node container */}
              <div 
                className={`w-48 h-64 pixel-borders ${getNodeClasses(index, node)}`}
                style={{ borderColor: getNodeColor(node.character) }}
                onClick={() => handleNodeSelect(index)}
              >
                {/* Node content */}
                <div className="p-3 h-full flex flex-col">
                  {/* Character portrait */}
                  <div className="relative h-20 mb-2 overflow-hidden rounded-lg">
                    <Image
                      src={getCharacterImage(node.character)}
                      alt={node.character || 'Character'}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Completion indicator */}
                    {isNodeCompleted(index) && (
                      <div className="absolute top-0 right-0 bg-success p-1 rounded-bl-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Node title */}
                  <PixelText className={`text-base mb-1 ${
                    node.type === 'boss-ionix' ? 'text-boss-light' :
                    node.character === 'kapoor' ? 'text-clinical-light' :
                    node.character === 'quinn' ? 'text-educational-light' :
                    'text-qa-light'
                  }`}>
                    {node.title}
                  </PixelText>
                  
                  {/* Node description - shorter */}
                  <PixelText className="text-xs text-text-secondary mb-3">
                    {node.description}
                  </PixelText>
                  
                  {/* Rewards indicator */}
                  <div className="mt-auto">
                    <div className="flex items-center space-x-2">
                      <div className="bg-surface-dark px-2 py-1 rounded-sm text-xs">
                        <PixelText>
                          <span className="text-clinical-light">+{node.insightReward}</span> Insight
                        </PixelText>
                      </div>
                      
                      {node.type === 'boss-ionix' && (
                        <div className="bg-surface-dark px-2 py-1 rounded-sm text-xs">
                          <PixelText className="text-boss-light">Boss</PixelText>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Connection to next node */}
              {index < SIMPLIFIED_NODES.length - 1 && (
                <div className={`w-1 h-12 
                  ${isNodeCompleted(index) 
                    ? 'bg-success' 
                    : 'bg-gray-700 bg-gradient-to-b from-gray-700 to-dark-gray'}
                  ${isNodeCompleted(index) && !isNodeCompleted(index + 1)
                    ? 'animate-pulse'
                    : ''}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Persistent floating End Day button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-30">
        <div className="flex items-center">
          <span className="px-2 py-1 bg-danger text-white text-sm mr-2">❤️ {player.health}/{player.maxHealth}</span>
          <span className="px-2 py-1 bg-clinical text-white text-sm">💡 {player.insight}</span>
        </div>
        
        <PixelButton
          className="bg-surface hover:bg-clinical text-text-primary px-4 py-2"
          onClick={handleEndDay}
        >
          End Day
        </PixelButton>
      </div>
      
      {/* Map legend */}
      <div className="absolute bottom-20 right-4 bg-surface/80 p-2 text-xs pixel-borders-thin">
        <PixelText>Map Progress</PixelText>
        <div className="flex items-center space-x-1 mt-1">
          <div className="w-3 h-3 bg-success"></div>
          <PixelText className="text-text-secondary">Completed</PixelText>
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <div className="w-3 h-3 bg-clinical"></div>
          <PixelText className="text-text-secondary">Available</PixelText>
        </div>
      </div>
    </div>
  );
}