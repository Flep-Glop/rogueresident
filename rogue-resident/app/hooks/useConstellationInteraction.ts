// app/hooks/useConstellationInteraction.ts
import React, { useState, useCallback, useRef, RefObject } from 'react';
import { ConceptNode, ConceptConnection, useKnowledgeStore } from '../store/knowledgeStore';

// Assuming the same ParticleEffect type from the previous step
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
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  cameraPosition: { x: number; y: number };
  setCameraPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  activeNode: ConceptNode | null;
  setActiveNode: React.Dispatch<React.SetStateAction<ConceptNode | null>>;
  selectedNode: ConceptNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<ConceptNode | null>>;
  pendingConnection: string | null;
  setPendingConnection: React.Dispatch<React.SetStateAction<string | null>>;
  setParticleEffects: React.Dispatch<React.SetStateAction<ParticleEffect[]>>;
  isComponentMountedRef: RefObject<boolean>; // Pass the mount status ref
}

interface InteractionHandlers {
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
}

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

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false); // Tracks if a connection attempt might start on click

  // Zustand actions - Get them directly inside handlers where needed or via props if preferred
  // Example: const createConnection = useKnowledgeStore(state => state.createConnection);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setCameraPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvasX = (e.clientX - rect.left);
    const canvasY = (e.clientY - rect.top);
    const sceneX = (canvasX - (canvas.width / 2 + cameraPosition.x)) / zoomLevel + canvas.width / 2;
    const sceneY = (canvasY - (canvas.height / 2 + cameraPosition.y)) / zoomLevel + canvas.height / 2;

    const hoveredNode = discoveredNodes.find(node => {
      if (!node.position) return false;
      const baseSize = 10 + (node.mastery / 100) * 10;
      const distance = Math.sqrt(
        Math.pow(node.position.x - sceneX, 2) +
        Math.pow(node.position.y - sceneY, 2)
      );
      return distance <= baseSize + 5;
    });

    setActiveNode(hoveredNode || null);

    if (hoveredNode) {
      canvas.style.cursor = 'pointer';
    } else if (isDragging) {
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = 'grab';
    }
  }, [
    canvasRef, interactive, isDragging, dragStart, cameraPosition, zoomLevel,
    discoveredNodes, setActiveNode, setCameraPosition, isComponentMountedRef
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMountedRef.current) return;

    const isOverNode = activeNode != null;

    if (e.button === 0) { // Left click
      if (!isOverNode) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      } else {
        // Potential start of connection or selection on click up
        setIsConnecting(true);
      }
    } else if (e.button === 1 || e.button === 2) { // Middle or Right click for panning
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
  }, [interactive, activeNode, canvasRef, isComponentMountedRef]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isComponentMountedRef.current) return;

    setIsDragging(false);
    setIsConnecting(false); // Reset connecting flag

    if (canvasRef.current) {
      canvasRef.current.style.cursor = activeNode ? 'pointer' : 'grab';
    }
  }, [activeNode, canvasRef, isComponentMountedRef]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent click actions if dragging occurred between mousedown and mouseup
    if (!canvasRef.current || !interactive || isDragging || !isConnecting || !isComponentMountedRef.current) {
      // If dragging, reset connecting flag just in case mouseup didn't catch it
       if(isDragging) setIsConnecting(false);
       return;
    }

     // Ensure activeNode is up-to-date (it might have changed slightly during the click motion)
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left);
    const canvasY = (e.clientY - rect.top);
    const sceneX = (canvasX - (canvas.width / 2 + cameraPosition.x)) / zoomLevel + canvas.width / 2;
    const sceneY = (canvasY - (canvas.height / 2 + cameraPosition.y)) / zoomLevel + canvas.height / 2;

    const clickedNode = discoveredNodes.find(node => {
        if (!node.position) return false;
        const baseSize = 10 + (node.mastery / 100) * 10;
        const distance = Math.sqrt(
            Math.pow(node.position.x - sceneX, 2) +
            Math.pow(node.position.y - sceneY, 2)
        );
        return distance <= baseSize + 5;
    });

    // If click wasn't actually on a node, do nothing
    if (!clickedNode) {
       setIsConnecting(false); // Reset flag
       return;
    }


    // Use Zustand actions directly
    const createConnection = useKnowledgeStore.getState().createConnection;
    const updateMastery = useKnowledgeStore.getState().updateMastery;

    if (pendingConnection) {
      if (pendingConnection !== clickedNode.id) {
        const sourceNode = discoveredNodes.find(n => n.id === pendingConnection);
        if (sourceNode) {
          const existingConnection = discoveredConnections.find(
            conn => (conn.source === pendingConnection && conn.target === clickedNode.id) ||
                   (conn.source === clickedNode.id && conn.target === pendingConnection)
          );

          if (!existingConnection) {
            console.log('Would play connection success sound');
            createConnection(pendingConnection, clickedNode.id);
            const insightGain = Math.floor((sourceNode.mastery + clickedNode.mastery) / 10) + 5; // Example insight gain
            updateMastery(pendingConnection, Math.min(5, 100 - sourceNode.mastery));
            updateMastery(clickedNode.id, Math.min(5, 100 - clickedNode.mastery));

            const midX = ((sourceNode.position?.x || 0) + (clickedNode.position?.x || 0)) / 2;
            const midY = ((sourceNode.position?.y || 0) + (clickedNode.position?.y || 0)) / 2;
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
            setParticleEffects(prev => [...prev, ...newParticles]);
          }
        }
        setPendingConnection(null);
      } else {
        setPendingConnection(null); // Cancel if clicking the same node
      }
    } else {
      if (selectedNode?.id === clickedNode.id) {
        setPendingConnection(clickedNode.id);
        console.log('Would play click sound');
      } else {
        setSelectedNode(clickedNode);
        console.log('Would play click sound');
      }
    }
    setIsConnecting(false); // Reset flag after handling click
  }, [
    interactive, isDragging, isConnecting, activeNode, pendingConnection, selectedNode, discoveredNodes,
    discoveredConnections, setPendingConnection, setSelectedNode, setParticleEffects, canvasRef,
    cameraPosition, zoomLevel, isComponentMountedRef
  ]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive || !isComponentMountedRef.current) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, [interactive, setZoomLevel, isComponentMountedRef]);

  const handleMouseLeave = useCallback(() => {
      if (!isComponentMountedRef.current) return;
      // If mouse leaves canvas while dragging, stop the drag
      if (isDragging) {
          setIsDragging(false);
      }
       if (isConnecting) {
           setIsConnecting(false);
       }
      // Optionally clear active node on leave
      // setActiveNode(null);
  }, [isDragging, isConnecting, isComponentMountedRef]);


  return {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleClick,
    handleWheel,
    handleMouseLeave,
  };
}