// app/components/knowledge/ConstellationView.tsx
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import ConnectionSuggestions from './ConnectionSuggestions';

// Knowledge domains with direct color values for canvas rendering
export const KNOWLEDGE_DOMAINS = {
  'clinical': {
    name: 'Clinical Practice',
    color: '#4e83bd', // Direct hex value
    lightColor: '#63a0db',
    darkColor: '#3a6590',
    bgClass: 'bg-clinical',
    textClass: 'text-clinical-light',
    icon: '🏥'
  },
  'technical': {
    name: 'Equipment & QA',
    color: '#5a6978',
    lightColor: '#6d7c8a',
    darkColor: '#464e59',
    bgClass: 'bg-qa',
    textClass: 'text-qa-light',
    icon: '🔧'
  },
  'theoretical': {
    name: 'Physics Theory',
    color: '#2c9287',
    lightColor: '#3db3a6',
    darkColor: '#1f6e66',
    bgClass: 'bg-educational',
    textClass: 'text-educational-light',
    icon: '🔬'
  },
  'general': {
    name: 'General Knowledge',
    color: '#c8d2e0',
    lightColor: '#e0e5ec',
    darkColor: '#8892a3',
    bgClass: 'bg-surface',
    textClass: 'text-text-primary',
    icon: '📚'
  }
};

// Concept node interface
export interface ConceptNode {
  id: string;
  name: string;
  domain: keyof typeof KNOWLEDGE_DOMAINS;
  description: string;
  mastery: number; // 0-100% mastery level
  connections: string[]; // IDs of connected concepts
  discovered: boolean;
  position?: { x: number; y: number }; // For visual layout
}

// Connection interface
export interface ConceptConnection {
  source: string;
  target: string;
  strength: number; // 0-100%
  discovered: boolean;
}

interface ConstellationViewProps {
  onClose?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;
  enableJournal?: boolean;
  activeNodes?: string[]; // IDs of nodes to highlight (newly discovered/updated)
}

/**
 * ConstellationView - The interactive knowledge visualization system
 * 
 * Core to the game's progression, this component visualizes player knowledge as a
 * constellation of stars, with connections representing relationships between concepts.
 * 
 * The visual language borrows from star charts and neural networks, emphasizing the
 * organic growth of knowledge and insight through pattern recognition.
 */
export default function ConstellationView({ 
  onClose, 
  width = 800, 
  height = 600, 
  interactive = true,
  enableJournal = true,
  activeNodes = []
}: ConstellationViewProps) {
  // CORE REFS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // HOOKS AND STORE ACCESS
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  const { 
    nodes, 
    connections,
    totalMastery,
    domainMastery,
    createConnection,
    updateMastery,
    newlyDiscovered,
    resetNewlyDiscovered,
    journalEntries
  } = useKnowledgeStore();
  
  // STATE MANAGEMENT
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [recentInsights, setRecentInsights] = useState<{conceptId: string, amount: number}[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // VISUAL EFFECTS STATE
  const [particleEffects, setParticleEffects] = useState<Array<{
    id: string,
    x: number,
    y: number, 
    targetX: number,
    targetY: number,
    color: string,
    size: number,
    life: number,
    maxLife: number,
    opacity?: number,
    velocity?: { x: number, y: number }
  }>>([]);
  
  // FILTER AND MEMOIZE DATA
  // Get discovered nodes for rendering
  const discoveredNodes = useMemo(() => 
    nodes.filter(node => node.discovered), 
    [nodes]
  );
  
  // Get discovered connections
  const discoveredConnections = useMemo(() => 
    connections.filter(conn => conn.discovered), 
    [connections]
  );

  // EFFECTS

  // Focus on active nodes passed from parent
  useEffect(() => {
    if (activeNodes.length > 0 && nodes.length > 0) {
      // Find the first active node that exists in our nodes list
      const nodeToFocus = nodes.find(n => activeNodes.includes(n.id));
      if (nodeToFocus) {
        setSelectedNode(nodeToFocus);
        
        // Create particle effects for all active nodes
        const newParticles: typeof particleEffects = [];
        
        activeNodes.forEach(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          if (node?.position) {
            // Create multiple particles for each active node
            for (let i = 0; i < 15; i++) {
              const angle = Math.random() * Math.PI * 2;
              const distance = Math.random() * 100 + 50;
              
              newParticles.push({
                id: `particle-${nodeId}-${i}-${Date.now()}`,
                x: node.position.x + Math.cos(angle) * distance,
                y: node.position.y + Math.sin(angle) * distance,
                targetX: node.position.x,
                targetY: node.position.y,
                color: KNOWLEDGE_DOMAINS[node.domain].color,
                size: Math.random() * 3 + 1,
                life: 100,
                maxLife: 100
              });
            }
          }
        });
        
        setParticleEffects(prev => [...prev, ...newParticles]);
        
        // Play discovery sound effect
        if (playSound) playSound('success');
      }
    }
  }, [activeNodes, nodes, playSound]);
  
  // Also highlight newly discovered nodes from knowledgeStore
  useEffect(() => {
    if (newlyDiscovered.length > 0 && nodes.length > 0) {
      // Create particle effects for newly discovered nodes
      const newParticles: typeof particleEffects = [];
      
      newlyDiscovered.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node?.position) {
          // Create multiple particles for each newly discovered node
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            
            newParticles.push({
              id: `particle-${nodeId}-${i}-${Date.now()}`,
              x: node.position.x + Math.cos(angle) * distance,
              y: node.position.y + Math.sin(angle) * distance,
              targetX: node.position.x,
              targetY: node.position.y,
              color: KNOWLEDGE_DOMAINS[node.domain].color,
              size: Math.random() * 3 + 1,
              life: 100,
              maxLife: 100
            });
          }
        }
      });
      
      setParticleEffects(prev => [...prev, ...newParticles]);
    }
  }, [newlyDiscovered, nodes]);
  
  // Track recent insights for journal
  useEffect(() => {
    // Extract most recent journal entries for display
    if (journalEntries.length > 0) {
      const recentEntries = journalEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(entry => ({
          conceptId: entry.conceptId,
          amount: entry.masteryGained
        }));
        
      setRecentInsights(recentEntries);
    } else {
      // For demonstration, we'll use placeholder data
      setRecentInsights([
        { conceptId: 'ionization-chambers', amount: 15 },
        { conceptId: 'quantum-effects', amount: 30 }
      ]);
    }
  }, [journalEntries]);

  // ANIMATION LOOP
  // Handle particle animations and movement
  useEffect(() => {
    let animating = false;
    
    const animate = () => {
      if (!canvasRef.current) return;
      
      // Update particle positions and properties
      setParticleEffects(prev => {
        const updatedParticles = prev.map(particle => {
          // Move particle toward target
          const dx = particle.targetX - particle.x;
          const dy = particle.targetY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            // Still moving toward target
            animating = true;
            return {
              ...particle,
              x: particle.x + dx * 0.05,
              y: particle.y + dy * 0.05,
              life: particle.life - 1
            };
          } else {
            // At target, handle differently
            if (particle.velocity) {
              // For particles with velocity, continue moving
              return {
                ...particle,
                x: particle.x + particle.velocity.x,
                y: particle.y + particle.velocity.y,
                life: particle.life - 1
              };
            } else {
              // For targeted particles, decay faster once at destination
              return {
                ...particle,
                life: particle.life - 3
              };
            }
          }
        }).filter(p => p.life > 0); // Remove dead particles
        
        if (updatedParticles.length === 0) {
          animating = false;
        }
        
        return updatedParticles;
      });
      
      // Continue animation if particles still exist
      if (animating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Start animation if we have particles
    if (particleEffects.length > 0 && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [particleEffects.length]);

  // RENDERING FUNCTIONS

  // Draw constellation on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom transform
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    
    // Draw deep space background
    drawStarryBackground(ctx, canvas.width, canvas.height);
    
    // Draw connections
    drawConnections(ctx);
    
    // Draw nodes
    drawNodes(ctx);
    
    // Draw connecting line when establishing new connection
    drawPendingConnection(ctx);
    
    // Draw particles
    drawParticles(ctx);
    
    // Restore transform
    ctx.restore();
  }, [
    discoveredNodes, 
    discoveredConnections, 
    activeNode, 
    selectedNode, 
    pendingConnection, 
    activeNodes, 
    newlyDiscovered, 
    particleEffects,
    zoomLevel
  ]);

  // Helper: Draw starry background
  const drawStarryBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fill with deep space color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Create distant stars with various brightness
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 1.2;
      const opacity = Math.random() * 0.3 + 0.1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
    
    // Add a subtle nebula effect in the background
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 150 + 100;
      
      // Random domain color for nebula with very low opacity
      const domainKeys = Object.keys(KNOWLEDGE_DOMAINS);
      const randomDomain = domainKeys[Math.floor(Math.random() * domainKeys.length)] as keyof typeof KNOWLEDGE_DOMAINS;
      const color = KNOWLEDGE_DOMAINS[randomDomain].color;
      
      // Create radial gradient for nebula
      const nebula = ctx.createRadialGradient(
        x, y, 0,
        x, y, radius
      );
      
      nebula.addColorStop(0, `${color}15`); // 15 is hex for ~8% opacity
      nebula.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);
    }
  };
  
  // Helper: Draw all connections
  const drawConnections = (ctx: CanvasRenderingContext2D) => {
    discoveredConnections.forEach(connection => {
      const sourceNode = discoveredNodes.find(n => n.id === connection.source);
      const targetNode = discoveredNodes.find(n => n.id === connection.target);
      
      if (sourceNode && targetNode && sourceNode.position && targetNode.position) {
        const isActive = 
          (selectedNode?.id === sourceNode.id || selectedNode?.id === targetNode.id) ||
          (pendingConnection === sourceNode.id || pendingConnection === targetNode.id);
          
        // Connection strength affects width and opacity
        const opacity = connection.strength / 200 + 0.3; // 0.3 - 0.8 range
        const width = connection.strength / 100 * 2 + 1; // 1 - 3 range
        
        // Get domain colors
        const sourceDomain = KNOWLEDGE_DOMAINS[sourceNode.domain];
        const targetDomain = KNOWLEDGE_DOMAINS[targetNode.domain];
        
        // Create gradient between the two domain colors
        const gradient = ctx.createLinearGradient(
          sourceNode.position.x, sourceNode.position.y,
          targetNode.position.x, targetNode.position.y
        );
        gradient.addColorStop(0, sourceDomain.color);
        gradient.addColorStop(1, targetDomain.color);
        
        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(sourceNode.position.x, sourceNode.position.y);
        ctx.lineTo(targetNode.position.x, targetNode.position.y);
        
        // Style based on active state
        if (isActive) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = width + 1;
          ctx.globalAlpha = opacity + 0.2;
          
          // Add glow for active connections
          ctx.shadowColor = 'white';
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = gradient;
          ctx.lineWidth = width;
          ctx.globalAlpha = opacity;
          ctx.shadowBlur = 0;
        }
        
        // Draw the line
        ctx.stroke();
        
        // Reset shadow and opacity
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
  };
  
  // Helper: Draw all nodes
  const drawNodes = (ctx: CanvasRenderingContext2D) => {
    discoveredNodes.forEach(node => {
      if (!node.position) return;
      
      const domain = KNOWLEDGE_DOMAINS[node.domain];
      const isActiveNode = activeNode?.id === node.id;
      const isSelectedNode = selectedNode?.id === node.id;
      const isPendingConnection = pendingConnection === node.id;
      const isHighlighted = activeNodes.includes(node.id) || newlyDiscovered.includes(node.id);
      
      // Calculate node size based on mastery (10-20px range)
      const baseSize = 10 + (node.mastery / 100) * 10;
      
      // Increase size if active/selected/highlighted
      const size = isActiveNode || isSelectedNode || isPendingConnection || isHighlighted
        ? baseSize * 1.3
        : baseSize;
        
      // Draw glow for active/highlighted nodes
      if (isActiveNode || isSelectedNode || isPendingConnection || isHighlighted) {
        ctx.beginPath();
        
        // Extra strong glow for highlighted nodes
        const glowRadius = isHighlighted ? size * 2.5 : size * 1.8;
        ctx.arc(node.position.x, node.position.y, glowRadius, 0, Math.PI * 2);
        
        // Create radial gradient for glow
        const glow = ctx.createRadialGradient(
          node.position.x, node.position.y, size * 0.5,
          node.position.x, node.position.y, glowRadius
        );
        
        // Use domain color for glow
        const glowColor = isHighlighted ? domain.lightColor : domain.color;
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = glow;
        ctx.fill();
        
        // Add pulsing animation for highlighted nodes
        if (isHighlighted) {
          // Second larger glow
          ctx.beginPath();
          ctx.arc(node.position.x, node.position.y, glowRadius * 1.5, 0, Math.PI * 2);
          
          const outerGlow = ctx.createRadialGradient(
            node.position.x, node.position.y, glowRadius,
            node.position.x, node.position.y, glowRadius * 1.5
          );
          outerGlow.addColorStop(0, `${domain.lightColor}50`); // 50 is hex for 31% opacity
          outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
          
          ctx.fillStyle = outerGlow;
          ctx.fill();
          
          // Add extra shadow for highlighted nodes
          ctx.shadowColor = domain.color;
          ctx.shadowBlur = 15;
        }
      }
      
      // Draw primary node
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
      
      // Fill based on mastery and domain
      if (isHighlighted) {
        // Brighter color for highlighted nodes
        ctx.fillStyle = domain.lightColor;
      } else {
        // Normal fill with domain color
        ctx.fillStyle = domain.color;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      
      // Add inner highlight
      ctx.beginPath();
      ctx.arc(
        node.position.x - size * 0.3, 
        node.position.y - size * 0.3, 
        size * 0.4, 
        0, Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();
      
      // Add mastery indicator ring
      if (node.mastery > 0) {
        ctx.beginPath();
        ctx.arc(
          node.position.x, 
          node.position.y, 
          size + 2, 
          -Math.PI / 2, // Start at top
          (Math.PI * 2) * (node.mastery / 100) - Math.PI / 2 // End based on mastery %
        );
        ctx.strokeStyle = domain.lightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw labels for active/selected nodes
      if (isActiveNode || isSelectedNode || isHighlighted) {
        const isTemporaryLabel = isActiveNode && !isSelectedNode && !isHighlighted;
        
        // Text background
        ctx.font = '12px var(--font-pixel)';
        const textWidth = ctx.measureText(node.name).width;
        const padding = 4;
        const rectX = node.position.x - textWidth / 2 - padding;
        const rectY = node.position.y + 15 - padding;
        
        ctx.fillStyle = isTemporaryLabel ? 'rgba(26, 30, 36, 0.6)' : 'rgba(26, 30, 36, 0.8)';
        ctx.fillRect(
          rectX, 
          rectY, 
          textWidth + padding * 2, 
          18
        );
        
        // Text
        ctx.fillStyle = isHighlighted ? '#FFFFFF' : domain.lightColor;
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.position.x, node.position.y + 28);
        
        // Domain indicator
        ctx.fillStyle = domain.color;
        ctx.fillRect(node.position.x - textWidth / 2 - padding, rectY, 3, 18);
      }
    });
  };
  
  // Helper: Draw pending connection line
  const drawPendingConnection = (ctx: CanvasRenderingContext2D) => {
    if (pendingConnection && activeNode) {
      const sourceNode = discoveredNodes.find(n => n.id === pendingConnection);
      if (sourceNode && sourceNode.position && activeNode.position) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.position.x, sourceNode.position.y);
        ctx.lineTo(activeNode.position.x, activeNode.position.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]); // Create dashed line
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      }
    }
  };
  
  // Helper: Draw particles
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particleEffects.forEach(particle => {
      ctx.beginPath();
      
      // Fade particles as they near the end of their life
      const opacity = particle.opacity !== undefined 
        ? particle.opacity 
        : particle.life / particle.maxLife;
      
      // Draw particle
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      
      // Convert opacity (0-1) to hex for color string
      const alphaHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${particle.color}${alphaHex}`;
      
      ctx.fill();
    });
  };

  // INTERACTION HANDLERS

  // Handle mouse movement for node hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    // Check if mouse is over any node
    const hoveredNode = discoveredNodes.find(node => {
      if (!node.position) return false;
      
      const baseSize = 10 + (node.mastery / 100) * 10;
      const distance = Math.sqrt(
        Math.pow(node.position.x - x, 2) + 
        Math.pow(node.position.y - y, 2)
      );
      
      return distance <= baseSize + 5; // Add margin for easier hovering
    });
    
    // Update active node
    setActiveNode(hoveredNode || null);
    
    // Update cursor style
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };

  // Handle node click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeNode || !interactive) return;
    
    if (pendingConnection) {
      // Complete connection if clicking a different node
      if (pendingConnection !== activeNode.id) {
        const sourceNode = discoveredNodes.find(n => n.id === pendingConnection);
        
        if (sourceNode) {
          // Check if connection already exists
          const existingConnection = discoveredConnections.find(
            conn => (conn.source === pendingConnection && conn.target === activeNode.id) ||
                   (conn.source === activeNode.id && conn.target === pendingConnection)
          );
          
          if (!existingConnection) {
            // Create new connection with satisfying feedback
            if (playSound) playSound('success');
            if (flashScreen) flashScreen('blue');
            
            // Create new connection in store
            createConnection(pendingConnection, activeNode.id);
            
            // Grant insights based on nodes' mastery
            const insightGain = Math.floor((sourceNode.mastery + activeNode.mastery) / 10) + 5;
            
            // Boost mastery for both nodes
            updateMastery(pendingConnection, Math.min(5, 100 - sourceNode.mastery));
            updateMastery(activeNode.id, Math.min(5, 100 - activeNode.mastery));
            
            // Create visual effect where connection is created
            const midX = ((sourceNode.position?.x || 0) + (activeNode.position?.x || 0)) / 2;
            const midY = ((sourceNode.position?.y || 0) + (activeNode.position?.y || 0)) / 2;
            
            if (showRewardEffect && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              showRewardEffect(insightGain, rect.left + midX, rect.top + midY);
            }
            
            // Create particle burst at connection point
            const newParticles: typeof particleEffects = [];
            
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
        
        // Reset pending connection state
        setPendingConnection(null);
      } else {
        // Cancel if clicking the same node
        setPendingConnection(null);
      }
    } else {
      // Select node or start connection
      if (selectedNode?.id === activeNode.id) {
        // Start connection from selected node
        setPendingConnection(activeNode.id);
        
        // Play connection sound
        if (playSound) playSound('click');
      } else {
        // Select node
        setSelectedNode(activeNode);
        
        // Play node selection sound
        if (playSound) playSound('click');
      }
    }
  };

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    // Prevent default scrolling
    e.preventDefault();
    
    // Calculate new zoom level
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
    
    setZoomLevel(newZoom);
  };
  
  // COMPONENT RENDERING

  return (
    <div 
      ref={containerRef}
      className="relative bg-black pixel-borders"
      style={{ width, height }}
    >
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      
      {/* Controls and info panels */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-surface-dark/80 p-3 pixel-borders-thin text-sm">
          <PixelText className="text-text-primary mb-1">Knowledge Constellation</PixelText>
          <div className="text-text-secondary">
            <div>Discovered: {discoveredNodes.length}/{nodes.length}</div>
            <div>Connections: {discoveredConnections.length}</div>
            <div>Mastery: {totalMastery}%</div>
          </div>
        </div>
      </div>
      
      {/* Connection suggestions panel */}
      {interactive && (
        <div className="absolute top-4 right-4 w-64 z-10">
          <ConnectionSuggestions 
            onSelectConnection={(sourceId, targetId) => {
              // Find the source node and set it as selected
              const sourceNode = discoveredNodes.find(n => n.id === sourceId);
              setSelectedNode(sourceNode || null);
              
              // Start the connection process from this node
              setPendingConnection(sourceId);
              
              // Play sound effect
              if (playSound) playSound('click');
            }}
            maxSuggestions={3}
          />
        </div>
      )}
      
      {/* Domains legend */}
      <div className="absolute bottom-4 left-4 bg-surface-dark/80 p-3 pixel-borders-thin z-10">
        <PixelText className="text-text-primary mb-2">Knowledge Domains</PixelText>
        <div className="space-y-1 text-sm">
          {Object.entries(KNOWLEDGE_DOMAINS).map(([key, domain]) => (
            <div key={key} className="flex items-center">
              <div 
                className="w-3 h-3 mr-2" 
                style={{ backgroundColor: domain.color }}
              ></div>
              <PixelText className={domain.textClass}>{domain.name}</PixelText>
            </div>
          ))}
        </div>
      </div>
      
      {/* Zoom controls */}
      <div className="absolute bottom-20 right-4 flex flex-col space-y-2 z-10">
        <PixelButton
          className="w-8 h-8 flex items-center justify-center bg-surface-dark"
          onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
        >
          +
        </PixelButton>
        <PixelButton
          className="w-8 h-8 flex items-center justify-center bg-surface-dark"
          onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
        >
          -
        </PixelButton>
        <PixelButton
          className="w-8 h-8 flex items-center justify-center bg-surface-dark"
          onClick={() => setZoomLevel(1)}
        >
          ↺
        </PixelButton>
      </div>
      
      {/* Bottom action buttons */}
      <div className="absolute bottom-4 right-4 flex space-x-3 z-10">
        {enableJournal && (
          <PixelButton
            className="bg-surface hover:bg-surface-dark text-text-primary"
            onClick={() => setJournalVisible(true)}
          >
            Journal
          </PixelButton>
        )}
        
        <PixelButton
          className="bg-surface hover:bg-surface-dark text-text-primary"
          onClick={() => setShowHelp(true)}
        >
          Help
        </PixelButton>
        
        {onClose && (
          <PixelButton
            className="bg-surface hover:bg-danger text-text-primary"
            onClick={() => {
              // Reset selected nodes before closing
              setSelectedNode(null);
              setActiveNode(null);
              setPendingConnection(null);
              
              // Clean up newly discovered highlights
              resetNewlyDiscovered();
              
              onClose();
            }}
          >
            Close
          </PixelButton>
        )}
      </div>
      
      {/* Selected node details */}
      {selectedNode && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 max-w-xs bg-surface-dark/90 p-3 pixel-borders z-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center mb-1">
                <div 
                  className="w-3 h-3 mr-2" 
                  style={{ backgroundColor: KNOWLEDGE_DOMAINS[selectedNode.domain].color }}
                ></div>
                <PixelText className={`text-lg ${KNOWLEDGE_DOMAINS[selectedNode.domain].textClass}`}>
                  {selectedNode.name}
                </PixelText>
              </div>
              <PixelText className="text-sm text-text-secondary mb-2">{KNOWLEDGE_DOMAINS[selectedNode.domain].name}</PixelText>
            </div>
            
            <div className="bg-surface px-2 py-1 text-sm">
              <PixelText className="text-text-secondary">Mastery:</PixelText>
              <PixelText className={KNOWLEDGE_DOMAINS[selectedNode.domain].textClass}>{selectedNode.mastery}%</PixelText>
            </div>
          </div>
          
          <PixelText className="text-sm mb-3">{selectedNode.description}</PixelText>
          
          <div className="flex justify-between items-center">
            <PixelText className="text-text-secondary text-xs">
              {pendingConnection === selectedNode.id 
                ? 'Click another node to form connection' 
                : 'Connections: ' + selectedNode.connections.filter(id => 
                    discoveredNodes.some(n => n.id === id)
                  ).length}
            </PixelText>
            
            {!pendingConnection && (
              <PixelButton
                className={`text-xs py-1 ${KNOWLEDGE_DOMAINS[selectedNode.domain].bgClass} text-white`}
                onClick={() => setPendingConnection(selectedNode.id)}
              >
                Connect
              </PixelButton>
            )}
          </div>
        </div>
      )}
      
      {/* Journal overlay */}
      {journalVisible && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Research Journal</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setJournalVisible(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <div className="mb-4">
              <PixelText className="mb-2">Recent Insights</PixelText>
              <div className="space-y-2">
                {recentInsights.map((insight, index) => {
                  const node = discoveredNodes.find(n => n.id === insight.conceptId);
                  if (!node) return null;
                  
                  const domain = KNOWLEDGE_DOMAINS[node.domain];
                  
                  return (
                    <div 
                      key={index}
                      className="p-3 pixel-borders-thin bg-surface-dark"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 mr-2" 
                            style={{ backgroundColor: domain.color }}
                          ></div>
                          <PixelText>{node.name}</PixelText>
                        </div>
                        <div className="bg-surface px-2 py-0.5 text-sm">
                          <PixelText>{insight.amount}%</PixelText>
                        </div>
                      </div>
                      <PixelText className="text-sm text-text-secondary mt-1">
                        {domain.name}
                      </PixelText>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-3 bg-surface-dark pixel-borders-thin">
              <PixelText className="text-text-secondary text-sm italic">
                As you learn and apply knowledge through challenges, your insights will be recorded here, then transferred to your constellation during the night phase.
              </PixelText>
            </div>
          </div>
        </div>
      )}
      
      {/* Help overlay */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Constellation Help</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowHelp(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <div className="space-y-4 mb-4">
              <div>
                <PixelText className="text-educational-light mb-1">Viewing Knowledge</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  Your constellation represents your knowledge in different domains of medical physics. 
                  Each star is a concept you've learned, with brighter stars indicating higher mastery.
                </PixelText>
              </div>
              
              <div>
                <PixelText className="text-educational-light mb-1">Creating Connections</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  1. Click on a concept to select it
                  2. Click the "Connect" button or click the concept again to begin a connection
                  3. Click another concept to form a connection
                </PixelText>
                <PixelText className="text-sm text-text-secondary mt-1">
                  Connecting related concepts deepens your understanding and grants additional insight.
                </PixelText>
              </div>
              
              <div>
                <PixelText className="text-educational-light mb-1">Knowledge Application</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  Your knowledge unlocks new dialogue options and challenge approaches during gameplay.
                  Higher mastery in relevant domains improves your performance in challenges.
                </PixelText>
              </div>
              
              <div>
                <PixelText className="text-educational-light mb-1">Navigation Controls</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  • Use the mouse wheel to zoom in and out
                  • Use the +/- buttons to adjust zoom level
                  • Click the ↺ button to reset zoom
                </PixelText>
              </div>
            </div>
            
            <div className="p-3 bg-clinical/20 pixel-borders-thin">
              <PixelText className="text-clinical-light mb-1">Pro Tip</PixelText>
              <PixelText className="text-sm text-text-secondary">
                The most powerful insights come from connecting concepts across different domains.
                Try connecting clinical knowledge with theoretical understanding!
              </PixelText>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}