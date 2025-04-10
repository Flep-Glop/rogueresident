// app/components/map/SimplifiedKapoorMap.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { MapNode, JournalEntry } from '@/app/types/game';
import { safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { usePrimitiveStoreValue, useStableStoreValue } from '@/app/core/utils/storeHooks';

/**
 * SimplifiedKapoorMap Component - Chamber Pattern Implementation
 *
 * Implements Chamber Transition Pattern principles:
 * 1. Extract primitive values only for rendering
 * 2. Use stable function references for actions
 * 3. Localize rendering-specific state
 * 4. Decouple state updates from animation
 * 5. Defend against async state updates after unmount
 */
const SimplifiedKapoorMap: React.FC = () => {
  // ===== DOM REFS =====
  // Container ref for sizing and animation
  const containerRef = useRef<HTMLDivElement>(null);
  // SVG ref for direct DOM manipulations
  const svgRef = useRef<SVGSVGElement>(null);
  // Track component mount state
  const isMountedRef = useRef(true);
  
  // ===== PRIMITIVE STORE VALUES =====
  // Extract only what's needed as primitives
  const currentSystem = usePrimitiveStoreValue(
    useGameStore, 
    state => state.currentSystem,
    'None'
  );
  
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore, 
    state => state.currentNodeId,
    null
  );
  
  // ===== STABLE FUNCTION REFERENCES =====
  // Extract actions with stable references
  const gameActions = useStableStoreValue(
    useGameStore,
    state => ({
      setCurrentNode: state.setCurrentNode
    })
  );
  
  const journalActions = useStableStoreValue(
    useJournalStore,
    state => ({
      addEntry: state.addEntry || state.addJournalEntry
    })
  );
  
  const knowledgeActions = useStableStoreValue(
    useKnowledgeStore,
    state => ({
      unlockKnowledge: state.unlockKnowledge
    })
  );
  
  // Safely extract functions with fallbacks
  const { 
    setCurrentNode = (nodeId) => console.warn(`setCurrentNode not available for ${nodeId}`)
  } = gameActions;
  
  const {
    addEntry = (entry) => console.warn(`addEntry not available`)
  } = journalActions;
  
  const {
    unlockKnowledge = (id) => console.warn(`unlockKnowledge not available for ${id}`)
  } = knowledgeActions;
  
  // ===== LOCAL COMPONENT STATE =====
  // Static map nodes data - memoized to prevent recreation
  const mapNodes = useMemo<MapNode[]>(() => [
    { id: 'node-1', x: 100, y: 100, label: 'Start', type: 'system', connections: ['node-2'], data: {} },
    { id: 'node-2', x: 300, y: 150, label: 'Midpoint', type: 'system', connections: ['node-3'], data: {} },
    { id: 'node-3', x: 500, y: 100, label: 'End', type: 'system', connections: [], data: {} },
  ], []);
  
  // Local UI state that doesn't affect data
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  // ===== LIFECYCLE EFFECTS =====
  // Handle component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Handle window resize for responsive SVG
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth || window.innerWidth * 0.8;
      const containerHeight = containerRef.current.clientHeight || window.innerHeight * 0.6;
      
      setStageSize({
        width: containerWidth,
        height: containerHeight
      });
    };
    
    // Initial sizing
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ===== STABLE EVENT HANDLERS =====
  // Node click handler with defensive coding
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isMountedRef.current) return;
    
    console.log(`Node clicked: ${nodeId}`);
    setIsAnimating(true);
    
    // Find the clicked node
    const clickedNode = mapNodes.find(n => n.id === nodeId);
    if (!clickedNode) return;
    
    // Add journal entry
    try {
      const newEntry: Partial<JournalEntry> = {
        title: `Visited ${clickedNode.label || nodeId}`,
        content: `Successfully navigated to ${clickedNode.label || nodeId}.`,
        tags: ['map', 'navigation', nodeId],
        category: 'Log',
      };
      
      addEntry(newEntry as any);
    } catch (error) {
      console.error('Failed to add journal entry:', error);
    }
    
    // Unlock knowledge
    try {
      unlockKnowledge(`knowledge-${nodeId}`);
    } catch (error) {
      console.error('Failed to unlock knowledge:', error);
    }
    
    // Emit a central event
    try {
      safeDispatch(
        GameEventType.UI_NODE_CLICKED, 
        { nodeId, interactionType: 'click' },
        'SimplifiedKapoorMap'
      );
    } catch (error) {
      console.error('Failed to dispatch event:', error);
    }
    
    // Set the selected node in game state
    try {
      setCurrentNode(nodeId);
    } catch (error) {
      console.error('Failed to set current node:', error);
    }
    
    // Reset animation state after animation completes
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsAnimating(false);
      }
    }, 300);
  }, [mapNodes, addEntry, unlockKnowledge, setCurrentNode]);
  
  // Handle map action button click
  const handleMapAction = useCallback(() => {
    console.log("Map action button clicked!");
    
    // Simple animation effect using DOM ref
    if (svgRef.current) {
      svgRef.current.classList.add('map-action-pulse');
      setTimeout(() => {
        if (svgRef.current) {
          svgRef.current.classList.remove('map-action-pulse');
        }
      }, 500);
    }
    
    // Dispatch debug event
    try {
      safeDispatch(
        GameEventType.DEBUG_COMMAND, 
        { command: 'reset-map-view' },
        'SimplifiedKapoorMap'
      );
    } catch (error) {
      console.error('Failed to dispatch debug event:', error);
    }
  }, []);
  
  // ===== UTILITY FUNCTIONS =====
  // Find node coordinates for drawing lines - memoized per node
  const getNodeCoords = useCallback((nodeId: string): { x: number; y: number } | null => {
    const node = mapNodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : null;
  }, [mapNodes]);
  
  // ===== RENDER HELPERS =====
  // Connection lines renderer
  const renderConnectionLines = useCallback(() => {
    return mapNodes.flatMap(node =>
      node.connections.map((targetId: string) => {
        const startCoords = getNodeCoords(node.id);
        const endCoords = getNodeCoords(targetId);
        
        if (!startCoords || !endCoords) return null;
        
        return (
          <line
            key={`${node.id}-${targetId}`}
            x1={startCoords.x}
            y1={startCoords.y}
            x2={endCoords.x}
            y2={endCoords.y}
            stroke="rgba(100, 100, 255, 0.5)"
            strokeWidth={2}
            className="transition-all duration-300"
          />
        );
      })
    );
  }, [mapNodes, getNodeCoords]);
  
  // Node renderer with interaction handlers
  const renderNodes = useCallback(() => {
    return mapNodes.map(node => {
      const isCurrentNode = node.id === currentNodeId;
      const isHovered = node.id === hoveredNodeId;
      
      return (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={15}
            fill={isCurrentNode ? "rgba(255, 200, 0, 0.9)" : "rgba(0, 150, 255, 0.8)"}
            stroke={isHovered ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.7)"}
            strokeWidth={isHovered ? 2 : 1}
            className="cursor-pointer transition-all duration-200"
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          />
          <text
            x={node.x + 20}
            y={node.y - 5}
            fontSize={12}
            fill="white"
            pointerEvents="none"
          >
            {node.label}
          </text>
        </g>
      );
    });
  }, [mapNodes, currentNodeId, hoveredNodeId, handleNodeClick]);
  
  // ===== MAIN RENDER =====
  return (
    <div 
      ref={containerRef}
      className={`w-full h-full border border-gray-700 rounded-lg overflow-hidden relative bg-gray-900 flex items-center justify-center ${isAnimating ? 'animate-map-click' : ''}`}
    >
      {/* SVG Map */}
      <svg 
        ref={svgRef}
        width={stageSize.width} 
        height={stageSize.height} 
        className="absolute inset-0 transition-all duration-300"
        data-testid="kapoor-map-svg"
      >
        {/* Connection lines */}
        {renderConnectionLines()}
        
        {/* Nodes */}
        {renderNodes()}
      </svg>
      
      {/* Map action button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          className="px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700 transition-colors text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={handleMapAction}
        >
          Map Action
        </button>
      </div>
      
      {/* Current system display */}
      <div className="absolute top-4 left-4 text-xs text-gray-400 z-10">
        Current System: {currentSystem}
      </div>
    </div>
  );
};

export default React.memo(SimplifiedKapoorMap);