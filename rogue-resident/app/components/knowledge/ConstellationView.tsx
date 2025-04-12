// app/components/knowledge/ConstellationView.tsx
'use client';
/**
 * ConstellationView - Enhanced Interaction Implementation
 * 
 * Improvements:
 * 1. Robust click handling with DOM-based interaction tracking
 * 2. Reduced optimization complexity for more reliable state updates
 * 3. Explicit debugging for interaction flow
 * 4. Better state isolation to prevent rendering issues
 * 5. Maintains Chamber Pattern architectural vision
 * 6. Fixed all TypeScript type issues
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePrimitiveStoreValue, useStableCallback } from '../../core/utils/storeHooks';
import { useKnowledgeStore, ConceptNode, ConceptConnection, KnowledgeState } from '../../store/knowledgeStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_LIGHT } from '../../core/themeConstants';
import { GameEventType } from '@/app/core/events/EventTypes';
import { safeDispatch } from '@/app/core/events/CentralEventBus';

// Import Drawing Utilities
import {
  drawStarryBackground,
  drawConnections,
  drawNodes,
  drawPendingConnection,
  drawParticles
} from './constellationCanvasUtils';

// Import UI Sub-components
import ConstellationInfoPanel from './ui/ConstellationInfoPanel';
import ConstellationLegend from './ui/ConstellationLegend';
import ConstellationControls from './ui/ConstellationControls';
import ConstellationActions from './ui/ConstellationActions';
import SelectedNodePanel from './ui/SelectedNodePanel';
import ConnectionSuggestionsPanel from './ui/ConnectionSuggestionsPanel';
import JournalOverlay from './ui/JournalOverlay';
import HelpOverlay from './ui/HelpOverlay';

// Re-export Knowledge Domains for external use
export { KNOWLEDGE_DOMAINS } from '../../store/knowledgeStore';

// Helper type for particle effects
type ParticleEffect = {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  opacity?: number;
  velocity?: { x: number, y: number }
};

interface ConstellationViewProps {
  nightMode?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  width?: number;
  height?: number;
  onClose?: () => void;
  activeNodes?: string[]; // IDs of nodes to highlight
  fullscreen?: boolean;
  enableJournal?: boolean;
}

/**
 * Enhanced ConstellationView with direct DOM interaction
 */
export default function ConstellationView({
  onClose,
  width,
  height,
  interactive = true,
  enableJournal = true,
  activeNodes = [],
  fullscreen = true,
  nightMode = false,
  showLabels = true
}: ConstellationViewProps) {
  // ========= REFS FOR DOM & ANIMATION STATE =========
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isComponentMountedRef = useRef(true);
  const particleEffectsRef = useRef<ParticleEffect[]>([]);
  const interactionStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragThreshold: 5,
    lastClickTime: 0,
    clickCoords: { x: 0, y: 0 },
    pendingClick: false,
    lastTouchDistance: 0,
    isMultiTouch: false,
    debugMode: process.env.NODE_ENV !== 'production',
    lastHoveredNodeId: null as string | null,
    renderNeeded: false
  });
  
  // Debug logger function
  const debugLog = useCallback((message: string, ...args: any[]) => {
    if (interactionStateRef.current.debugMode) {
      console.log(`[ConstellationView] ${message}`, ...args);
    }
  }, []);

  // ========= LOCAL COMPONENT STATE =========
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [recentInsights, setRecentInsights] = useState<{conceptId: string, amount: number}[]>([]);
  
  // ========= STORE DATA ACCESS =========
  // Extract primitive counts for stable rendering
  const nodeCount = usePrimitiveStoreValue(
    useKnowledgeStore,
    (state: KnowledgeState) => state.nodes.length,
    0
  );
  
  const connectionCount = usePrimitiveStoreValue(
    useKnowledgeStore,
    (state: KnowledgeState) => state.connections.length,
    0
  );
  
  const totalMastery = usePrimitiveStoreValue(
    useKnowledgeStore,
    (state: KnowledgeState) => state.totalMastery,
    0
  );
  
  // Extract full objects using a safe pattern
  const { 
    nodes,
    connections,
    domainMastery,
    newlyDiscovered,
    journalEntries
  } = useKnowledgeStore(state => ({
    nodes: state.nodes,
    connections: state.connections,
    domainMastery: state.domainMastery,
    newlyDiscovered: state.newlyDiscovered,
    journalEntries: state.journalEntries
  }));
  
  // Directly access needed store functions
  const storeActions = useMemo(() => ({
    createConnection: useKnowledgeStore.getState().createConnection,
    updateMastery: useKnowledgeStore.getState().updateMastery,
    resetNewlyDiscovered: useKnowledgeStore.getState().resetNewlyDiscovered
  }), []);

  // ========= DERIVED DATA =========
  // Filter for discovered nodes and connections
  const discoveredNodes = useMemo(() => 
    nodes.filter(node => node.discovered), 
  [nodes]);
  
  const discoveredConnections = useMemo(() => 
    connections.filter(conn => conn.discovered), 
  [connections]);

  // ========= DIMENSION MANAGEMENT =========
  // Initialize and update dimensions based on container size
  useEffect(() => {
    if (!isComponentMountedRef.current) return;
    
    const updateDimensions = () => {
      if (!containerRef.current?.parentElement) return;
      
      const containerWidth = fullscreen
        ? containerRef.current.parentElement.clientWidth || window.innerWidth
        : width || 800;
        
      const containerHeight = fullscreen
        ? containerRef.current.parentElement.clientHeight || window.innerHeight
        : height || 600;
        
      const padding = 24;
      
      setDimensions({
        width: Math.max(800, containerWidth - padding * 2),
        height: Math.max(600, containerHeight - padding * 2)
      });
      
      debugLog('Dimensions updated', { width: containerWidth, height: containerHeight });
    };
    
    updateDimensions();
    
    if (fullscreen) {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [fullscreen, width, height, debugLog]);

  // ========= LIFECYCLE MANAGEMENT =========
  // Component mount/unmount tracking
  useEffect(() => {
    debugLog('Component mounted');
    isComponentMountedRef.current = true;
    
    return () => {
      debugLog('Component unmounting');
      isComponentMountedRef.current = false;
      
      // Cancel any pending animation frames
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [debugLog]);

  // ========= COORDINATION UPDATES =========
  // Highlight active nodes with particle effects
  useEffect(() => {
    if (!isComponentMountedRef.current || nodes.length === 0) return;

    const nodesToHighlight = [...activeNodes, ...newlyDiscovered];
    if (nodesToHighlight.length === 0) return;
    
    debugLog('Highlighting nodes', nodesToHighlight);

    // Focus on the first highlighted node if none is selected
    if (!selectedNode) {
      const nodeToFocus = nodes.find(n => nodesToHighlight.includes(n.id));
      if (nodeToFocus) {
        debugLog('Auto-selecting highlighted node', nodeToFocus.id);
        setSelectedNode(nodeToFocus);
      }
    }

    // Generate particle effects for highlighted nodes
    const newParticles: ParticleEffect[] = [];
    
    nodesToHighlight.forEach(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.position) {
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 100 + 50;
          const color = DOMAIN_COLORS[node.domain] || DOMAIN_COLORS.general;
          
          newParticles.push({
            id: `particle-${nodeId}-${i}-${Date.now()}`,
            x: node.position.x + Math.cos(angle) * distance,
            y: node.position.y + Math.sin(angle) * distance,
            targetX: node.position.x,
            targetY: node.position.y,
            color: color,
            size: Math.random() * 3 + 1,
            life: 100,
            maxLife: 100
          });
        }
      }
    });

    if (newParticles.length > 0) {
      // Update particle effects and request render
      particleEffectsRef.current = [...particleEffectsRef.current, ...newParticles];
      interactionStateRef.current.renderNeeded = true;
      scheduleRender();
      
      // Dispatch event for externally activated nodes
      if (activeNodes.length > 0) {
        safeDispatch(
          GameEventType.UI_NODE_HIGHLIGHTED, 
          { nodeIds: activeNodes }, 
          'constellation'
        );
      }
    }
  }, [activeNodes, newlyDiscovered, nodes, selectedNode, debugLog]);

  // Track recent insights for Journal Overlay
  useEffect(() => {
    if (!isComponentMountedRef.current) return;
    
    if (journalEntries.length > 0) {
      const recent = journalEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(entry => ({ conceptId: entry.conceptId, amount: entry.masteryGained }));
      
      setRecentInsights(recent);
    } else {
      // Placeholder if no entries
      setRecentInsights([
        { conceptId: 'electron-equilibrium', amount: 15 },
        { conceptId: 'radiation-safety', amount: 30 }
      ]);
    }
  }, [journalEntries]);

  // ========= SCENE COORDINATE CALCULATIONS =========
  // Calculate scene coordinates from screen coordinates
  const getSceneCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left);
    const canvasY = (clientY - rect.top);
    
    // Transform screen coordinates to scene coordinates with zoom and camera
    const sceneX = (canvasX - (canvas.width / 2 + cameraPosition.x)) / zoomLevel + canvas.width / 2;
    const sceneY = (canvasY - (canvas.height / 2 + cameraPosition.y)) / zoomLevel + canvas.height / 2;
    
    return { x: sceneX, y: sceneY };
  }, [canvasRef, cameraPosition, zoomLevel]);

  // Find node at given scene coordinates
  const findNodeAtCoordinates = useCallback((sceneX: number, sceneY: number): ConceptNode | null => {
    if (!discoveredNodes.length) return null;
    
    // Find node under cursor using hit detection
    return discoveredNodes.find(node => {
      if (!node.position) return false;
      
      // Size based on mastery level
      const baseSize = 10 + (node.mastery / 100) * 10;
      
      // Calculate distance to node center
      const distance = Math.sqrt(
        Math.pow(node.position.x - sceneX, 2) +
        Math.pow(node.position.y - sceneY, 2)
      );
      
      // Hit detection with slight padding for easier selection
      return distance <= baseSize + 5;
    }) || null;
  }, [discoveredNodes]);

  // ========= CURSOR MANAGEMENT =========
  // Update cursor style via direct DOM manipulation
  const updateCursor = useCallback((style: 'pointer' | 'grab' | 'grabbing' | 'default') => {
    if (!canvasRef.current || !isComponentMountedRef.current) return;
    canvasRef.current.style.cursor = style;
  }, [canvasRef]);

  // ========= RENDERING & ANIMATION =========
  // Schedule next animation frame for rendering
  const scheduleRender = useCallback(() => {
    if (!isComponentMountedRef.current || animationFrameRef.current !== null) return;
    
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      
      if (!isComponentMountedRef.current) return;
      
      // Update particles
      if (particleEffectsRef.current.length > 0) {
        let particlesActive = false;
        
        // Process particles (using ref to avoid state updates)
        particleEffectsRef.current = particleEffectsRef.current
          .map(p => {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
              particlesActive = true;
              return { 
                ...p, 
                x: p.x + dx * 0.05, 
                y: p.y + dy * 0.05, 
                life: p.life - 1 
              };
            } else {
              return { ...p, life: p.life - 3 }; // Decay faster at target
            }
          })
          .filter(p => p.life > 0);
        
        if (particlesActive) {
          interactionStateRef.current.renderNeeded = true;
        }
      }
      
      // Render if needed
      if (interactionStateRef.current.renderNeeded) {
        renderCanvas();
        interactionStateRef.current.renderNeeded = false;
      }
      
      // Continue animation if needed
      if (particleEffectsRef.current.length > 0) {
        scheduleRender();
      }
    });
  }, []);

  // Render canvas with current state
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !isComponentMountedRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2 + cameraPosition.x, canvas.height / 2 + cameraPosition.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Call drawing utilities
    drawStarryBackground(ctx, canvas.width, canvas.height);
    drawConnections(ctx, discoveredConnections, discoveredNodes, selectedNode, pendingConnection);
    drawNodes(ctx, discoveredNodes, activeNode, selectedNode, pendingConnection, activeNodes, newlyDiscovered, showLabels);
    drawPendingConnection(ctx, discoveredNodes, pendingConnection, activeNode);
    drawParticles(ctx, particleEffectsRef.current);

    // Debug overlay in development
    if (process.env.NODE_ENV !== 'production' && activeNode) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`Hover: ${activeNode.id}`, 10, 20);
    }

    // Restore transformations
    ctx.restore();
  }, [
    canvasRef,
    discoveredNodes, 
    discoveredConnections, 
    activeNode, 
    selectedNode, 
    pendingConnection,
    activeNodes, 
    newlyDiscovered, 
    zoomLevel, 
    cameraPosition, 
    showLabels
  ]);

  // Initial render and dimension changes
  useEffect(() => {
    interactionStateRef.current.renderNeeded = true;
    scheduleRender();
  }, [
    scheduleRender, 
    dimensions.width, 
    dimensions.height
  ]);

  // ========= CONNECTION CREATION =========
  // Create particles for connection visualization
  const createConnectionParticles = useStableCallback((
    sourceNode: ConceptNode, 
    targetNode: ConceptNode
  ) => {
    if (!sourceNode.position || !targetNode.position || !isComponentMountedRef.current) return;
    
    // Calculate midpoint for particle effect
    const midX = (sourceNode.position.x + targetNode.position.x) / 2;
    const midY = (sourceNode.position.y + targetNode.position.y) / 2;
    
    // Create particles for connection effect
    const newParticles: ParticleEffect[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 30;
      const startDistance = 5;
      
      newParticles.push({
        id: `connection-particle-${i}-${Date.now()}`,
        x: midX + Math.cos(angle) * startDistance,
        y: midY + Math.sin(angle) * startDistance,
        targetX: midX + Math.cos(angle) * distance,
        targetY: midY + Math.sin(angle) * distance,
        color: '#FFFFFF',
        size: Math.random() * 3 + 1,
        life: 50,
        maxLife: 50
      });
    }
    
    // Update particles and request render
    particleEffectsRef.current = [...particleEffectsRef.current, ...newParticles];
    interactionStateRef.current.renderNeeded = true;
    scheduleRender();
  });

  // ========= INTERACTION HANDLERS =========
  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    // Handle dragging
    if (state.isDragging) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      
      setCameraPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      state.dragStart = { x: e.clientX, y: e.clientY };
      
      updateCursor('grabbing');
      return;
    }
    
    // Find node under cursor
    const { x: sceneX, y: sceneY } = getSceneCoordinates(e.clientX, e.clientY);
    const hoveredNode = findNodeAtCoordinates(sceneX, sceneY);
    
    // Track if hovering changed, dispatch event only on change
    if (hoveredNode?.id !== state.lastHoveredNodeId) {
      state.lastHoveredNodeId = hoveredNode?.id || null;
      
      // Update hover state if changed
      if (hoveredNode !== activeNode) {
        setActiveNode(hoveredNode);
        
        // Dispatch hover event
        if (hoveredNode) {
          safeDispatch(
            GameEventType.UI_NODE_HOVERED, 
            { nodeId: hoveredNode.id }, 
            'constellation'
          );
        }
      }
    }
    
    // Update cursor via DOM
    updateCursor(hoveredNode ? 'pointer' : 'grab');
  }, [
    canvasRef,
    interactive,
    setCameraPosition,
    getSceneCoordinates,
    findNodeAtCoordinates,
    activeNode,
    setActiveNode,
    updateCursor
  ]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    if (e.button === 0) { // Left click
      if (!activeNode) {
        // Start panning if not over a node
        state.isDragging = true;
        state.dragStart = { x: e.clientX, y: e.clientY };
        updateCursor('grabbing');
      }
      
      // Record click position for later processing in mouseup
      state.clickCoords = { x: e.clientX, y: e.clientY };
      state.lastClickTime = Date.now();
    } else if (e.button === 1 || e.button === 2) { // Middle or right click
      e.preventDefault();
      // Always allow panning with middle/right button
      state.isDragging = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      updateCursor('grabbing');
    }
  }, [
    canvasRef,
    interactive,
    activeNode,
    updateCursor,
  ]);

  // Mouse up handler with built-in click detection
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    const wasDragging = state.isDragging;
    
    // Reset drag state
    state.isDragging = false;
    
    // Only process as click if left button and not dragging significantly
    if (e.button === 0 && !wasDragging) {
      // Calculate distance moved since mousedown
      const dx = e.clientX - state.clickCoords.x;
      const dy = e.clientY - state.clickCoords.y;
      const moveDistance = Math.sqrt(dx * dx + dy * dy);
      
      // If moved less than threshold, count as a click
      if (moveDistance < state.dragThreshold) {
        debugLog('Click detected', { 
          coords: { x: e.clientX, y: e.clientY },
          moveDistance
        });
        
        // Call our click handler with original coordinates
        handleNodeInteraction(e.clientX, e.clientY);
      }
    }
    
    // Update cursor based on current hover state
    updateCursor(activeNode ? 'pointer' : 'grab');
  }, [
    canvasRef,
    interactive,
    activeNode,
    updateCursor,
  ]);

  // Primary node interaction handler (separated for reuse)
  const handleNodeInteraction = useStableCallback((clientX: number, clientY: number) => {
    if (!interactive || !isComponentMountedRef.current) return;
    
    // Get scene coordinates for hit testing
    const { x: sceneX, y: sceneY } = getSceneCoordinates(clientX, clientY);
    const clickedNode = findNodeAtCoordinates(sceneX, sceneY);
    
    // Log the interaction attempt
    debugLog('Node interaction', { 
      sceneCoords: { x: sceneX, y: sceneY },
      clickedNode: clickedNode?.id || 'none',
      pendingConnection,
      selectedNode: selectedNode?.id || 'none'
    });
    
    // Skip if no node clicked
    if (!clickedNode) {
      // Clear selection if clicking empty space
      if (selectedNode) {
        setSelectedNode(null);
        safeDispatch(
          GameEventType.UI_NODE_SELECTION_CLEARED, 
          {}, 
          'constellation'
        );
      }
      return;
    }
    
    // IMPORTANT: Dispatch click event regardless of further logic
    safeDispatch(
      GameEventType.UI_NODE_CLICKED, 
      { nodeId: clickedNode.id }, 
      'constellation'
    );
    
    // Handle pending connection logic
    if (pendingConnection) {
      if (pendingConnection !== clickedNode.id) {
        const sourceNode = discoveredNodes.find(n => n.id === pendingConnection);
        if (!sourceNode) return;
        
        // Check if connection already exists
        const existingConnection = discoveredConnections.find(
          conn => (conn.source === pendingConnection && conn.target === clickedNode.id) ||
                 (conn.source === clickedNode.id && conn.target === pendingConnection)
        );
        
        if (!existingConnection) {
          // Create connection using store actions
          storeActions.createConnection(pendingConnection, clickedNode.id);
          
          // Update mastery for both nodes
          storeActions.updateMastery(
            pendingConnection, 
            Math.min(5, 100 - (sourceNode.mastery || 0))
          );
          storeActions.updateMastery(
            clickedNode.id, 
            Math.min(5, 100 - (clickedNode.mastery || 0))
          );
          
          // Create particle effect
          createConnectionParticles(sourceNode, clickedNode);
          
          // Dispatch connection created event
          safeDispatch(
            GameEventType.KNOWLEDGE_CONNECTION_CREATED, 
            { 
              source: pendingConnection, 
              target: clickedNode.id 
            }, 
            'constellation'
          );
        }
        
        // Clear pending connection
        setPendingConnection(null);
      } else {
        // Cancel if clicking the same node
        setPendingConnection(null);
      }
    } else {
      // Handle node selection
      if (selectedNode?.id === clickedNode.id) {
        // Start connection if clicking already selected node
        setPendingConnection(clickedNode.id);
        
        // Dispatch pending connection event
        safeDispatch(
          GameEventType.UI_CONNECTION_STARTED, 
          { nodeId: clickedNode.id }, 
          'constellation'
        );
      } else {
        // Select the node
        setSelectedNode(clickedNode);
        
        // Dispatch selection event
        safeDispatch(
          GameEventType.UI_NODE_SELECTED, 
          { nodeId: clickedNode.id }, 
          'constellation'
        );
      }
    }
  });

  // Direct click handler (as fallback)
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // This is a redundant handler that serves as a fallback
    // Most clicks are already handled in mouseUp for better drag detection
    // Prevent double handling by checking time since last mouseup
    const state = interactionStateRef.current;
    const timeSinceLastClick = Date.now() - state.lastClickTime;
    
    // If it's been more than 50ms since our mouseup handler,
    // this may be a synthetic event or delayed click, so process it
    if (timeSinceLastClick > 50) {
      handleNodeInteraction(e.clientX, e.clientY);
    }
  }, [handleNodeInteraction]);

  // Wheel handler for zooming
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive || !isComponentMountedRef.current) return;
    
    e.preventDefault();
    
    // Calculate zoom change
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    // Update zoom within bounds
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
    
    // Request render update
    interactionStateRef.current.renderNeeded = true;
    scheduleRender();
  }, [
    interactive,
    setZoomLevel,
    scheduleRender
  ]);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    if (!isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    // Reset interaction states
    state.isDragging = false;
    state.lastHoveredNodeId = null;
    
    // Clear active node
    if (activeNode) {
      setActiveNode(null);
    }
  }, [activeNode, setActiveNode]);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    if (!isComponentMountedRef.current || !onClose) return;
    
    // Clean up state
    setSelectedNode(null);
    setActiveNode(null);
    setPendingConnection(null);
    
    // Reset highlights
    storeActions.resetNewlyDiscovered(); 
    
    // Call provided onClose
    onClose();
  }, [onClose, storeActions]);

  // ========= COMPONENT RENDER =========
  return (
    <div
      ref={containerRef}
      className="relative bg-black pixel-borders"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      data-component="constellation-view"
      data-interactive={interactive.toString()}
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        // Attach interaction handlers
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        data-element="constellation-canvas"
      />

      {/* UI Sub-components */}
      <ConstellationInfoPanel
        discoveredNodes={discoveredNodes}
        totalNodes={nodeCount}
        discoveredConnections={discoveredConnections}
        totalMastery={totalMastery}
      />

      <ConstellationLegend domainMastery={domainMastery} />

      <ConstellationControls
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        setCameraPosition={setCameraPosition}
      />

      <ConstellationActions
        enableJournal={enableJournal}
        setJournalVisible={setJournalVisible}
        setShowHelp={setShowHelp}
        onClose={handleClose}
      />

      {selectedNode && (
        <SelectedNodePanel
          selectedNode={selectedNode}
          discoveredNodes={discoveredNodes}
          pendingConnection={pendingConnection}
          setPendingConnection={setPendingConnection}
        />
      )}

      {interactive && selectedNode && (
         <ConnectionSuggestionsPanel
           selectedNode={selectedNode}
           discoveredNodes={discoveredNodes}
           discoveredConnections={discoveredConnections}
           setPendingConnection={setPendingConnection}
         />
       )}

      {/* Render Overlays */}
      <JournalOverlay
        journalVisible={journalVisible}
        setJournalVisible={setJournalVisible}
        discoveredNodes={discoveredNodes}
        recentInsights={recentInsights}
      />

      <HelpOverlay
        showHelp={showHelp}
        setShowHelp={setShowHelp}
      />

      {/* Development debug overlay */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs p-1 rounded">
          Nodes: {discoveredNodes.length}/{nodeCount} | 
          Active: {activeNode?.id || 'none'} | 
          Selected: {selectedNode?.id || 'none'} |
          Pending: {pendingConnection || 'none'}
        </div>
      )}
    </div>
  );
}