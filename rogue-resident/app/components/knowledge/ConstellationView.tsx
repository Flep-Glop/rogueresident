// app/components/knowledge/ConstellationView.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useKnowledgeStore, ConceptNode, ConceptConnection, KNOWLEDGE_DOMAINS, KnowledgeDomain } from '../../store/knowledgeStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_LIGHT } from '../../core/themeConstants'; // Import theme constants

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
 * ConstellationView - Refactored interactive knowledge visualization system.
 * Uses extracted utilities, hooks, and sub-components for better organization.
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
  const isComponentMountedRef = useRef(true); // Use ref for mount status

  // STORE ACCESS
  const nodes = useKnowledgeStore(useCallback(state => state.nodes, []));
  const connections = useKnowledgeStore(useCallback(state => state.connections, []));
  const totalMastery = useKnowledgeStore(useCallback(state => state.totalMastery, []));
  const domainMastery = useKnowledgeStore(useCallback(state => state.domainMastery, []));
  const newlyDiscovered = useKnowledgeStore(useCallback(state => state.newlyDiscovered, []));
  const journalEntries = useKnowledgeStore(useCallback(state => state.journalEntries, []));
  const resetNewlyDiscovered = useKnowledgeStore(useCallback(state => state.resetNewlyDiscovered, []));

  // STATE MANAGEMENT
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [recentInsights, setRecentInsights] = useState<{conceptId: string, amount: number}[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [particleEffects, setParticleEffects] = useState<ParticleEffect[]>([]);

  // Use Interaction Hook
  const interactionHandlers = useConstellationInteraction({
    canvasRef,
    interactive,
    discoveredNodes: useMemo(() => nodes.filter(node => node.discovered), [nodes]), // Pass memoized nodes
    discoveredConnections: useMemo(() => connections.filter(conn => conn.discovered), [connections]), // Pass memoized connections
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
  });

  // Initialize dimensions
  useEffect(() => {
    if (fullscreen) {
      const updateDimensions = () => {
        const containerWidth = containerRef.current?.parentElement?.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current?.parentElement?.clientHeight || window.innerHeight;
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

  // Memoize discovered data
  const discoveredNodes = useMemo(() => nodes.filter(node => node.discovered), [nodes]);
  const discoveredConnections = useMemo(() => connections.filter(conn => conn.discovered), [connections]);

  // Track component mount status
  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Focus on active/newly discovered nodes and create particle effects
  useEffect(() => {
    if (!isComponentMountedRef.current || nodes.length === 0) return;

    const nodesToHighlight = [...activeNodes, ...newlyDiscovered];
    if (nodesToHighlight.length === 0) return;

    // Focus on the first highlighted node if none is selected
    if (!selectedNode) {
         const nodeToFocus = nodes.find(n => nodesToHighlight.includes(n.id));
         if (nodeToFocus) setSelectedNode(nodeToFocus);
    }


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
      setParticleEffects(prev => [...prev, ...newParticles]);
       if (activeNodes.length > 0) { // Only play sound for externally activated nodes
           console.log('Would play success sound');
       }
    }
  }, [activeNodes, newlyDiscovered, nodes, selectedNode]); // Add selectedNode dependency


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

  // Particle Animation Loop
  useEffect(() => {
    if (!isComponentMountedRef.current || particleEffects.length === 0) return;

    let active = true;
    const animate = () => {
      if (!active || !isComponentMountedRef.current) return;
      let animating = false;
      setParticleEffects(prev => {
        if (!active) return prev;
        const updated = prev.map(p => {
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
        return updated;
      });
      if (animating && active && isComponentMountedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleEffects.length]); // Re-run only if particle count changes

  // Main Canvas Drawing Loop
  useEffect(() => {
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
    drawParticles(ctx, particleEffects);

    // Restore transformations
    ctx.restore();

  }, [
    discoveredNodes, discoveredConnections, activeNode, selectedNode, pendingConnection,
    activeNodes, newlyDiscovered, particleEffects, zoomLevel, cameraPosition, dimensions, showLabels // Add dimensions and showLabels
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
