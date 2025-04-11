// app/components/map/SimplifiedKapoorMap.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { MapNode, JournalEntry } from '@/app/types/game';
import { safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { usePrimitiveStoreValue, useStableCallback } from '@/app/core/utils/storeHooks';

/**
 * SimplifiedKapoorMap Component - Enhanced Chamber Pattern Implementation
 *
 * Implements Chamber Transition Pattern principles:
 * 1. Extract primitive values only for rendering
 * 2. Use stable function references for actions
 * 3. Localize rendering-specific state
 * 4. Decouple state updates from animation
 * 5. Defend against async state updates after unmount
 * 
 * Critical improvements:
 * 1. Fixed node click handler to correctly update currentNodeId
 * 2. Added debug traces for interaction flow
 * 3. Enhanced error handling and recovery
 * 4. Improved animation performance with DOM-based transitions
 */
const SimplifiedKapoorMap: React.FC = () => {
  // ===== DOM REFS =====
  // Container ref for sizing and animation
  const containerRef = useRef<HTMLDivElement>(null);
  // SVG ref for direct DOM manipulations
  const svgRef = useRef<SVGSVGElement>(null);
  // Track component mount state
  const isMountedRef = useRef(true);
  // Animation timeout references
  const animationTimeoutRefs = useRef<NodeJS.Timeout[]>([]);
  // Click handling tracker to prevent duplicate clicks
  const clickProcessingRef = useRef(false);
  // Failed clicks counter
  const failedClicksRef = useRef(0);
  
  // ===== PRIMITIVE STORE VALUES =====
  // Extract only what's needed as primitives
  const currentSystem = usePrimitiveStoreValue(
    useGameStore, 
    state => state.currentSystem,
    'default'
  );
  
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore, 
    state => state.currentNodeId,
    null
  );
  
  // ===== LOCAL COMPONENT STATE =====
  // Static map nodes data - memoized to prevent recreation
  const mapNodes = useMemo<MapNode[]>(() => [
    { id: 'node-1', x: 150, y: 150, label: 'Calibration Basics', type: 'system', connections: ['node-2'], data: {} },
    { id: 'node-2', x: 350, y: 200, label: 'Dosimetry Principles', type: 'system', connections: ['node-3'], data: {} },
    { id: 'node-3', x: 550, y: 150, label: 'Radiation Safety', type: 'system', connections: [], data: {} },
  ], []);
  
  // Track completed nodes - we'll fetch this from game state
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  
  // Local UI state that doesn't affect data
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    lastClick: null as string | null,
    eventsSent: 0,
    lastError: null as string | null,
    nodeSelectionState: 'idle' // 'idle', 'processing', 'success', 'error'
  });
  
  // ===== STORE ACTION REFERENCES =====
  // Direct reference to critical store actions for more reliable access
  const storeActionsRef = useRef({
    setCurrentNode: null as ((nodeId: string) => void) | null,
    addJournalEntry: null as ((entry: any) => void) | null,
    unlockKnowledge: null as ((id: string) => void) | null
  });
  
  // Initialize store action references
  useEffect(() => {
    try {
      const gameStore = useGameStore.getState();
      const journalStore = useJournalStore.getState();
      const knowledgeStore = useKnowledgeStore.getState();
      
      storeActionsRef.current = {
        setCurrentNode: gameStore.setCurrentNode || null,
        addJournalEntry: journalStore.addEntry || null, 
        unlockKnowledge: knowledgeStore.unlockKnowledge || null
      };
      
      if (!storeActionsRef.current.setCurrentNode) {
        console.error('[SimplifiedKapoorMap] Critical function setCurrentNode not available in gameStore');
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Error initializing store actions:', error);
    }
  }, []);
  
  // ===== LIFECYCLE EFFECTS =====
  // Handle component mount/unmount
  useEffect(() => {
    console.log('[SimplifiedKapoorMap] Component mounted');
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all animation timeouts
      animationTimeoutRefs.current.forEach(clearTimeout);
      animationTimeoutRefs.current = [];
      
      console.log('[SimplifiedKapoorMap] Component unmounted');
    };
  }, []);
  
  // Fetch completed nodes on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.__GAME_STATE_MACHINE_DEBUG__?.getCurrentState) {
        const gameStateMachine = window.__GAME_STATE_MACHINE_DEBUG__.getCurrentState();
        if (gameStateMachine && gameStateMachine.completedNodeIds) {
          setCompletedNodes(gameStateMachine.completedNodeIds);
        }
      }
    } catch (error) {
      console.warn('[SimplifiedKapoorMap] Error getting completed nodes:', error);
    }
  }, []);
  
  // Handle window resize for responsive SVG
  useEffect(() => {
    const handleResize = () => {
      if (!isMountedRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth || window.innerWidth * 0.8;
      const containerHeight = containerRef.current.clientHeight || window.innerHeight * 0.6;
      
      setStageSize({
        width: Math.max(containerWidth, 400),
        height: Math.max(containerHeight, 300)
      });
    };
    
    // Initial sizing
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Apply initial animations when map loads
  useEffect(() => {
    if (!svgRef.current || !isMountedRef.current) return;
    
    // Fade in animation for the map
    if (svgRef.current) {
      svgRef.current.style.opacity = '0';
      
      const fadeInTimeout = setTimeout(() => {
        if (svgRef.current && isMountedRef.current) {
          svgRef.current.style.opacity = '1';
          svgRef.current.style.transition = 'opacity 0.5s ease-in-out';
        }
      }, 100);
      
      animationTimeoutRefs.current.push(fadeInTimeout);
    }
    
    // Sequential node appearance
    const nodeElements = svgRef.current.querySelectorAll('circle');
    nodeElements.forEach((node, index) => {
      node.style.opacity = '0';
      node.style.transform = 'scale(0.5)';
      
      const nodeTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          node.style.opacity = '1';
          node.style.transform = 'scale(1)';
          node.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        }
      }, 200 + (index * 150));
      
      animationTimeoutRefs.current.push(nodeTimeout);
    });
    
    // Sequential line appearance
    const lineElements = svgRef.current.querySelectorAll('line');
    lineElements.forEach((line, index) => {
      line.style.strokeDasharray = line.getTotalLength().toString();
      line.style.strokeDashoffset = line.getTotalLength().toString();
      
      const lineTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          line.style.strokeDashoffset = '0';
          line.style.transition = 'stroke-dashoffset 1s ease-in-out';
        }
      }, 500 + (index * 200));
      
      animationTimeoutRefs.current.push(lineTimeout);
    });
    
    return () => {
      // Clear all animation timeouts
      animationTimeoutRefs.current.forEach(clearTimeout);
      animationTimeoutRefs.current = [];
    };
  }, []);

  // Track changes to currentNodeId from the store
  useEffect(() => {
    if (currentNodeId) {
      console.log(`[SimplifiedKapoorMap] Current node ID from store: ${currentNodeId}`);
      
      // Update debug info when node selection succeeded
      if (debugInfo.nodeSelectionState === 'processing') {
        setDebugInfo(prev => ({
          ...prev,
          nodeSelectionState: 'success'
        }));
      }
    }
  }, [currentNodeId, debugInfo.nodeSelectionState]);
  
  // ===== STABLE EVENT HANDLERS =====
  // Node click handler with defensive coding and direct store access
  const handleNodeClick = useStableCallback((nodeId: string) => {
    if (!isMountedRef.current) return;
    if (clickProcessingRef.current) {
      console.log(`[SimplifiedKapoorMap] Click already being processed, ignoring click on ${nodeId}`);
      return;
    }
    
    // Set flag to prevent duplicate processing
    clickProcessingRef.current = true;
    
    // Update debug state
    setDebugInfo(prev => ({
      ...prev,
      lastClick: nodeId,
      eventsSent: prev.eventsSent + 1,
      nodeSelectionState: 'processing',
      lastError: null
    }));
    
    console.log(`[SimplifiedKapoorMap] Node clicked: ${nodeId}`);
    
    // Apply click animation directly to the node
    if (svgRef.current) {
      const clickedNode = svgRef.current.querySelector(`[data-node-id="${nodeId}"]`);
      if (clickedNode) {
        // Pulse animation
        clickedNode.classList.add('pulse-animation');
        
        const pulseTimeout = setTimeout(() => {
          if (isMountedRef.current && clickedNode) {
            clickedNode.classList.remove('pulse-animation');
          }
        }, 600);
        
        animationTimeoutRefs.current.push(pulseTimeout);
      }
    }
    
    // Set global animating state (for container effects)
    setIsAnimating(true);
    
    // Find the clicked node
    const clickedNode = mapNodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      console.error(`[SimplifiedKapoorMap] Node not found: ${nodeId}`);
      setDebugInfo(prev => ({
        ...prev,
        lastError: `Node not found: ${nodeId}`,
        nodeSelectionState: 'error'
      }));
      clickProcessingRef.current = false;
      return;
    }
    
    // Add journal entry using direct store access for safety
    try {
      if (storeActionsRef.current.addJournalEntry) {
        const newEntry: Partial<JournalEntry> = {
          title: `Visited ${clickedNode.label || nodeId}`,
          content: `Successfully navigated to ${clickedNode.label || nodeId}.`,
          tags: ['map', 'navigation', nodeId],
          category: 'Log',
        };
        
        storeActionsRef.current.addJournalEntry(newEntry as any);
        console.log(`[SimplifiedKapoorMap] Added journal entry for ${nodeId}`);
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Failed to add journal entry:', error);
      setDebugInfo(prev => ({...prev, lastError: 'Journal entry creation failed'}));
    }
    
    // Unlock knowledge using direct store access
    try {
      if (storeActionsRef.current.unlockKnowledge) {
        storeActionsRef.current.unlockKnowledge(`knowledge-${nodeId}`);
        console.log(`[SimplifiedKapoorMap] Unlocked knowledge for ${nodeId}`);
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Failed to unlock knowledge:', error);
      setDebugInfo(prev => ({...prev, lastError: 'Knowledge unlock failed'}));
    }
    
    // Double dispatch for node click event - critical!
    try {
      // First dispatch to UI_NODE_CLICKED - what ChallengeRouter listens for
      safeDispatch(
        GameEventType.UI_NODE_CLICKED, 
        { nodeId, interactionType: 'click', source: 'SimplifiedKapoorMap' },
        'SimplifiedKapoorMap'
      );
      console.log(`[SimplifiedKapoorMap] Dispatched UI_NODE_CLICKED event for ${nodeId}`);
      
      // Second direct dispatch via emit
      try {
        const gameStore = useGameStore.getState();
        if (gameStore && gameStore.emit) {
          gameStore.emit(
            GameEventType.UI_NODE_CLICKED,
            { nodeId, interactionType: 'click', source: 'direct_emission' }
          );
          console.log(`[SimplifiedKapoorMap] Emitted UI_NODE_CLICKED event for ${nodeId}`);
        }
      } catch (error) {
        console.error('[SimplifiedKapoorMap] Failed to emit event:', error);
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Failed to dispatch event:', error);
      setDebugInfo(prev => ({...prev, lastError: 'Event dispatch failed'}));
    }
    
    // CRITICAL CHANGE: Set the current node using the stored function reference
    // This is the most important action - it drives the state change!
    try {
      if (storeActionsRef.current.setCurrentNode) {
        console.log(`[SimplifiedKapoorMap] Setting current node to: ${nodeId}`);
        storeActionsRef.current.setCurrentNode(nodeId);
        
        // Verify the update by also trying the direct approach
        const gameStore = useGameStore.getState();
        if (gameStore && gameStore.setCurrentNode && gameStore.setCurrentNode !== storeActionsRef.current.setCurrentNode) {
          console.log(`[SimplifiedKapoorMap] Backup: Setting current node via fresh getState(): ${nodeId}`);
          gameStore.setCurrentNode(nodeId);
        }
      } else {
        console.error('[SimplifiedKapoorMap] setCurrentNode function not available');
        setDebugInfo(prev => ({...prev, lastError: 'setCurrentNode not available'}));
        
        // Try to recover by getting fresh reference
        try {
          const gameStore = useGameStore.getState();
          if (gameStore && gameStore.setCurrentNode) {
            console.log(`[SimplifiedKapoorMap] Recovery: Setting current node via fresh getState(): ${nodeId}`);
            gameStore.setCurrentNode(nodeId);
            
            // Update actions ref
            storeActionsRef.current.setCurrentNode = gameStore.setCurrentNode;
          } else {
            failedClicksRef.current++;
            throw new Error("Cannot find setCurrentNode function");
          }
        } catch (recoveryError) {
          console.error('[SimplifiedKapoorMap] Recovery also failed:', recoveryError);
          setDebugInfo(prev => ({
            ...prev, 
            lastError: `Set node failed after ${failedClicksRef.current} attempts: ${recoveryError.message || 'unknown error'}`
          }));
        }
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Failed to set current node:', error);
      setDebugInfo(prev => ({
        ...prev, 
        lastError: `Set node failed: ${error.message || 'unknown error'}`,
        nodeSelectionState: 'error'
      }));
    }
    
    // Reset animation state and click processing flag after animation completes
    const animationTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setIsAnimating(false);
        clickProcessingRef.current = false;
      }
    }, 600);
    
    animationTimeoutRefs.current.push(animationTimeout);
    
    // Fallback reset of click processing flag
    setTimeout(() => {
      clickProcessingRef.current = false;
    }, 2000);
  }, [mapNodes]);
  
  // Handle map action button click
  const handleMapAction = useStableCallback(() => {
    console.log("[SimplifiedKapoorMap] Map action button clicked!");
    
    // Simple animation effect using DOM ref
    if (svgRef.current) {
      svgRef.current.classList.add('map-action-pulse');
      
      const pulseTimeout = setTimeout(() => {
        if (svgRef.current && isMountedRef.current) {
          svgRef.current.classList.remove('map-action-pulse');
        }
      }, 500);
      
      animationTimeoutRefs.current.push(pulseTimeout);
    }
    
    // Refresh completed nodes list
    try {
      if (typeof window !== 'undefined' && window.__GAME_STATE_MACHINE_DEBUG__?.getCurrentState) {
        const gameStateMachine = window.__GAME_STATE_MACHINE_DEBUG__.getCurrentState();
        if (gameStateMachine && gameStateMachine.completedNodeIds) {
          setCompletedNodes(gameStateMachine.completedNodeIds);
        }
      }
    } catch (error) {
      console.warn('[SimplifiedKapoorMap] Error refreshing completed nodes:', error);
    }
    
    // Emergency recovery: reinitialize store action references
    try {
      const gameStore = useGameStore.getState();
      const journalStore = useJournalStore.getState();
      const knowledgeStore = useKnowledgeStore.getState();
      
      storeActionsRef.current = {
        setCurrentNode: gameStore.setCurrentNode || null,
        addJournalEntry: journalStore.addEntry || null, 
        unlockKnowledge: knowledgeStore.unlockKnowledge || null
      };
      
      console.log('[SimplifiedKapoorMap] Refreshed store action references');
      
      if (!storeActionsRef.current.setCurrentNode) {
        console.error('[SimplifiedKapoorMap] Critical function setCurrentNode still not available after refresh');
      }
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Error reinitializing store actions:', error);
    }
    
    // Dispatch debug event
    try {
      safeDispatch(
        GameEventType.DEBUG_COMMAND, 
        { command: 'reset-map-view' },
        'SimplifiedKapoorMap'
      );
    } catch (error) {
      console.error('[SimplifiedKapoorMap] Failed to dispatch debug event:', error);
    }
    
    // Reset click processing flag
    clickProcessingRef.current = false;
    failedClicksRef.current = 0;
    
    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      nodeSelectionState: 'idle',
      lastError: null
    }));
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
            strokeWidth={3}
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
      const isCompleted = completedNodes.includes(node.id);
      
      // Determine node colors based on state
      const fillColor = isCurrentNode 
        ? "rgba(255, 200, 0, 0.9)" 
        : isCompleted
          ? "rgba(0, 200, 100, 0.8)"
          : "rgba(0, 150, 255, 0.8)";
      
      const strokeColor = isHovered 
        ? "rgba(255, 255, 255, 1)" 
        : "rgba(255, 255, 255, 0.7)";
      
      const textColor = isCurrentNode
        ? "rgb(255, 220, 0)"
        : isCompleted
          ? "rgb(100, 255, 150)"
          : "white";
      
      return (
        <g key={node.id}>
          {/* Node circle */}
          <circle
            cx={node.x}
            cy={node.y}
            r={20}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isHovered ? 3 : 1.5}
            className="cursor-pointer transition-all duration-200"
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            data-node-id={node.id}
          />
          
          {/* Completed indicator */}
          {isCompleted && (
            <circle
              cx={node.x}
              cy={node.y}
              r={15}
              fill="none"
              stroke="rgba(100, 255, 100, 0.5)"
              strokeWidth={2}
              className="animate-pulse-slow"
            />
          )}
          
          {/* Node label */}
          <text
            x={node.x + 25}
            y={node.y}
            fontSize={14}
            fontWeight={isCurrentNode || isHovered ? "bold" : "normal"}
            fill={textColor}
            pointerEvents="none"
            className="pixel-text text-shadow-sm"
          >
            {node.label}
          </text>
        </g>
      );
    });
  }, [mapNodes, currentNodeId, hoveredNodeId, completedNodes, handleNodeClick]);
  
  // ===== MAIN RENDER =====
  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-hidden relative bg-gray-900 flex items-center justify-center ${isAnimating ? 'animate-map-click' : ''}`}
      data-testid="kapoor-map-container"
    >
      {/* Map background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-purple-900/20" />
      
      {/* SVG Map */}
      <svg 
        ref={svgRef}
        width={stageSize.width} 
        height={stageSize.height} 
        className="transition-all duration-300"
        style={{ opacity: 0 }} // Will be animated in with JS
        data-testid="kapoor-map-svg"
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100, 100, 255, 0.1)" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(100, 100, 255, 0.2)" strokeWidth="1" />
          </pattern>
        </defs>
        
        {/* Grid background */}
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Hospital sections background shapes */}
        <circle cx={150} cy={150} r={80} fill="rgba(100, 100, 255, 0.05)" />
        <circle cx={350} cy={200} r={80} fill="rgba(100, 255, 100, 0.05)" />
        <circle cx={550} cy={150} r={80} fill="rgba(255, 100, 100, 0.05)" />
        
        {/* Connection lines */}
        {renderConnectionLines()}
        
        {/* Nodes */}
        {renderNodes()}
      </svg>
      
      {/* Map action button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg transition-colors duration-200"
          onClick={handleMapAction}
        >
          Refresh Map
        </button>
      </div>
      
      {/* Current system display */}
      <div className="absolute top-4 left-4 text-sm text-white z-10 bg-gray-800/50 px-3 py-1 rounded-md shadow-inner">
        Current System: {currentSystem}
      </div>
      
      {/* Enhanced debug info - much more detail than before */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="absolute bottom-4 left-4 text-xs bg-black/80 p-2 rounded text-gray-300">
          <div>Selected node: <span className={currentNodeId ? 'text-green-400' : 'text-gray-400'}>
            {currentNodeId || 'none'}
          </span></div>
          <div>Last click: <span className="text-blue-400">{debugInfo.lastClick || 'none'}</span></div>
          <div>Selection state: <span className={
            debugInfo.nodeSelectionState === 'success' ? 'text-green-400' :
            debugInfo.nodeSelectionState === 'error' ? 'text-red-400' :
            debugInfo.nodeSelectionState === 'processing' ? 'text-yellow-400' :
            'text-gray-400'
          }>
            {debugInfo.nodeSelectionState}
          </span></div>
          <div>Events sent: {debugInfo.eventsSent}</div>
          <div>Completed nodes: <span className="text-green-400">{completedNodes.join(', ') || 'none'}</span></div>
          {debugInfo.lastError && (
            <div className="text-red-400 mt-1 border-t border-red-800 pt-1">
              Error: {debugInfo.lastError}
            </div>
          )}
        </div>
      )}
      
      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .pulse-animation {
          animation: pulse 0.6s ease-in-out;
        }
        
        .map-action-pulse {
          animation: pulse 0.5s ease-in-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s infinite ease-in-out;
        }
        
        .text-shadow-sm {
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
        }
        
        .pixel-text {
          font-family: 'VT323', monospace;
          image-rendering: pixelated;
        }
        
        .animate-map-click {
          animation: map-click 0.3s ease-in-out;
        }
        
        @keyframes map-click {
          0% { transform: scale(1); }
          50% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(SimplifiedKapoorMap);