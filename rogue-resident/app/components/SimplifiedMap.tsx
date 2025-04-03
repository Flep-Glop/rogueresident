// app/components/SimplifiedMap.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
    isNodeAccessible,
    map
  } = useGameStore();
  
  const { playSound, flashScreen } = useGameEffects();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [renderState, setRenderState] = useState<string>('initial');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const nodeSelectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable map data reference to avoid unnecessary rerenders
  const mapNodesRef = useRef<Record<string, Node>>({});
  
  // Map initialization and stability checks
  useEffect(() => {
    // Set render state for debugging
    setRenderState('map-initializing');
    
    // Initialize mapNodes from actual game map
    if (map && map.nodes) {
      const nodesMap: Record<string, Node> = {};
      map.nodes.forEach(node => {
        nodesMap[node.id] = node;
      });
      mapNodesRef.current = nodesMap;
      
      console.log("Map nodes initialized:", Object.keys(nodesMap));
      
      // Add a short delay to ensure map is ready for rendering
      setTimeout(() => {
        setIsMapReady(true);
        setRenderState('map-ready');
      }, 100);
    } else {
      setRenderState('no-map-data');
    }
    
    return () => {
      // Clean up any pending timeouts to prevent memory leaks
      if (nodeSelectTimeoutRef.current) {
        clearTimeout(nodeSelectTimeoutRef.current);
        nodeSelectTimeoutRef.current = null;
      }
    };
  }, [map]);
  
  // Set initial active node if none selected - with safer timeout handling
  useEffect(() => {
    // Clean up any existing timeout
    if (nodeSelectTimeoutRef.current) {
      clearTimeout(nodeSelectTimeoutRef.current);
      nodeSelectTimeoutRef.current = null;
    }
    
    // Only attempt node selection when map is ready
    if (isMapReady && !currentNodeId && !activeNode && map) {
      setRenderState('selecting-initial-node');
      
      // Auto-select the kapoorCalibrationNode if available, otherwise use map's startNodeId
      const calibrationNode = map.nodes.find(node => node.type === 'kapoorCalibration');
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
  
    if (!isFirstNode && !isNodeAccessible(nodeId)) {
      console.log(`Node ${nodeId} is not accessible`);
      return;
    }

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
  
  // Enhanced node class generator
  const getNodeClasses = (nodeId: string, node: Node): string => {
    const state = getNodeState(nodeId);
    const isActive = state === 'active';
    const isHovered = hoveredNode === nodeId;
    
    // Base classes with transition
    let classes = 'transition-all duration-300 relative';
    
    // Visual variations by state - more direct visibility
    switch (state) {
      case 'active':
        classes += ' transform scale-110 z-30 shadow-pixel-lg brightness-110';
        break;
      case 'completed':
        classes += ' z-20 shadow-pixel opacity-90';
        break;
      case 'accessible':
        classes += ' hover:scale-105 z-10 shadow-pixel cursor-pointer';
        if (isHovered) classes += ' brightness-110';
        break;
      case 'future':
        // Much higher visibility for future nodes
        classes += ' opacity-70 z-10';
        break;
      case 'locked':
        // Higher visibility for locked nodes
        classes += ' opacity-60 z-5';
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
    const uniqueNodeId = `node-${nodeId}`;
    
    // Only show partial info for future nodes, and none for locked nodes
    const showContent = !isNodeLocked;
    const showFullContent = !isNodeFuture && !isNodeLocked;
    
    // Adjust node size - make calibration node larger
    const nodeWidth = isCalibrationNode ? 'w-64' : 'w-56';
    const nodeHeight = isCalibrationNode ? 'h-28' : 'h-20';
    
    // CRITICAL FIX: Force visibility of nodes and their content
    return (
        <div 
          id={uniqueNodeId}
          key={nodeId}
          className={`${nodeWidth} ${nodeHeight} relative ${getNodeClasses(nodeId, node)}`}
          style={{
            // Force visibility, higher z-index, and proper opacity
            opacity: isNodeLocked ? 0.7 : 0.9,
            zIndex: 50,
            filter: 'none'
          }}
          onClick={() => isInteractive && handleNodeSelect(nodeId)}
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
      
          {/* Character positioned at bottom-left breaking out of node - CRITICAL FIX */}
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
                opacity: 1, // Force full opacity
                visibility: 'visible' // Force visibility
              }}
            >
              {/* LOCAL TESTING FALLBACK */}
              <div
                className="w-full h-full flex items-center justify-center bg-gray-800 text-white"
                style={{color: getNodeColor(node)}}
              >
                {node.character ? node.character.charAt(0).toUpperCase() : 'K'}
              </div>
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
          
          {/* Content - just title and minimal info - CRITICAL FIX */}
          <div className="absolute inset-0 flex flex-col justify-center pl-16 pr-3">
            <PixelText 
              className={`
                ${isCalibrationNode ? 'text-lg' : 'text-sm'} truncate font-medium 
                ${isActive || isHovered ? 'text-white' : 'text-gray-300'}
                transition-colors duration-300
              `}
              style={{opacity: 1, visibility: 'visible'}} // Force visibility
            >
              {showContent ? (node.title || 'Node') : '???'}
            </PixelText>
            
            {/* Just the minimal type indicator - no badge */}
            <div className="flex items-center mt-1" style={{opacity: 1, visibility: 'visible'}}> {/* Force visibility */}
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
                    +{node.insightReward || 10}
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
        
        // Connection styling - CRITICAL FIX: Higher opacity and z-index
        return (
          <div 
            key={`connection-${node.id}-${targetId}-${index}`}
            className="absolute transition-opacity duration-500"
            style={{
              left: `${sourceX}%`,
              top: `${sourceY}%`,
              width: '1px', // Will be scaled
              height: `${length}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.4)', // Higher contrast
              opacity: 0.7, // Higher baseline opacity for all connections
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'top left',
              scale: `3 1`, // Thicker lines
              zIndex: 40, // Higher z-index
            }}
          />
        );
      })
    ).filter(Boolean); // Filter out null connections
  }, [map, activeNode]);
  
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
  
  // Emergency visibility function
  const forceNodeVisibility = () => {
    // Force all nodes to maximum visibility
    document.querySelectorAll('[id^="node-"]').forEach(node => {
      const element = node as HTMLElement;
      element.style.opacity = '1';
      element.style.zIndex = '1000';
      element.style.filter = 'none';
      
      // Force child elements to be visible
      Array.from(element.querySelectorAll('*')).forEach(child => {
        (child as HTMLElement).style.opacity = '1';
        (child as HTMLElement).style.visibility = 'visible';
      });
    });
    
    // Make connections visible too
    document.querySelectorAll('div[style*="rotate"]').forEach(conn => {
      const element = conn as HTMLElement;
      element.style.opacity = '1';
      element.style.zIndex = '999';
    });
    
    console.log("Emergency visibility activated on all nodes");
  };
  
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
          <p className="mt-2 text-xs text-gray-400">
            Render state: {renderState} | Init: {isMapReady ? 'ready' : 'loading'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Debug controls */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 left-2 z-[1000]">
          <button 
            onClick={forceNodeVisibility}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
          >
            Emergency Visibility
          </button>
        </div>
      )}
      
      <div 
        ref={mapContainerRef}
        className="h-full w-full p-8 flex flex-col items-center justify-center bg-background starfield-bg"
        style={{ 
          minHeight: '100vh',
          position: 'relative',
          zIndex: 5,
        }}
        data-renderstate={renderState}
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
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  left: `${node.position.x}%`,
                  top: `${node.position.y}%`,
                  zIndex: 45,
                }}
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
      </div>
    </>
  );
}