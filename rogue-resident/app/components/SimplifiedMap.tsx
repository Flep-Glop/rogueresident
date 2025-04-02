// app/components/SimplifiedMap.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import { Node, NodeState, isNodeState } from '../types/map';
import Image from 'next/image';

/**
 * SimplifiedMap component - Renders a focused node progression for prototype testing
 * 
 * This creates a visual rhythm that guides players through meaningful choice points
 * while maintaining narrative context through character associations.
 */
export default function SimplifiedMap() {
  const { 
    currentNodeId, 
    setCurrentNode, 
    completedNodeIds, 
    player,
    completeDay,
    getNodeState,
    isNodeAccessible
  } = useGameStore();
  
  const { playSound, flashScreen } = useGameEffects();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Our map data with narrative-driven node structure
  const mapNodes: Record<string, Node> = {
    'start': {
      id: 'start',
      title: 'Department Entrance',
      description: 'Your day begins here at the hospital entrance.',
      character: 'kapoor',
      type: 'entrance',
      position: { x: 50, y: 10 },
      connections: ['qa-1', 'clinical-1'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 5
    },
    'qa-1': {
      id: 'qa-1',
      title: 'LINAC Output Calibration',
      description: 'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
      character: 'kapoor',
      type: 'qa',
      position: { x: 30, y: 30 },
      connections: ['storage-1'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 15
    },
    'clinical-1': {
      id: 'clinical-1',
      title: 'Patient Plan Review',
      description: 'Review treatment plans with Dr. Garcia.',
      character: 'garcia',
      type: 'clinical',
      position: { x: 70, y: 30 },
      connections: ['experimental-1'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 15
    },
    'storage-1': {
      id: 'storage-1',
      title: 'Equipment Storage',
      description: 'Jesse might have some useful items here.',
      character: 'jesse',
      type: 'storage',
      position: { x: 25, y: 50 },
      connections: ['qualification-1'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 10
    },
    'experimental-1': {
      id: 'experimental-1',
      title: 'Experimental Detection',
      description: 'Dr. Quinn is testing a modified radiation detector with unusual results.',
      character: 'quinn',
      type: 'experimental',
      position: { x: 75, y: 50 },
      connections: ['qualification-1'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 20
    },
    'qualification-1': {
      id: 'qualification-1',
      title: 'Qualification Test',
      description: 'Demonstrate your knowledge before facing Ionix.',
      character: 'kapoor',
      type: 'qualification',
      position: { x: 50, y: 70 },
      connections: ['boss-ionix'],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 25
    },
    'boss-ionix': {
      id: 'boss-ionix',
      title: 'IONIX Challenge',
      description: "Dr. Quinn's experimental ion chamber needs calibration. Demonstrate your mastery.",
      character: 'quinn',
      type: 'boss-ionix',
      position: { x: 50, y: 90 },
      connections: [],
      isLocked: false,  // Added the missing isLocked property
      insightReward: 50
    }
  };
  
  // Set initial active node if none selected
  useEffect(() => {
    if (!currentNodeId && !activeNode) {
      // Start at node-0 (entrance)
      setActiveNode('start');
    }
  }, [currentNodeId, activeNode]);
  
  // Handle node selection
  const handleNodeSelect = (nodeId: string) => {
    // Skip if this node is not accessible yet
    if (!isNodeAccessible(nodeId)) return;
    
    setActiveNode(nodeId);
    
    // Play selection sound
    if (playSound) playSound('node-select');
    
    // Visual flash effect
    if (flashScreen) flashScreen('blue');
    
    // Update game state with selected node
    setCurrentNode(nodeId);
  };
  
  // Determine if a node is completed
  const isNodeCompleted = (nodeId: string): boolean => {
    return completedNodeIds.includes(nodeId);
  };
  
  // Get character image based on node config
  const getCharacterImage = (character?: string): string => {
    switch (character) {
      case 'kapoor': return '/characters/kapoor.png';
      case 'quinn': return '/characters/quinn.png';
      case 'jesse': return '/characters/jesse.png';
      case 'garcia': return '/characters/garcia.png';
      default: return '/characters/kapoor.png';
    }
  };
  
  // Get node color based on character
  const getNodeColor = (node: Node): string => {
    if (node.type === 'boss' || node.type === 'boss-ionix') return 'var(--boss-color)';
    if (node.type === 'qualification') return 'var(--warning-color)';
    
    switch (node.character) {
      case 'kapoor': return 'var(--clinical-color)';
      case 'quinn': return 'var(--educational-color)';
      case 'jesse': return 'var(--qa-color)';
      case 'garcia': return 'var(--clinical-alt-color, var(--clinical-color))';
      default: return 'var(--clinical-color)';
    }
  };
  
  // Get connection visual style
  const getConnectionStyle = (sourceId: string, targetId: string) => {
    const sourceCompleted = isNodeCompleted(sourceId);
    const targetAccessible = isNodeAccessible(targetId);
    
    let pathColor = 'rgba(75, 85, 99, 0.5)'; // Default gray
    let pathWidth = 2;
    let pathOpacity = 0.5;
    let pathClass = '';
    
    if (sourceCompleted && targetAccessible) {
      // Completed and next node is available - highlight this path
      pathColor = 'rgba(52, 211, 153, 0.8)'; // Success green
      pathWidth = 3;
      pathOpacity = 0.8;
      pathClass = 'animate-pulse-slow';
    } else if (sourceCompleted) {
      // Completed but next node isn't accessible yet (requires multiple paths)
      pathColor = 'rgba(52, 211, 153, 0.5)'; // Dimmer success
      pathWidth = 2;
      pathOpacity = 0.6;
    }
    
    // Runtime flag for future state - avoids type comparison errors
    const sourceIsFuture = getNodeState(sourceId) === 'future';
    const targetIsFuture = getNodeState(targetId) === 'future';
    
    if (sourceIsFuture || targetIsFuture) {
      // Future connections are dimmer
      pathOpacity = 0.3;
    }
    
    return {
      color: pathColor,
      width: pathWidth,
      opacity: pathOpacity,
      className: pathClass
    };
  };
  
  // Get node classes based on status
  const getNodeClasses = (nodeId: string, node: Node): string => {
    const state = getNodeState(nodeId);
    const isActive = state === 'active';
    const isHovered = hoveredNode === nodeId;
    
    // Runtime flags to avoid TypeScript comparison errors
    const isNodeFuture = state === 'future';
    const isNodeLocked = state === 'locked';
    const isInteractive = state === 'active' || state === 'accessible';
    
    let classes = 'transition-all duration-300 relative';
    
    // Node size and shadow based on state
    if (isActive) {
      classes += ' transform scale-110 z-20 shadow-pixel-lg';
    } else if (isInteractive) {
      classes += ' hover:scale-105 z-10 shadow-pixel cursor-pointer';
    } else {
      classes += ' opacity-50 grayscale z-0';
    }
    
    // Node type styles
    if (node.type === 'boss' || node.type === 'boss-ionix') {
      classes += ' bg-boss-dark';
    } else if (node.type === 'qualification') {
      classes += ' bg-warning-dark';
    } else if (node.character === 'kapoor') {
      classes += ' bg-clinical-dark';
    } else if (node.character === 'quinn') {
      classes += ' bg-educational-dark';
    } else if (node.character === 'jesse') {
      classes += ' bg-qa-dark';
    } else if (node.character === 'garcia') {
      classes += ' bg-clinical-alt-dark';
    }
    
    return classes;
  };
  
  // Render a single node
  const renderNode = (nodeId: string) => {
    const node = mapNodes[nodeId];
    const state = getNodeState(nodeId);
    
    // Runtime flags for TypeScript type safety
    const isNodeFuture = state === 'future';
    const isNodeLocked = state === 'locked';
    const isActive = state === 'active';
    const isCompleted = state === 'completed';
    const isAccessible = state === 'accessible';
    const isInteractive = isActive || isAccessible;
    const isHovered = hoveredNode === nodeId && isInteractive;
    
    return (
      <div 
        key={nodeId}
        className={`w-64 h-72 pixel-borders ${getNodeClasses(nodeId, node)}`}
        style={{ borderColor: getNodeColor(node) }}
        onClick={() => handleNodeSelect(nodeId)}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {/* Node content */}
        <div className="p-3 h-full flex flex-col">
          {/* Character portrait */}
          <div className="relative h-24 mb-2 overflow-hidden rounded-lg">
            <Image
              src={getCharacterImage(node.character)}
              alt={node.character || 'Character'}
              fill
              className="object-cover"
            />
            
            {/* Completion indicator */}
            {isCompleted && (
              <div className="absolute top-0 right-0 bg-success p-1 rounded-bl-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Node title */}
          <PixelText className={`text-base mb-1 ${
            node.type === 'boss' || node.type === 'boss-ionix' ? 'text-boss-light' :
            node.character === 'kapoor' ? 'text-clinical-light' :
            node.character === 'quinn' ? 'text-educational-light' :
            node.character === 'jesse' ? 'text-qa-light' :
            'text-clinical-light'
          }`}>
            {!isNodeFuture ? node.title : '???'}
          </PixelText>
          
          {/* Node description - only when node is not future state */}
          {!isNodeFuture && (
            <PixelText className="text-xs text-text-secondary mb-3">
              {node.description}
            </PixelText>
          )}
          
          {/* Rewards indicator */}
          <div className="mt-auto">
            <div className="flex items-center space-x-2">
              {!isNodeFuture && (
                <div className="bg-surface-dark px-2 py-1 rounded-sm text-xs">
                  <PixelText>
                    <span className="text-clinical-light">+{node.insightReward}</span> Insight
                  </PixelText>
                </div>
              )}
              
              {(node.type === 'boss' || node.type === 'boss-ionix') && (
                <div className="bg-surface-dark px-2 py-1 rounded-sm text-xs">
                  <PixelText className="text-boss-light">Boss</PixelText>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the connections between nodes
  const renderConnections = () => {
    return Object.values(mapNodes).flatMap(node => 
      node.connections.map((targetId: string, index: number) => {
        const targetNode = mapNodes[targetId];
        if (!targetNode) return null;
        
        // Calculate line positions
        const sourceX = node.position.x;
        const sourceY = node.position.y;
        const targetX = targetNode.position.x;
        const targetY = targetNode.position.y;
        
        // Angle and length for rotation
        const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;
        const length = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
        
        // Connection styling
        const style = getConnectionStyle(node.id, targetId);
        
        return (
          <div 
            key={`connection-${node.id}-${targetId}-${index}`}
            className={`absolute transition-opacity duration-500 ${style.className}`}
            style={{
              left: `${sourceX}%`,
              top: `${sourceY}%`,
              width: '1px', // Will be scaled
              height: `${length}%`,
              backgroundColor: style.color,
              opacity: style.opacity,
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'top left',
              scale: `${style.width} 1`,
              zIndex: 5
            }}
          />
        );
      })
    ).filter(Boolean); // Filter out null connections
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
      
      {/* Node map with branching paths */}
      <div className="relative w-full h-[600px] max-w-5xl mx-auto">
        {/* Connection paths first (so they're behind nodes) */}
        {renderConnections()}
        
        {/* Position nodes by percentage coordinates */}
        {Object.keys(mapNodes).map(nodeId => {
          const node = mapNodes[nodeId];
          return (
            <div
              key={nodeId}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}%`,
              }}
            >
              {renderNode(nodeId)}
            </div>
          );
        })}
      </div>
      
      {/* Persistent floating End Day button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-sm pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-30">
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
        <div className="flex items-center space-x-1 mt-1">
          <div className="w-3 h-3 bg-gray-700"></div>
          <PixelText className="text-text-secondary">Future</PixelText>
        </div>
      </div>
    </div>
  );
}