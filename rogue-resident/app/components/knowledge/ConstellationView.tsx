// app/components/knowledge/ConstellationView.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePrimitiveStoreValue, useStableStoreValue, createStableSelector } from '../../core/utils/storeHooks';
import { useKnowledgeStore, ConceptNode, ConceptConnection, KNOWLEDGE_DOMAINS, KnowledgeDomain } from '../../store/knowledgeStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_LIGHT } from '../../core/themeConstants';

// Import Drawing Utilities
import {
  drawStarryBackground,
  drawConnections,
  drawNodes,
  drawPendingConnection,
  drawParticles
} from './constellationCanvasUtils';

// Import Interaction Hook
import { useConstellationInteraction } from '../../hooks/useConstellationInteraction';

// Import UI Sub-components
import ConstellationInfoPanel from './ui/ConstellationInfoPanel';
import ConstellationLegend from './ui/ConstellationLegend';
import ConstellationControls from './ui/ConstellationControls';
import ConstellationActions from './ui/ConstellationActions';
import SelectedNodePanel from './ui/SelectedNodePanel';
import ConnectionSuggestionsPanel from './ui/ConnectionSuggestionsPanel';
import JournalOverlay from './ui/JournalOverlay';
import HelpOverlay from './ui/HelpOverlay';

// Re-export KNOWLEDGE_DOMAINS for consistency if needed elsewhere
export { KNOWLEDGE_DOMAINS };

// Helper type for particle effects (ensure consistency with utils)
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
  activeNodes?: string[]; // IDs of nodes to highlight (newly discovered/updated)
  fullscreen?: boolean; // Control fullscreen mode
  enableJournal?: boolean;
}

/**
 * ConstellationView - Refactored with Chamber Pattern Implementation
 * 
 * Improvements:
 * - Primitive value extraction to avoid render loops
 * - Stable references for callbacks
 * - Batched rendering
 * - DOM-based animations
 * - Canvas-based visualization
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
  // CORE REFS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isComponentMountedRef = useRef(true);
  const particleEffectsRef = useRef<ParticleEffect[]>([]);
  const animationActiveRef = useRef(false);
  const renderNeededRef = useRef(false);

  // PATTERN: Safe, primitive state extraction from store
  const storeSelector = useMemo(() => createStableSelector([
    'nodes', 'connections', 'totalMastery', 'domainMastery', 
    'newlyDiscovered', 'journalEntries'
  ]), []);
  
  const {
    nodes,
    connections,
    totalMastery,
    domainMastery,
    newlyDiscovered,
    journalEntries
  } = useKnowledgeStore(storeSelector);
  
  // Store function access with stable references
  const resetNewlyDiscovered = useStableStoreValue(
    useKnowledgeStore, 
    state => state.resetNewlyDiscovered
  );

  // LOCAL STATE - Kept for UI interactions not affecting rendering cycles
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [recentInsights, setRecentInsights] = useState<{conceptId: string, amount: number}[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // PATTERN: Memoize discovered data to ensure stable references
  const discoveredNodes = useMemo(() => 
    nodes.filter(node => node.discovered), 
  [nodes]);
  
  const discoveredConnections = useMemo(() => 
    connections.filter(conn => conn.discovered), 
  [connections]);

  // PATTERN: Use Interaction Hook with memoized data
  const interactionHandlers = useConstellationInteraction({
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
    setParticleEffects: (particles) => {
      // Update ref instead of state
      particleEffectsRef.current = particles;
      renderNeededRef.current = true;
      scheduleNextFrame();
    },
    isComponentMountedRef,
  });

  // Initialize dimensions
  useEffect(() => {
    if (fullscreen) {
      const updateDimensions = () => {
        if (!containerRef.current?.parentElement) return;
        
        const containerWidth = containerRef.current.parentElement.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current.parentElement.clientHeight || window.innerHeight;
        const padding = 24;
        
        setDimensions({
          width: Math.max(800, containerWidth - padding * 2),
          height: Math.max(600, containerHeight - padding * 2)
        });
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    } else if (width && height) {
      setDimensions({ width, height });
    }
  }, [fullscreen, width, height]);

  // Track component mount status
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    return () => {
      isComponentMountedRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // PATTERN: Focus on active nodes with DOM-based effects
  useEffect(() => {
    if (!isComponentMountedRef.current || nodes.length === 0) return;

    const nodesToHighlight = [...activeNodes, ...newlyDiscovered];
    if (nodesToHighlight.length === 0) return;

    // Focus on the first highlighted node if none is selected
    if (!selectedNode) {
      const nodeToFocus = nodes.find(n => nodesToHighlight.includes(n.id));
      if (nodeToFocus) setSelectedNode(nodeToFocus);
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
      // Update particle effects ref directly
      particleEffectsRef.current = [...particleEffectsRef.current, ...newParticles];
      renderNeededRef.current = true;
      scheduleNextFrame();
      
      // Play success sound for externally activated nodes
      if (activeNodes.length > 0) {
        console.log('Would play success sound');
      }
    }
  }, [activeNodes, newlyDiscovered, nodes, selectedNode]);

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

  // PATTERN: Animation frame scheduler
  const scheduleNextFrame = useCallback(() => {
    if (animationActiveRef.current || !isComponentMountedRef.current) return;
    
    animationActiveRef.current = true;
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!isComponentMountedRef.current) {
        animationActiveRef.current = false;
        return;
      }
      
      // Update particles
      if (particleEffectsRef.current.length > 0) {
        let animating = false;
        
        // Process particles (using refs instead of state)
        particleEffectsRef.current = particleEffectsRef.current.map(p => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            animating = true;
            return { ...p, x: p.x + dx * 0.05, y: p.y + dy * 0.05, life: p.life - 1 };
          } else {
            return { ...p, life: p.life - 3 }; // Decay faster at target
          }
        }).filter(p => p.life > 0);
        
        // Trigger re-render
        renderNeededRef.current = true;
      }
      
      // Render if needed
      if (renderNeededRef.current) {
        renderCanvas();
        renderNeededRef.current = false;
      }
      
      animationActiveRef.current = false;
      
      // Continue animation if needed
      if (particleEffectsRef.current.length > 0) {
        scheduleNextFrame();
      }
    });
  }, []);

  // PATTERN: Canvas rendering function (extracted from effect)
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

    // Restore transformations
    ctx.restore();
  }, [
    discoveredNodes, 
    discoveredConnections, 
    activeNode, 
    selectedNode, 
    pendingConnection,
    activeNodes, 
    newlyDiscovered, 
    zoomLevel, 
    cameraPosition, 
    dimensions, 
    showLabels
  ]);

  // Initial render and dimension changes
  useEffect(() => {
    renderNeededRef.current = true;
    scheduleNextFrame();
  }, [
    renderCanvas, 
    scheduleNextFrame, 
    dimensions.width, 
    dimensions.height
  ]);

  // Handle closing the view
  const handleClose = useCallback(() => {
    if (!isComponentMountedRef.current || !onClose) return;
    
    setSelectedNode(null);
    setActiveNode(null);
    setPendingConnection(null);
    resetNewlyDiscovered(); // Reset highlights on close
    onClose();
  }, [onClose, resetNewlyDiscovered]);

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
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        // Attach interaction handlers from the hook
        onMouseMove={interactionHandlers.handleMouseMove}
        onClick={interactionHandlers.handleClick}
        onMouseDown={interactionHandlers.handleMouseDown}
        onMouseUp={interactionHandlers.handleMouseUp}
        onMouseLeave={interactionHandlers.handleMouseLeave}
        onWheel={interactionHandlers.handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Render UI Sub-components */}
      <ConstellationInfoPanel
        discoveredNodes={discoveredNodes}
        totalNodes={nodes.length}
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
        onClose={handleClose} // Use the wrapped handleClose
      />

      <SelectedNodePanel
        selectedNode={selectedNode}
        discoveredNodes={discoveredNodes}
        pendingConnection={pendingConnection}
        setPendingConnection={setPendingConnection}
      />

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
    </div>
  );
}