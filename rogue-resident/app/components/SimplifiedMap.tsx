// app/components/SimplifiedMap.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import { Node, NodeState } from '../types/map';
import { createSeedUrl, DEV_SEEDS } from '../utils/seedUtils';
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
    isNodeAccessible,
    map,
    startGame
  } = useGameStore();
  
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const nodeSelectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasCancelledAnimations, setHasCancelledAnimations] = useState(false);
  
  // Stable map data reference to avoid unnecessary rerenders
  const mapNodesRef = useRef<Record<string, Node>>({});
  const instanceIdRef = useRef<string>(`map-instance-${Date.now()}`);
  
  // Map initialization and stability checks
  useEffect(() => {
    // Initialize mapNodes from actual game map
    if (map && map.nodes) {
      const nodesMap: Record<string, Node> = {};
      map.nodes.forEach(node => {
        nodesMap[node.id] = node;
      });
      mapNodesRef.current = nodesMap;
      
      console.log("Map nodes initialized:", Object.keys(nodesMap));
      console.log("Map nodes types:", map.nodes.map(n => ({ id: n.id, type: n.type, content: n.challengeContent })));
      console.log("Start node ID:", map.startNodeId);
      console.log("Map instance ID:", instanceIdRef.current);
      
      // Add a short delay to ensure map is ready for rendering
      setTimeout(() => {
        setIsMapReady(true);
      }, 100);
    }
    
    return () => {
      // Clean up any pending timeouts to prevent memory leaks
      if (nodeSelectTimeoutRef.current) {
        clearTimeout(nodeSelectTimeoutRef.current);
        nodeSelectTimeoutRef.current = null;
      }
    };
  }, [map]);
  
  // Cancel any existing animations to fix duplicate rendering
  useEffect(() => {
    if (!hasCancelledAnimations) {
      // Cancel all animations on elements to prevent visual artifacts
      const cancelAnimations = () => {
        try {
          // Find all animating elements
          document.querySelectorAll('.node-accessible, .animate-pulse-path, .animate-pulse-path-subtle').forEach((el) => {
            if (el instanceof HTMLElement && el.getAnimations) {
              el.getAnimations().forEach(anim => anim.cancel());
            }
          });
        } catch (err) {
          console.warn('Error cancelling animations:', err);
        }
      };
      
      // Run immediately and after a short delay to catch delayed animations
      cancelAnimations();
      setTimeout(cancelAnimations, 100);
      setHasCancelledAnimations(true);
    }
  }, [hasCancelledAnimations]);
  
  // Ensure map container has isolation for proper stacking context
  useEffect(() => {
    if (mapContainerRef.current) {
      // Force proper stacking context
      mapContainerRef.current.style.isolation = 'isolate';
      mapContainerRef.current.style.position = 'relative';
      mapContainerRef.current.style.zIndex = '1';
      
      // Add data attribute for debugging
      mapContainerRef.current.setAttribute('data-instance-id', instanceIdRef.current);
    }
  }, []);
  
  // Set initial active node if none selected - with safer timeout handling
  useEffect(() => {
    // Clean up any existing timeout
    if (nodeSelectTimeoutRef.current) {
      clearTimeout(nodeSelectTimeoutRef.current);
      nodeSelectTimeoutRef.current = null;
    }
    
    // Only attempt node selection when map is ready
    if (isMapReady && !currentNodeId && !activeNode && map) {
      // Auto-select the kapoorCalibrationNode if available, otherwise use map's startNodeId
      const calibrationNode = map.nodes.find(node => 
        node.type === 'kapoorCalibration' || 
        (node.challengeContent === 'calibration' && node.character === 'kapoor')
      );
      const nodeToSelect = calibrationNode?.id || map.startNodeId;
      
      console.log(`Auto-selecting node: ${nodeToSelect}`);
      setActiveNode(nodeToSelect);
      
      // Auto-select with a brief delay for visual flair
      nodeSelectTimeoutRef.current = setTimeout(() => {
        console.log("Executing delayed node selection for:", nodeToSelect);
        handleNodeSelect(nodeToSelect);
        nodeSelectTimeoutRef.current = null;
      }, 800);
    }
    
    return () => {
      if (nodeSelectTimeoutRef.current) {
        clearTimeout(nodeSelectTimeoutRef.current);
        nodeSelectTimeoutRef.current = null;
      }
    };
  }, [currentNodeId, activeNode, map, isMapReady]);
  
  // Memoized node selection handler to prevent recreation on renders
  const handleNodeSelect = useCallback((nodeId: string) => {
    const isFirstNode = map && map.nodes.length === 1;
    
    // TEMPORARILY COMMENT OUT FOR DEVELOPMENT
    // Uncomment when accessibility is working properly
    /*
    if (!isFirstNode && !isNodeAccessible(nodeId)) {
      console.log(`Node ${nodeId} is not accessible`);
      return;
    }
    */

    // Skip if node doesn't exist in the map
    if (!map || !map.nodes.find(node => node.id === nodeId)) {
      console.warn(`Node ${nodeId} not found in map`);
      return;
    }
    
    // Update active node in local state
    setActiveNode(nodeId);
    
    // Enhanced selection feedback
    if (playSound) playSound('node-select');
    
    // Visual feedback for selection
    if (flashScreen) {
      const node = map.nodes.find(n => n.id === nodeId);
      if (node) {
        const color = node.type === 'kapoorCalibration' ? 'blue' :
                      node.type === 'boss-ionix' ? 'red' : 
                      node.type === 'qualification' ? 'yellow' : 'blue';
        flashScreen(color);
      }
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
    console.log("Updating global state with selected node:", nodeId);
    setCurrentNode(nodeId);
  }, [map, isNodeAccessible, playSound, flashScreen, setCurrentNode]);
  
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
    if (node.type === 'kapoorCalibration') return 'var(--clinical-color)';
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
    let pathWidth = 3.5; // Enhanced width for better visibility (was 2)
    let pathOpacity = 0.3;
    let pathClass = '';
    let glowEffect = '';
    let arrowEnabled = false;
    
    if (sourceCompleted && targetAccessible) {
      // Highlight available path with pulsing glow
      pathColor = 'rgba(52, 211, 153, 0.9)';
      pathWidth = 4; // Thicker for emphasis
      pathOpacity = 0.9;
      pathClass = 'animate-pulse-path';
      glowEffect = 'filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.5));';
      arrowEnabled = true;
    } else if (sourceCompleted) {
      // Completed but next node isn't accessible yet
      pathColor = 'rgba(52, 211, 153, 0.6)';
      pathWidth = 3;
      pathOpacity = 0.7;
      arrowEnabled = true;
    } else if (sourceState === 'active' && targetState === 'accessible') {
      // Current possible route
      pathColor = 'rgba(79, 107, 187, 0.8)';
      pathWidth = 3.5;
      pathOpacity = 0.8;
      pathClass = 'animate-pulse-path-subtle';
      arrowEnabled = true;
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
      glowEffect,
      arrowEnabled
    };
  };
  
  // Enhanced node class generator
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
    
    // Node type styles with special highlight for calibration node
    if (node.type === 'kapoorCalibration') {
      classes += ' bg-clinical-dark'; 
    } else if (node.type === 'boss' || node.type === 'boss-ionix') {
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
  const renderNode = (nodeId: string, node: Node) => {
    const state = getNodeState(nodeId);
    
    const isNodeFuture = state === 'future';
    const isNodeLocked = state === 'locked';
    const isActive = state === 'active';
    const isCompleted = state === 'completed';
    const isAccessible = state === 'accessible';
    const isInteractive = isActive || isAccessible;
    const isHovered = hoveredNode === nodeId && isInteractive;
    const isCalibrationNode = node.type === 'kapoorCalibration';
    
    // Generate a unique node ID for DOM selection
    const uniqueNodeId = `node-${nodeId}-${instanceIdRef.current}`;
    
    // Only show partial info for future nodes, and none for locked nodes
    const showContent = !isNodeLocked;
    const showFullContent = !isNodeFuture && !isNodeLocked;
    
    // Adjust node size - make calibration node larger
    const nodeWidth = isCalibrationNode ? 'w-64' : 'w-56';
    const nodeHeight = isCalibrationNode ? 'h-28' : 'h-20';
    
    return (
        <div 
          id={uniqueNodeId}
          key={nodeId}
          className={`${nodeWidth} ${nodeHeight} relative ${getNodeClasses(nodeId, node)}`}
          onClick={() => handleNodeSelect(nodeId)} // Allow clicks on all nodes for development
          onMouseEnter={() => {
            setHoveredNode(nodeId);
            if (isInteractive && playSound) playSound('node-hover');
          }}
          onMouseLeave={() => setHoveredNode(null)}
          data-node-id={nodeId}
          data-instance-id={instanceIdRef.current}
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
                  width={80}
                  height={80}
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
                ${isCalibrationNode ? 'text-lg' : 'text-sm'} truncate font-medium 
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
                {node.type === 'kapoorCalibration' && 'Calibration'}
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
          
          {/* Special indicator for calibration nodes */}
          {isCalibrationNode && !isCompleted && (
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-clinical animate-pulse"></div>
          )}
          
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
  const renderConnections = useCallback(() => {
    if (!map || !map.nodes) return null;
    
    return map.nodes.flatMap(node => 
      node.connections.map((targetId: string, index: number) => {
        const targetNode = map.nodes.find(n => n.id === targetId);
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
        
        // For improved path visualization, we'll render both the path and directional arrow
        return (
          <div 
            key={`connection-${node.id}-${targetId}-${index}-${instanceIdRef.current}`} 
            className="connection-container"
            data-source={node.id}
            data-target={targetId}
            data-instance-id={instanceIdRef.current}
          >
            {/* Main path line */}
            <div 
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
            
            {/* Directional arrow - only show for active paths */}
            {style.arrowEnabled && (
              <div
                className="absolute"
                style={{
                  // Position it along the path, about 65% of the way
                  left: `${sourceX + (targetX - sourceX) * 0.65}%`,
                  top: `${sourceY + (targetY - sourceY) * 0.65}%`,
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'transparent',
                  borderLeft: `4px solid ${style.color}`,
                  borderBottom: `4px solid ${style.color}`,
                  opacity: style.opacity,
                  transform: `rotate(${angle + 45}deg)`,
                  zIndex: 6,
                  filter: node.id === activeNode || targetId === activeNode ? 
                    'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                }}
              />
            )}
          </div>
        );
      })
    ).filter(Boolean); // Filter out null connections
  }, [map, activeNode, getConnectionStyle]);
  
  // Handle end day click with enhanced feedback
  const handleEndDay = useCallback(() => {
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
  }, [playSound, flashScreen, completedNodeIds, completeDay]);
  
  // Check if we're showing the single node calibration experience
  const isSingleNodeMode = map?.nodes.length === 1 && map.nodes[0].type === 'kapoorCalibration';
  
  // Adjust title based on mode
  const titleText = isSingleNodeMode
    ? "LINAC Calibration Session"
    : "Medical Physics Department";
    
  const subtitleText = isSingleNodeMode
    ? "Begin the calibration session with Dr. Kapoor"
    : "Navigate through challenges to reach your goal";
  
  // If map is not loaded yet, show loading state
  if (!map || !map.nodes || map.nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center bg-surface-dark p-6 pixel-borders">
          <PixelText className="text-lg mb-2">Loading map data...</PixelText>
          <div className="w-16 h-2 bg-surface mx-auto">
            <div className="w-1/2 h-full bg-clinical animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render seed controls for development
  const renderSeedControls = () => {
    if (process.env.NODE_ENV !== 'production' && map?.seed) {
      return (
        <div className="fixed bottom-24 left-4 z-50 bg-black/80 p-2 rounded text-xs">
          <div className="mb-1">
            <strong className="text-white">Seed: {map.seed}</strong> 
            <span className="text-gray-300 ml-1">({map.seedName})</span>
            <button 
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
              onClick={() => {
                if (map?.seed !== undefined) {
                  const url = createSeedUrl(map.seed);
                  navigator.clipboard.writeText(url);
                  flashScreen && flashScreen('blue');
                }
              }}
            >
              Copy URL
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            <button 
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
              onClick={() => startGame({ seed: DEV_SEEDS.STANDARD })}
            >
              Standard
            </button>
            <button 
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
              onClick={() => startGame({ seed: DEV_SEEDS.TUTORIAL })}
            >
              Tutorial
            </button>
            <button 
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
              onClick={() => startGame()}
            >
              Random
            </button>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div 
      ref={mapContainerRef}
      className="h-full w-full p-8 flex flex-col items-center justify-center bg-background starfield-bg relative isolation"
      style={{ minHeight: '500px' }} // Ensure we have enough height to render
      data-component="simplified-map"
      data-instance-id={instanceIdRef.current}
    >
      <div className="text-center mb-8 relative">
        <PixelText className="text-4xl text-white font-pixel-heading mb-2 glow-text">
          {titleText}
        </PixelText>
        <PixelText className="text-lg text-blue-300">
          {subtitleText}
        </PixelText>
      </div>
      
      {/* Node map - show either single node or full map */}
      {isSingleNodeMode ? (
        // Single calibration node centered
        <div className="relative w-full h-64 max-w-xl mx-auto">
          {/* Position node at center */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: '50%',
              top: '50%',
            }}
          >
            {map.nodes[0] && renderNode(map.nodes[0].id, map.nodes[0])}
          </div>
        </div>
      ) : (
        // Full node map with branching paths
        <div className="relative w-full h-[600px] max-w-5xl mx-auto">
          {/* Connection paths first (so they're behind nodes) */}
          {renderConnections()}
          
          {/* Position nodes by percentage coordinates */}
          {map.nodes.map(node => (
            <div
              key={`${node.id}-container-${instanceIdRef.current}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}%`,
              }}
              data-node-container={node.id}
              data-instance-id={instanceIdRef.current}
            >
              {renderNode(node.id, node)}
            </div>
          ))}
        </div>
      )}
      
      {/* Return to Hill Home button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-sm pixel-borders-thin px-4 py-2 flex items-center space-x-4 z-30">
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
      
      {/* Map legend with better visual hierarchy - only show for multi-node maps */}
      {!isSingleNodeMode && (
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
      )}
      
      {/* Render seed controls for development */}
      {renderSeedControls()}
      
      {/* Debug visualization */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-2 right-2 bg-black/80 p-2 text-xs text-white z-50 font-mono">
          <div className="font-bold mb-1">Node Debug</div>
          {map?.nodes.map(node => (
            <div key={node.id} className="flex mb-1">
              <div className="w-24 truncate">{node.id}</div>
              <div className={`w-20 ${isNodeAccessible(node.id) ? 'text-green-400' : 'text-red-400'}`}>
                {isNodeAccessible(node.id) ? 'Accessible' : 'Locked'}
              </div>
              <div className="w-20 truncate">{node.challengeContent || node.type}</div>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <button 
              onClick={() => console.log("Map state:", map)} 
              className="p-1 bg-blue-800 text-white hover:bg-blue-700"
            >
              Log Map
            </button>
            <button 
              onClick={() => {
                // Force select start node
                const id = map?.startNodeId;
                if (id) handleNodeSelect(id);
              }}
              className="p-1 bg-green-800 text-white hover:bg-green-700"
            >
              Start Node
            </button>
          </div>
        </div>
      )}
      
      {/* Debug mode indicator in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-20 left-2 bg-black/70 text-white text-xs px-2 py-1 z-50">
          Instance: {instanceIdRef.current.slice(-4)} | 
          Mode: {isSingleNodeMode ? 'Single Node' : 'Full Map'} | 
          Nodes: {map.nodes.length} | 
          Seed: {map.seed || 'none'}
        </div>
      )}
      
      {/* Add CSS for connection arrows */}
      <style jsx global>{`
        /* Add animation for path pulsing */
        @keyframes pathPulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        
        .animate-pulse-path {
          animation: pathPulse 2s infinite;
        }
        
        .animate-pulse-path-subtle {
          animation: pathPulse 3s infinite;
        }
        
        /* Node highlighting effect */
        .node-highlight-glow {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
          animation: sweep 2s ease-in-out infinite;
        }
        
        @keyframes sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        /* Connection container - helps with arrow positioning */
        .connection-container {
          position: relative;
        }
      `}</style>
    </div>
  );
}