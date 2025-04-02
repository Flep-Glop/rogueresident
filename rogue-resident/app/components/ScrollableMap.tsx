// app/components/ScrollableMap.tsx
'use client';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import { Node, NodeState, MapViewState, isNodeState } from '../types/map';
import Image from 'next/image';

/**
 * Props interface for ScrollableMap
 */
interface ScrollableMapProps {
  // You can add any props needed here
}

/**
 * ScrollableMap component - Enhanced map with panning and node interactions
 * 
 * This implementation provides:
 * 1. Viewport panning through mouse drag
 * 2. Visual cues for available paths
 * 3. Responsive design with fixed UI elements
 */
export default function ScrollableMap(props: ScrollableMapProps) {
  // Get nodes from gameStore - we'll use the map property from the store
  const { 
    currentNodeId, 
    setCurrentNode, 
    completedNodeIds, 
    player,
    completeDay,
    map, // Using 'map' instead of 'gameMap'
    isNodeAccessible,
    getNodeState
  } = useGameStore();
  
  // Use the nodes from the game map, or provide a fallback empty array
  const nodes: Node[] = map?.nodes || [];
  
  const { playSound, flashScreen } = useGameEffects();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Map view state controls scrolling/panning
  const [viewState, setViewState] = useState<MapViewState>({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    isDragging: false
  });
  
  // Reference position for drag calculation
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // Set initial active node if none selected
  useEffect(() => {
    if (!currentNodeId && !activeNode) {
      // Find start node and select it
      const startNode = nodes.find((node: Node) => node.type === 'entrance');
      if (startNode) {
        setActiveNode(startNode.id);
        setCurrentNode(startNode.id);
      }
    } else if (currentNodeId && currentNodeId !== activeNode) {
      setActiveNode(currentNodeId);
    }
  }, [currentNodeId, activeNode, setCurrentNode, nodes]);
  
  // Center map on active node when it changes
  useEffect(() => {
    if (activeNode && mapContainerRef.current) {
      const node = nodes.find((n: Node) => n.id === activeNode);
      if (node) {
        // Calculate how to center on this node
        const containerWidth = mapContainerRef.current.clientWidth || 1;
        const containerHeight = mapContainerRef.current.clientHeight || 1;
        
        // Target is in percentage, convert to container coordinates
        const targetX = (node.position.x / 100) * containerWidth * viewState.zoom;
        const targetY = (node.position.y / 100) * containerHeight * viewState.zoom;
        
        // Center offset
        const newOffsetX = containerWidth / 2 - targetX;
        const newOffsetY = containerHeight / 2 - targetY;
        
        // Smooth transition to new position
        setViewState(prev => ({
          ...prev,
          offsetX: newOffsetX,
          offsetY: newOffsetY
        }));
      }
    }
  }, [activeNode, nodes, viewState.zoom]);
  
  // Handle mouse down to start dragging
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    dragStartRef.current = {
      x: e.clientX - viewState.offsetX,
      y: e.clientY - viewState.offsetY
    };
    
    setViewState(prev => ({
      ...prev,
      isDragging: true
    }));
  };
  
  // Handle mouse move for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!viewState.isDragging) return;
    
    const newOffsetX = e.clientX - dragStartRef.current.x;
    const newOffsetY = e.clientY - dragStartRef.current.y;
    
    setViewState(prev => ({
      ...prev,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  };
  
  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setViewState(prev => ({
      ...prev,
      isDragging: false
    }));
  };
  
  // Determine if a node is completed
  const isNodeCompleted = (nodeId: string): boolean => {
    return completedNodeIds.includes(nodeId);
  };
  
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
  
  // Get node color based on type
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
    } else if (getNodeState(sourceId) === 'future' || getNodeState(targetId) === 'future') {
      // Future connections are dimmer
      pathOpacity = 0.3;
    } else {
      // Use string equality check for locked state - not a type comparison
      const sourceStateLocked = getNodeState(sourceId) === 'locked';
      const targetStateLocked = getNodeState(targetId) === 'locked';
      
      if (sourceStateLocked || targetStateLocked) {
        // Locked connections are nearly invisible
        pathOpacity = 0.1;
      }
    }
    
    return {
      color: pathColor,
      width: pathWidth,
      opacity: pathOpacity,
      className: pathClass
    };
  };
  
  // Render the connections between nodes
  const renderConnections = () => {
    return nodes.flatMap((node: Node) => 
      node.connections.map((targetId: string, index: number) => {
        const targetNode = nodes.find((n: Node) => n.id === targetId);
        if (!targetNode) return null;
        
        // Calculate line positions
        const sourceX = node.position.x;
        const sourceY = node.position.y;
        const targetX = targetNode.position.x;
        const targetY = targetNode.position.y;
        
        // Angle and length
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
  
  // Render a single node
  const renderNode = (node: Node) => {
    const state = getNodeState(node.id);
    const isActive = state === 'active';
    const isHovered = hoveredNode === node.id;
    
    // We need runtime flags for these states to avoid TypeScript errors
    const isNodeLocked = state === 'locked';
    const isInteractive = state === 'active' || state === 'accessible';
    const isInteractiveAndHovered = isInteractive && isHovered;
    
    // Skip rendering nodes that are completely locked and not connected
    if (isNodeLocked && !nodes.some((n: Node) => 
      n.connections.includes(node.id) && 
      ['accessible', 'completed', 'active'].includes(getNodeState(n.id))
    )) {
      return null;
    }
    
    // Node size varies by state
    const width = isActive || isInteractiveAndHovered ? 260 : 220;
    const height = isActive || isInteractiveAndHovered ? 70 : 50;
    
    // Classes for state
    let nodeClasses = 'absolute transition-all duration-300 transform';
    
    // Visual variations by state
    switch (state) {
      case 'active':
        nodeClasses += ' z-30 shadow-pixel-lg';
        break;
      case 'completed':
        nodeClasses += ' z-20 shadow-pixel opacity-90';
        break;
      case 'accessible':
        nodeClasses += ' hover:scale-105 z-10 shadow-pixel cursor-pointer';
        break;
      case 'future':
        nodeClasses += ' opacity-40 z-0';
        break;
      case 'locked':
        nodeClasses += ' opacity-15 grayscale z-0';
        break;
    }
    
    // Node type styles
    if (node.type === 'boss' || node.type === 'boss-ionix') {
      nodeClasses += ' bg-boss-dark';
    } else if (node.type === 'qualification') {
      nodeClasses += ' bg-warning-dark';
    } else if (node.character === 'kapoor') {
      nodeClasses += ' bg-clinical-dark';
    } else if (node.character === 'quinn') {
      nodeClasses += ' bg-educational-dark';
    } else if (node.character === 'jesse') {
      nodeClasses += ' bg-qa-dark';
    } else if (node.character === 'garcia') {
      nodeClasses += ' bg-clinical-alt-dark';
    }
    
    return (
      <div 
        key={node.id}
        className={nodeClasses}
        onClick={() => handleNodeSelect(node.id)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ 
          // Position as percentage of the container
          left: `${node.position.x}%`,
          top: `${node.position.y}%`,
          // Center the node on its position coordinates
          transform: `translate(-50%, -50%)`,
          width: width,
          height: height,
          // Border color from node type
          borderColor: getNodeColor(node)
        }}
      >
        {/* Character portrait extending outside */}
        <div className={`
          absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/3
          w-16 h-16 rounded-full overflow-hidden border-2
          ${isNodeLocked ? 'bg-gray-900 border-gray-800' : ''}
          transition-all duration-300
          ${isActive || isInteractiveAndHovered ? 'w-20 h-20' : ''}
        `}>
          {!isNodeLocked && (
            <Image
              src={getCharacterImage(node.character)}
              alt={node.character || 'Character'}
              fill
              className={`object-cover ${isNodeLocked ? 'opacity-0' : ''}`}
            />
          )}
        </div>
        
        {/* Node content */}
        <div className="pl-12 pr-3 py-2 h-full flex flex-col justify-center">
          {/* Node title - with runtime check for locked state */}
          {!isNodeLocked ? (
            <PixelText className={`
              text-sm truncate font-semibold
              ${isInteractive ? 'text-white' : 'text-gray-300'}
              ${isActive || isInteractiveAndHovered ? 'text-base' : ''}
              transition-all duration-300
            `}>
              {node.title}
            </PixelText>
          ) : (
            <PixelText className="text-sm text-gray-600">???</PixelText>
          )}
          
          {/* Node description - only on hover/active */}
          {(isActive || isInteractiveAndHovered) && !isNodeLocked && node.description && (
            <PixelText className="text-xs text-gray-300 line-clamp-1 mt-1">
              {node.description}
            </PixelText>
          )}
          
          {/* Type indicator badge */}
          {!isNodeLocked && (
            <div className="absolute top-1 right-2 text-xs px-1.5 py-0.5 rounded-sm bg-black bg-opacity-50">
              {node.type === 'qa' && <span className="text-qa-light">QA</span>}
              {node.type === 'clinical' && <span className="text-clinical-light">C</span>}
              {node.type === 'educational' && <span className="text-educational-light">E</span>}
              {node.type === 'experimental' && <span className="text-warning-light">X</span>}
              {node.type === 'storage' && <span className="text-qa-light">S</span>}
              {node.type === 'qualification' && <span className="text-warning-light">!</span>}
              {(node.type === 'boss' || node.type === 'boss-ionix') && <span className="text-boss-light">B</span>}
            </div>
          )}
          
          {/* Reward preview - only on active/hover */}
          {(isActive || isInteractiveAndHovered) && !isNodeLocked && node.insightReward && (
            <div className="absolute bottom-1 right-2 text-xs">
              <span className="text-yellow-300">+{node.insightReward}</span>
            </div>
          )}
          
          {/* Completion indicator */}
          {state === 'completed' && (
            <div className="absolute bottom-1 right-2 text-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Handle end day click
  const handleEndDay = () => {
    if (playSound) playSound('click');
    if (flashScreen) flashScreen('white');
    
    setTimeout(() => {
      completeDay();
    }, 300);
  };
  
  // Focus the view on active node
  const focusOnActiveNode = () => {
    if (activeNode && mapContainerRef.current) {
      const node = nodes.find((n: Node) => n.id === activeNode);
      if (node) {
        // Calculate how to center on this node
        const containerWidth = mapContainerRef.current.clientWidth || 1; 
        const containerHeight = mapContainerRef.current.clientHeight || 1;
        const targetX = (node.position.x / 100) * containerWidth * viewState.zoom;
        const targetY = (node.position.y / 100) * containerHeight * viewState.zoom;
        setViewState(prev => ({
          ...prev,
          offsetX: containerWidth / 2 - targetX,
          offsetY: containerHeight / 2 - targetY
        }));
      }
    }
  };
  
  return (
    <div className="h-full w-full flex flex-col relative bg-background overflow-hidden">
      {/* Fixed header */}
      <div className="text-center py-4 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <PixelText className="text-3xl text-white font-pixel-heading">
          Medical Physics Department
        </PixelText>
        <PixelText className="text-lg text-blue-300">
          Navigate through challenges to reach Ionix
        </PixelText>
      </div>
      
      {/* Scrollable map area */}
      <div 
        ref={mapContainerRef}
        className={`relative flex-grow starfield-bg overflow-hidden ${viewState.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Map container with transform for panning */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.zoom})`,
            width: '100%',
            height: '100%',
            transformOrigin: '0 0'
          }}
        >
          {/* Connections rendered first (lower z-index) */}
          {renderConnections()}
          
          {/* All nodes */}
          {nodes.map(renderNode)}
        </div>
        
        {/* Mini-map overlay (optional) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-background/80 rounded-md border border-gray-700 z-40 pixel-borders-thin">
          {/* Simplified representation of the whole map */}
          <div className="relative w-full h-full p-2">
            {/* Viewport indicator */}
            <div 
              className="absolute border-2 border-yellow-500 pointer-events-none"
              style={{
                left: `${50 - ((viewState.offsetX / (mapContainerRef.current?.clientWidth || 1)) * 100)}%`,
                top: `${50 - ((viewState.offsetY / (mapContainerRef.current?.clientHeight || 1)) * 100)}%`,
                width: `${100 / viewState.zoom}%`,
                height: `${100 / viewState.zoom}%`,
                transform: 'translate(-50%, -50%)',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
            
            {/* Simplified node dots */}
            {nodes.map((node: Node) => {
              const state = getNodeState(node.id);
              // Skip completely locked nodes using runtime check
              const isNodeLocked = state === 'locked';
              if (isNodeLocked) return null;
              
              // Color based on state
              let dotColor = '#6b7280'; // Default gray
              if (state === 'active') dotColor = '#f0c674'; // Yellow
              else if (state === 'completed') dotColor = '#34d399'; // Green
              else if (state === 'accessible') dotColor = '#4c7eff'; // Blue
              
              // Future node flag
              const isFutureNode = state === 'future';
              
              return (
                <div 
                  key={`minimap-${node.id}`}
                  className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${node.position.x}%`,
                    top: `${node.position.y}%`,
                    width: state === 'active' ? '6px' : '4px',
                    height: state === 'active' ? '6px' : '4px',
                    backgroundColor: dotColor,
                    opacity: isFutureNode ? 0.5 : 1
                  }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Map controls overlay */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-40">
          <button 
            className="w-8 h-8 bg-surface-dark hover:bg-surface flex items-center justify-center rounded-md pixel-borders-thin"
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 2) }))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="w-8 h-8 bg-surface-dark hover:bg-surface flex items-center justify-center rounded-md pixel-borders-thin"
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.5) }))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="w-8 h-8 bg-surface-dark hover:bg-surface flex items-center justify-center rounded-md pixel-borders-thin"
            onClick={focusOnActiveNode}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Fixed footer bar with player stats */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-sm pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-50">
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
      <div className="fixed bottom-20 right-4 bg-surface/80 backdrop-blur-sm p-2 text-xs pixel-borders-thin z-40">
        <PixelText>Map Legend</PixelText>
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