// app/components/EnhancedMap.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { NodePosition, Node, NodeState } from '../types/map';
import { useGameEffects } from './GameEffects';
import { uiHandlers } from '../core/events/uiHandlers';
import { gameEvents } from '../core/events/GameEvents';

// Node type to icon mapping
const NODE_TYPE_ICONS = {
  'calibration': '/icons/calibration.png',
  'clinical': '/icons/clinical.png',
  'qa': '/icons/qa.png', 
  'educational': '/icons/educational.png',
  'storage': '/icons/storage.png',
  'entrance': '/icons/entrance.png',
  'boss': '/icons/boss.png',
  'boss-ionix': '/icons/boss-ionix.png',
  // Default fallback
  'default': '/icons/node-default.png'
};

// Define clear progression tiers
const PROGRESSION_TIERS = {
  ENTRANCE: 0,
  EARLY: 1,
  MID: 2,
  LATE: 3,
  BOSS: 4
};

// Calculate progression tier based on node connections and type
const calculateNodeTier = (node: Node, nodes: Node[]) => {
  // Boss and entrance have fixed tiers
  if (node.type === 'boss' || node.type === 'boss-ionix') return PROGRESSION_TIERS.BOSS;
  if (node.type === 'entrance') return PROGRESSION_TIERS.ENTRANCE;
  
  // Calculate based on shortest path from entrance
  let shortestPath = Infinity;
  const visited = new Set<string>();
  const queue: Array<{id: string, distance: number}> = [];
  
  // Find entrance node
  const entranceNode = nodes.find(n => n.type === 'entrance');
  if (entranceNode) {
    queue.push({id: entranceNode.id, distance: 0});
    visited.add(entranceNode.id);
  }
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.id === node.id) {
      shortestPath = current.distance;
      break;
    }
    
    // Add unvisited connected nodes
    const currentNode = nodes.find(n => n.id === current.id);
    if (currentNode) {
      for (const connectedId of currentNode.connections) {
        if (!visited.has(connectedId)) {
          queue.push({id: connectedId, distance: current.distance + 1});
          visited.add(connectedId);
        }
      }
    }
  }
  
  // Map distance to tier
  if (shortestPath === 1) return PROGRESSION_TIERS.EARLY;
  if (shortestPath === 2) return PROGRESSION_TIERS.MID;
  return PROGRESSION_TIERS.LATE;
};

// Enhanced Map Interface
interface EnhancedMapProps {
  className?: string;
}

const EnhancedMap: React.FC<EnhancedMapProps> = ({ className }) => {
  // Game state access
  const { map, currentNodeId, completedNodeIds, setCurrentNode } = useGameStore();
  const { playSound, createConnectionEffect } = useGameEffects();
  
  // Local state for interaction
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [mapRevealed, setMapRevealed] = useState(false);
  const [nodeTiers, setNodeTiers] = useState<Record<string, number>>({});
  
  // Refs for animations and interactions
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const connectionRefs = useRef<HTMLDivElement[]>([]);
  
  // Setup node tiers on load
  useEffect(() => {
    if (map && map.nodes) {
      const tierMap: Record<string, number> = {};
      
      map.nodes.forEach(node => {
        tierMap[node.id] = calculateNodeTier(node, map.nodes);
      });
      
      setNodeTiers(tierMap);
    }
  }, [map]);
  
  // Map revealed animation
  useEffect(() => {
    // Delay to ensure smooth transition
    const timer = setTimeout(() => {
      setMapRevealed(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Determine if a node is accessible (refactored from gameStore for component use)
  const isNodeAccessible = (nodeId: string): boolean => {
    if (!map) return false;
    
    // Start node is always accessible
    if (map.startNodeId === nodeId) return true;
    
    // Find the node
    const node = map.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    
    // Special cases that are always accessible
    if (node.type === 'entrance') return true;
    
    // Check if connected to a completed node
    return map.nodes.some(n => 
      n.connections.includes(nodeId) && completedNodeIds.includes(n.id)
    );
  };
  
  // Get visual state of node (accessible, completed, etc.)
  const getNodeState = (nodeId: string): NodeState => {
    if (!map) return 'locked';
    
    if (currentNodeId === nodeId) return 'active';
    if (completedNodeIds.includes(nodeId)) return 'completed';
    if (isNodeAccessible(nodeId)) return 'accessible';
    
    // Check if this node is connected to an accessible node
    const isConnectedToAccessible = map.nodes.some(n => 
      isNodeAccessible(n.id) && n.connections.includes(nodeId)
    );
    
    return isConnectedToAccessible ? 'future' : 'locked';
  };
  
  // Calculate connection state for visual styling
  const getConnectionState = (sourceId: string, targetId: string): string => {
    const sourceState = getNodeState(sourceId);
    const targetState = getNodeState(targetId);
    
    if (sourceState === 'completed' && targetState === 'completed') {
      return 'connection-completed';
    }
    
    if (sourceState === 'completed' && targetState === 'accessible') {
      return 'connection-active';
    }
    
    if (sourceState === 'completed' && targetState === 'future') {
      return 'connection-future';
    }
    
    if (sourceState === 'accessible' || targetState === 'accessible') {
      return 'connection-accessible';
    }
    
    return 'connection-locked';
  };
  
  // Handle node selection
  const handleNodeClick = (nodeId: string) => {
    // Only allow interaction with accessible nodes
    if (isNodeAccessible(nodeId)) {
      // Already on this node? Do nothing
      if (currentNodeId === nodeId) return;
      
      // Play selection sound and visual effect
      playSound('node-select');
      
      // Get node positions for connection effect
      const sourceNode = nodeRefs.current[currentNodeId || ''];
      const targetNode = nodeRefs.current[nodeId];
      
      if (sourceNode && targetNode) {
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        
        // Create visual connection effect
        createConnectionEffect(
          sourceRect.left + sourceRect.width / 2,
          sourceRect.top + sourceRect.height / 2,
          targetRect.left + targetRect.width / 2,
          targetRect.top + targetRect.height / 2
        );
      }
      
      // Update game state
      setCurrentNode(nodeId);
      
      // Emit event for analytics and state tracking
      gameEvents.dispatch('node:selected', { nodeId });
    }
  };
  
  // Calculate line properties for node connections
  const calculateLineProps = (sourcePos: NodePosition, targetPos: NodePosition) => {
    // Convert percentage to pixel positions based on container size
    const containerWidth = mapContainerRef.current?.clientWidth || 1000;
    const containerHeight = mapContainerRef.current?.clientHeight || 600;
    
    // Calculate actual positions
    const x1 = (sourcePos.x / 100) * containerWidth;
    const y1 = (sourcePos.y / 100) * containerHeight;
    const x2 = (targetPos.x / 100) * containerWidth;
    const y2 = (targetPos.y / 100) * containerHeight;
    
    // Calculate line length and angle
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return {
      left: x1,
      top: y1,
      width: length,
      transform: `rotate(${angle}deg)`,
      height: 4 // Line thickness
    };
  };
  
  // Get CSS class based on node type
  const getNodeTypeClass = (nodeType: string) => {
    // Map node types to CSS classes
    const typeMap: Record<string, string> = {
      'calibration': 'node-clinical',
      'clinical': 'node-clinical',
      'qa': 'node-qa',
      'educational': 'node-educational',
      'storage': 'node-storage',
      'entrance': 'node-clinical',
      'boss': 'node-boss',
      'boss-ionix': 'node-boss'
    };
    
    return typeMap[nodeType] || 'node-clinical';
  };
  
  // Get appropriate icon for node
  const getNodeIcon = (nodeType: string) => {
    return NODE_TYPE_ICONS[nodeType] || NODE_TYPE_ICONS.default;
  };
  
  // Handle node hover for additional info
  const handleNodeHover = (nodeId: string | null) => {
    setHoverNodeId(nodeId);
  };
  
  // Get focus zone class based on node tier and current state
  const getFocusZoneClass = (nodeId: string) => {
    const tier = nodeTiers[nodeId] || 0;
    const state = getNodeState(nodeId);
    
    // Focal point is current or accessible nodes
    if (state === 'active' || state === 'accessible') {
      return 'focus-zone-1 active';
    }
    
    // Next tier is completed and future nodes
    if (state === 'completed' || state === 'future') {
      return 'focus-zone-2';
    }
    
    // Outer zone is locked nodes
    return 'focus-zone-3';
  };
  
  // Render connection lines between nodes
  const renderConnections = () => {
    if (!map) return null;
    
    const connections: JSX.Element[] = [];
    connectionRefs.current = [];
    
    map.nodes.forEach(node => {
      const sourcePos = node.position;
      
      node.connections.forEach(targetId => {
        // Find target node
        const targetNode = map.nodes.find(n => n.id === targetId);
        if (!targetNode) return;
        
        const targetPos = targetNode.position;
        const lineProps = calculateLineProps(sourcePos, targetPos);
        const connectionState = getConnectionState(node.id, targetId);
        
        // Create connection element with particle flow
        const connectionRef = React.createRef<HTMLDivElement>();
        connections.push(
          <div
            key={`connection-${node.id}-${targetId}`}
            className={`connection-line ${connectionState}`}
            style={lineProps}
            ref={el => {
              if (el) connectionRefs.current.push(el);
            }}
          >
            <div className="connection-line-bg"></div>
            <div className="connection-line-glow"></div>
            <div className="flow-particles">
              <div className="flow-particle particle-1"></div>
              <div className="flow-particle particle-2"></div>
              <div className="flow-particle particle-3"></div>
              <div className="flow-particle particle-4"></div>
              <div className="flow-particle particle-5"></div>
            </div>
          </div>
        );
      });
    });
    
    return connections;
  };
  
  // Render all map nodes
  const renderNodes = () => {
    if (!map) return null;
    
    return map.nodes.map(node => {
      const nodeState = getNodeState(node.id);
      const nodeTypeClass = getNodeTypeClass(node.type);
      const isHovered = hoverNodeId === node.id;
      const focusClass = getFocusZoneClass(node.id);
      
      // Calculate reveal delay based on tier
      const tier = nodeTiers[node.id] || 0;
      const revealDelay = tier * 0.2; // seconds
      
      return (
        <div
          key={node.id}
          ref={el => nodeRefs.current[node.id] = el}
          className={`map-node ${nodeTypeClass} node-${nodeState} ${focusClass} ${mapRevealed ? 'node-reveal' : ''}`}
          style={{
            left: `${node.position.x}%`,
            top: `${node.position.y}%`,
            animationDelay: `${revealDelay}s`,
            zIndex: nodeState === 'active' ? 30 : 10
          }}
          onClick={() => handleNodeClick(node.id)}
          onMouseEnter={() => handleNodeHover(node.id)}
          onMouseLeave={() => handleNodeHover(null)}
        >
          <div className="node-container">
            <div className="node-border"></div>
            <div className="node-background"></div>
            <div className="node-icon">
              <img src={getNodeIcon(node.type)} alt={node.type} className="pixel-art-sprite" />
            </div>
            {node.insightReward && (
              <div className="node-reward">+{node.insightReward}</div>
            )}
          </div>
          <div className="node-title">{node.title}</div>
        </div>
      );
    });
  };
  
  // Render map progress indicator
  const renderMapProgress = () => {
    if (!map) return null;
    
    const stats = {
      completed: map.nodes.filter(n => completedNodeIds.includes(n.id)).length,
      accessible: map.nodes.filter(n => isNodeAccessible(n.id) && !completedNodeIds.includes(n.id)).length,
      future: map.nodes.filter(n => {
        const state = getNodeState(n.id);
        return state === 'future';
      }).length,
      locked: map.nodes.filter(n => {
        const state = getNodeState(n.id);
        return state === 'locked';
      }).length,
      total: map.nodes.length
    };
    
    return (
      <div className="map-progress">
        <div className="progress-title">Map Progress</div>
        <div className="progress-indicators">
          <div className="progress-row">
            <div className="progress-marker marker-completed"></div>
            <div className="progress-text">Completed: {stats.completed}</div>
          </div>
          <div className="progress-row">
            <div className="progress-marker marker-available"></div>
            <div className="progress-text">Available: {stats.accessible}</div>
          </div>
          <div className="progress-row">
            <div className="progress-marker marker-future"></div>
            <div className="progress-text">Upcoming: {stats.future}</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Main render
  if (!map) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-xl text-white">Loading map...</div>
      </div>
    );
  }
  
  return (
    <div 
      className={`map-container ${mapRevealed ? 'map-revealed' : ''} ${className || ''}`}
      ref={mapContainerRef}
    >
      <div className="starfield-bg">
        {/* Depth layers for atmosphere */}
        <div className="depth-layer depth-layer-1"></div>
        <div className="depth-layer depth-layer-2"></div>
        
        {/* Connection lines with particle effects */}
        {renderConnections()}
        
        {/* Map nodes */}
        {renderNodes()}
        
        {/* Map progress indicator */}
        {renderMapProgress()}
      </div>
      
      {/* Map controls - zoom toggle */}
      <div 
        className="absolute bottom-4 right-4 bg-gray-900/70 p-2 rounded-lg cursor-pointer hover:bg-gray-800/80"
        onClick={() => setZoomedIn(!zoomedIn)}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {zoomedIn ? (
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          ) : (
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default EnhancedMap;