// app/components/SimplifiedMap.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import { Node, NodeState } from '../types/map';
import Image from 'next/image';

/**
 * SimplifiedMap component - Renders a focused node progression with Supergiant-inspired
 * visual language featuring asymmetric portraits, progressive visibility, and dynamic paths.
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
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
      isLocked: false,
      insightReward: 5
    },
    'qa-1': {
      id: 'qa-1',
      title: 'LINAC Output Calibration',
      description: 'Dr. Kapoor is conducting monthly output measurements on LINAC 2.',
      character: 'kapoor',
      type: 'qa',
      position: { x: 28, y: 33 }, // Slightly adjusted for organic placement
      connections: ['storage-1'],
      isLocked: false,
      insightReward: 15
    },
    'clinical-1': {
      id: 'clinical-1',
      title: 'Patient Plan Review',
      description: 'Review treatment plans with Dr. Garcia.',
      character: 'garcia',
      type: 'clinical',
      position: { x: 72, y: 28 }, // Slightly offset for composition
      connections: ['experimental-1'],
      isLocked: false,
      insightReward: 15
    },
    'storage-1': {
      id: 'storage-1',
      title: 'Equipment Storage',
      description: 'Jesse might have some useful items here.',
      character: 'jesse',
      type: 'storage',
      position: { x: 25, y: 52 }, // Position adjusted
      connections: ['qualification-1'],
      isLocked: false,
      insightReward: 10
    },
    'experimental-1': {
      id: 'experimental-1',
      title: 'Experimental Detection',
      description: 'Dr. Quinn is testing a modified radiation detector with unusual results.',
      character: 'quinn',
      type: 'experimental',
      position: { x: 75, y: 50 }, // Slight adjustment
      connections: ['qualification-1'],
      isLocked: false,
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
      isLocked: false,
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
      isLocked: false,
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
  
  // Replace the handleNodeSelect function in SimplifiedMap.tsx
  const handleNodeSelect = (nodeId: string) => {
    // Skip if node is not accessible
    if (!isNodeAccessible(nodeId)) {
      console.log(`Node ${nodeId} is not accessible`);
      return;
    }
    
    console.log(`Node selected: ${nodeId}`);
    
    // Update active node in local state
    setActiveNode(nodeId);
    
    // Enhanced selection feedback
    if (playSound) playSound('node-select');
    
    // Visual feedback for selection
    if (flashScreen) {
      const nodeType = mapNodes[nodeId].type;
      const color = nodeType === 'boss-ionix' ? 'red' : 
                  nodeType === 'qualification' ? 'yellow' : 'blue';
      flashScreen(color);
    }
    
    // Node selection animation
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
      nodeElement.animate(
        [
          { transform: 'scale(1) translateY(0)', filter: 'brightness(1)' },
          { transform: 'scale(1.15) translateY(-5px)', filter: 'brightness(1.3)' },
          { transform: 'scale(1) translateY(0)', filter: 'brightness(1)' }
        ],
        { duration: 400, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' }
      );
    }
    
    // Most important part: Update gameStore with selected node
    // This is what triggers the routing in GameContainer
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
  
  // Get connection visual style with enhanced animation
  const getConnectionStyle = (sourceId: string, targetId: string) => {
    const sourceCompleted = isNodeCompleted(sourceId);
    const targetAccessible = isNodeAccessible(targetId);
    const sourceState = getNodeState(sourceId);
    const targetState = getNodeState(targetId);
    
    let pathColor = 'rgba(75, 85, 99, 0.3)'; // Dimmer default 
    let pathWidth = 2;
    let pathOpacity = 0.3;
    let pathClass = '';
    let glowEffect = '';
    
    if (sourceCompleted && targetAccessible) {
      // Highlight available path with pulsing glow
      pathColor = 'rgba(52, 211, 153, 0.9)';
      pathWidth = 3;
      pathOpacity = 0.9;
      pathClass = 'animate-pulse-path';
      glowEffect = 'filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.5));';
    } else if (sourceCompleted) {
      // Completed but next node isn't accessible yet
      pathColor = 'rgba(52, 211, 153, 0.6)';
      pathWidth = 2;
      pathOpacity = 0.7;
    } else if (sourceState === 'active' && targetState === 'accessible') {
      // Current possible route
      pathColor = 'rgba(79, 107, 187, 0.8)';
      pathWidth = 2.5;
      pathOpacity = 0.8;
      pathClass = 'animate-pulse-path-subtle';
    } else if (sourceState === 'future' || targetState === 'future') {
      // Future connections are very dim
      pathOpacity = 0.2;
    } else if (sourceState === 'locked' || targetState === 'locked') {
      // Almost invisible
      pathOpacity = 0.05;
    }
    
    return {
      color: pathColor,
      width: pathWidth,
      opacity: pathOpacity,
      className: pathClass,
      glowEffect
    };
  };
  
  // In SimplifiedMap.tsx, enhance the getNodeClasses function:
  const getNodeClasses = (nodeId: string, node: Node): string => {
    const state = getNodeState(nodeId);
    const isActive = state === 'active';
    const isHovered = hoveredNode === nodeId;
    
    // Base classes with transition
    let classes = 'transition-all duration-300 relative';
    
    // Visual variations by state - enhanced
    switch (state) {
      case 'active':
        classes += ' transform scale-110 z-30 shadow-pixel-lg brightness-110';
        break;
      case 'completed':
        classes += ' z-20 shadow-pixel opacity-90';
        break;
      case 'accessible':
        // Add pulsing glow for accessible nodes
        classes += ' hover:scale-105 z-10 shadow-pixel cursor-pointer node-accessible';
        if (isHovered) classes += ' brightness-110';
        break;
      case 'future':
        // Future nodes are significantly muted but still visible
        classes += ' opacity-40 grayscale z-0 blur-[1px]';
        break;
      case 'locked':
        // Locked nodes barely visible, creating progressive revealing effect
        classes += ' opacity-15 grayscale z-0 blur-[2px]';
        break;
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
  
  // Render a single node with asymmetric character portrait
  const renderNode = (nodeId: string) => {
    const node = mapNodes[nodeId];
    const state = getNodeState(nodeId);
    
    const isNodeFuture = state === 'future';
    const isNodeLocked = state === 'locked';
    const isActive = state === 'active';
    const isCompleted = state === 'completed';
    const isAccessible = state === 'accessible';
    const isInteractive = isActive || isAccessible;
    const isHovered = hoveredNode === nodeId && isInteractive;
    
    // Character portrait has higher z-index to break out of the node container
    const portraitZIndex = isActive ? 40 : isAccessible ? 30 : isCompleted ? 25 : 20;
    
    // Generate a unique node ID for DOM selection
    const uniqueNodeId = `node-${nodeId}`;
    
    // Only show partial info for future nodes, and none for locked nodes
    const showContent = !isNodeLocked;
    const showFullContent = !isNodeFuture && !isNodeLocked;
    
    return (
        <div 
          id={uniqueNodeId}
          key={nodeId}
          className={`w-56 h-20 relative ${getNodeClasses(nodeId, node)}`} // Dramatically shorter height
          onClick={() => handleNodeSelect(nodeId)}
          onMouseEnter={() => {
            setHoveredNode(nodeId);
            if (isInteractive && playSound) playSound('node-hover');
          }}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Container - jet black with subtle highlight */}
          <div 
            className="absolute inset-0 overflow-hidden" 
            style={{ 
              background: 'rgba(10, 12, 16, 0.92)', // Near black for that stark contrast
              borderLeft: `3px solid ${getNodeColor(node)}`,
              boxShadow: isActive || isHovered 
                ? `0 0 12px ${getNodeColor(node)}70, inset 0 0 4px ${getNodeColor(node)}50`
                : 'none',
            }}
          >
            {/* Highlight sweep effect */}
            <div 
              className="absolute inset-0 node-highlight-glow"
              style={{ opacity: isActive || isHovered ? 0.7 : 0 }}
            ></div>
          </div>
      
          {/* Character positioned at bottom-left breaking out of node */}
          <div 
            className="absolute left-0 bottom-0 transform -translate-x-1/3 translate-y-1/4 z-40"
            style={{ 
              width: '80px',
              height: '80px', 
            }}
          >
            <div 
              className={`w-full h-full rounded-full overflow-hidden border-2 transition-all duration-300`}
              style={{ 
                borderColor: getNodeColor(node),
                boxShadow: isActive || isHovered ? `0 0 10px ${getNodeColor(node)}80` : 'none',
              }}
            >
              {!isNodeLocked && (
                <Image
                  src={getCharacterImage(node.character)}
                  alt={node.character || 'Character'}
                  fill
                  className="object-cover scale-110"
                />
              )}
            </div>
            
            {/* Character "ground shadow" for visual anchoring */}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 h-1 rounded-full blur-sm"
              style={{ 
                background: `radial-gradient(ellipse, ${getNodeColor(node)}90 0%, transparent 70%)`,
                opacity: 0.4
              }}
            ></div>
          </div>
          
          {/* Content - just title and minimal info */}
          <div className="absolute inset-0 flex flex-col justify-center pl-16 pr-3">
            <PixelText 
              className={`
                text-sm truncate font-medium 
                ${isActive || isHovered ? 'text-white' : 'text-gray-300'}
                transition-colors duration-300
              `}
            >
              {showContent ? node.title : '???'}
            </PixelText>
            
            {/* Just the minimal type indicator - no badge */}
            <div className="flex items-center mt-1">
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: getNodeColor(node) }}
              ></div>
              <PixelText className="text-xs text-gray-400">
                {node.type === 'qa' && 'QA'}
                {node.type === 'clinical' && 'Clinical'}
                {node.type === 'educational' && 'Ed'}
                {node.type === 'experimental' && 'Exp'}
                {node.type === 'storage' && 'Storage'}
                {node.type === 'qualification' && 'Qual'}
                {(node.type === 'boss' || node.type === 'boss-ionix') && 'Boss'}
                {node.type === 'entrance' && 'Start'}
              </PixelText>
              
              {/* Insight reward as a subtle indicator */}
              {showFullContent && (
                <div className="ml-auto mr-1">
                  <span className="text-xs" style={{ color: getNodeColor(node) }}>
                    +{node.insightReward}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Completion indicator - more subtle and positioned differently */}
          {isCompleted && (
            <div 
              className="absolute top-1/2 right-2 transform -translate-y-1/2 z-30"
              style={{ color: getNodeColor(node) }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      );
  };
  
  // Render the connections between nodes with enhanced visual effects
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
        
        // Connection styling with enhanced visual effects
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
              zIndex: 5,
              filter: node.id === activeNode || targetId === activeNode ? 
                'drop-shadow(0 0 5px rgba(255,255,255,0.3))' : 'none'
            }}
          />
        );
      })
    ).filter(Boolean); // Filter out null connections
  };
  
  // Handle end day click with enhanced feedback
  const handleEndDay = () => {
    if (playSound) playSound('click');
    
    // Zoom out effect on the map container
    if (mapContainerRef.current) {
      mapContainerRef.current.animate(
        [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(0.98)', filter: 'brightness(1.1)' }
        ],
        { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
      );
    }
    
    // Check if player has completed at least one node
    if (completedNodeIds.length > 0) {
      setTimeout(() => {
        completeDay();
      }, 400);
    } else {
      // Provide feedback that they should complete at least one node
      if (flashScreen) flashScreen('red');
      if (playSound) playSound('error');
      
      // Shake the button to indicate it can't be used yet
      const endDayButton = document.querySelector('.end-day-button');
      if (endDayButton) {
        endDayButton.animate(
          [
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(0)' }
          ],
          { duration: 300, easing: 'ease-in-out' }
        );
      }
    }
  };
  
  return (
    <div 
      ref={mapContainerRef}
      className="h-full w-full p-8 flex flex-col items-center justify-center bg-background starfield-bg"
    >
      <div className="text-center mb-8 relative">
        <PixelText className="text-4xl text-white font-pixel-heading mb-2 glow-text">
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
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
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
      
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-sm pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-30">
      {/* Remove the stat indicators and keep only the button */}
      <PixelButton
        className={`end-day-button bg-surface hover:bg-clinical text-text-primary px-4 py-2 relative overflow-hidden group ${completedNodeIds.length === 0 ? 'opacity-80' : ''}`}
        onClick={handleEndDay}
      >
        <span className="relative z-10">Return to Hill Home</span>
        <span className="absolute inset-0 bg-clinical opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        {completedNodeIds.length === 0 && (
          <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-warning-light whitespace-nowrap">
            Complete at least one node first
          </span>
        )}
      </PixelButton>
    </div>
      
      {/* Enhanced map legend with better visual hierarchy */}
      <div className="absolute bottom-20 right-4 bg-surface/80 backdrop-blur-sm p-3 text-xs pixel-borders-thin z-40">
        <PixelText className="font-semibold mb-2">Map Progress</PixelText>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success rounded-sm"></div>
            <PixelText className="text-text-secondary">Completed</PixelText>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-clinical rounded-sm animate-pulse-slow"></div>
            <PixelText className="text-text-secondary">Available</PixelText>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-700 rounded-sm"></div>
            <PixelText className="text-text-secondary">Future</PixelText>
          </div>
        </div>
      </div>
    </div>
  );
}