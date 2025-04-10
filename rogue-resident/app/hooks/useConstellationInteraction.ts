// app/hooks/useConstellationInteraction.ts
import { useCallback, useRef, RefObject } from 'react';
import { ConceptNode, ConceptConnection, useKnowledgeStore } from '../store/knowledgeStore';
import { useStableCallback } from '../core/utils/storeHooks';

// Type for particle effects
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
  velocity?: { x: number, y: number };
};

interface UseConstellationInteractionProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  interactive: boolean;
  discoveredNodes: ConceptNode[];
  discoveredConnections: ConceptConnection[];
  zoomLevel: number;
  setZoomLevel: (value: number | ((prev: number) => number)) => void;
  cameraPosition: { x: number; y: number };
  setCameraPosition: (value: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  activeNode: ConceptNode | null;
  setActiveNode: (value: ConceptNode | null) => void;
  selectedNode: ConceptNode | null;
  setSelectedNode: (value: ConceptNode | null) => void;
  pendingConnection: string | null;
  setPendingConnection: (value: string | null) => void;
  setParticleEffects: (value: ParticleEffect[] | ((prev: ParticleEffect[]) => ParticleEffect[])) => void;
  isComponentMountedRef: RefObject<boolean>;
}

interface InteractionHandlers {
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
}

/**
 * Constellation interaction hook using the Chamber Transition Pattern
 * 
 * This hook follows key architectural principles from Hades' interaction systems:
 * 1. Uses refs for interaction state instead of React state
 * 2. Accesses store functions directly only when needed 
 * 3. Maintains stable function references with minimal dependencies
 * 4. Uses DOM-based cursor updates
 */
export function useConstellationInteraction({
  canvasRef,
  interactive,
  discoveredNodes,
  discoveredConnections,
  zoomLevel,
  setZoomLevel,
  cameraPosition,
  setCameraPosition,
  activeNode,
  setActiveNode,
  selectedNode,
  setSelectedNode,
  pendingConnection,
  setPendingConnection,
  setParticleEffects,
  isComponentMountedRef,
}: UseConstellationInteractionProps): InteractionHandlers {

  // PATTERN: Use refs for interaction state instead of useState
  const interactionStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    isConnecting: false, // Track if a connection might be forming
    lastMousePosition: { x: 0, y: 0 }
  });

  // PATTERN: Stable store access - get functions once and cache in a ref
  const storeActionsRef = useRef({
    createConnection: useKnowledgeStore.getState().createConnection,
    updateMastery: useKnowledgeStore.getState().updateMastery
  });
  
  // PATTERN: Scene coordinate calculation function with minimal dependencies
  const getSceneCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left);
    const canvasY = (clientY - rect.top);
    
    const sceneX = (canvasX - (canvas.width / 2 + cameraPosition.x)) / zoomLevel + canvas.width / 2;
    const sceneY = (canvasY - (canvas.height / 2 + cameraPosition.y)) / zoomLevel + canvas.height / 2;
    
    return { x: sceneX, y: sceneY };
  }, [canvasRef, cameraPosition, zoomLevel]);

  // PATTERN: Node hit detection function with minimal dependencies
  const findNodeAtCoordinates = useCallback((sceneX: number, sceneY: number) => {
    return discoveredNodes.find(node => {
      if (!node.position) return false;
      
      const baseSize = 10 + (node.mastery / 100) * 10;
      const distance = Math.sqrt(
        Math.pow(node.position.x - sceneX, 2) +
        Math.pow(node.position.y - sceneY, 2)
      );
      
      return distance <= baseSize + 5;
    });
  }, [discoveredNodes]);

  // PATTERN: Update cursor style directly via DOM
  const updateCursor = useCallback((style: 'pointer' | 'grab' | 'grabbing' | 'default') => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = style;
    }
  }, [canvasRef]);

  // PATTERN: Mouse movement handler with minimal dependencies
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
    state.lastMousePosition = { x: sceneX, y: sceneY };
    
    const hoveredNode = findNodeAtCoordinates(sceneX, sceneY);
    
    // Update hover state if changed
    if (hoveredNode !== activeNode) {
      setActiveNode(hoveredNode);
    }
    
    // Update cursor via DOM
    updateCursor(hoveredNode ? 'pointer' : 'grab');
  }, [
    canvasRef,
    interactive,
    setCameraPosition,
    getSceneCoordinates,
    findNodeAtCoordinates,
    setActiveNode,
    updateCursor,
    activeNode,
    isComponentMountedRef
  ]);

  // PATTERN: Mouse down handler with minimal dependencies
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    if (e.button === 0) { // Left click
      if (!activeNode) {
        // Start panning if not over a node
        state.isDragging = true;
        state.dragStart = { x: e.clientX, y: e.clientY };
        updateCursor('grabbing');
      } else {
        // Mark potential connection start
        state.isConnecting = true;
      }
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
    isComponentMountedRef
  ]);

  // PATTERN: Mouse up handler with minimal dependencies
  const handleMouseUp = useCallback(() => {
    if (!isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    // Reset drag state
    state.isDragging = false;
    
    // Update cursor based on current hover state
    updateCursor(activeNode ? 'pointer' : 'grab');
  }, [
    activeNode,
    updateCursor,
    isComponentMountedRef
  ]);

  // PATTERN: Creation of particle effects
  const createConnectionParticles = useStableCallback((
    sourceNode: ConceptNode, 
    targetNode: ConceptNode
  ) => {
    if (!sourceNode.position || !targetNode.position) return;
    
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
    
    // Update particles with a callback to avoid stale state
    setParticleEffects(prev => [...prev, ...newParticles]);
  });

  // PATTERN: Click handler with minimized dependencies
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    // Skip if we were dragging or not connecting
    if (state.isDragging || !state.isConnecting) {
      state.isConnecting = false; // Reset flag
      return;
    }
    
    // Reset connecting flag
    state.isConnecting = false;
    
    // Find the clicked node
    const { x: sceneX, y: sceneY } = getSceneCoordinates(e.clientX, e.clientY);
    const clickedNode = findNodeAtCoordinates(sceneX, sceneY);
    
    // Skip if no node clicked
    if (!clickedNode) return;
    
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
          storeActionsRef.current.createConnection(pendingConnection, clickedNode.id);
          
          // Update mastery for both nodes
          storeActionsRef.current.updateMastery(
            pendingConnection, 
            Math.min(5, 100 - sourceNode.mastery)
          );
          storeActionsRef.current.updateMastery(
            clickedNode.id, 
            Math.min(5, 100 - clickedNode.mastery)
          );
          
          // Create particle effect
          createConnectionParticles(sourceNode, clickedNode);
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
      } else {
        // Select the node
        setSelectedNode(clickedNode);
      }
    }
  }, [
    canvasRef,
    interactive,
    getSceneCoordinates,
    findNodeAtCoordinates,
    pendingConnection,
    discoveredNodes,
    discoveredConnections,
    setPendingConnection,
    selectedNode,
    setSelectedNode,
    createConnectionParticles,
    isComponentMountedRef
  ]);

  // PATTERN: Wheel handler with minimal dependencies
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive || !isComponentMountedRef.current) return;
    
    e.preventDefault();
    
    // Calculate zoom change
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    // Update zoom within bounds
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, [
    interactive,
    setZoomLevel,
    isComponentMountedRef
  ]);

  // PATTERN: Mouse leave handler with minimal dependencies
  const handleMouseLeave = useCallback(() => {
    if (!isComponentMountedRef.current) return;
    
    const state = interactionStateRef.current;
    
    // Reset interaction states
    state.isDragging = false;
    state.isConnecting = false;
  }, [isComponentMountedRef]);

  // Return handlers with stable references
  return {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleClick,
    handleWheel,
    handleMouseLeave
  };
}