// app/components/knowledge/ConstellationView.tsx
'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { useKnowledgeStore, KnowledgeDomain, ConceptNode, ConceptConnection, KNOWLEDGE_DOMAINS } from '../../store/knowledgeStore';
import ConnectionSuggestions from './ConnectionSuggestions';

// Re-export KNOWLEDGE_DOMAINS for consistency with imports elsewhere
export { KNOWLEDGE_DOMAINS };

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
 * ConstellationView - The interactive knowledge visualization system for medical physics concepts
 */
export default function ConstellationView({ 
  onClose, 
  width, 
  height, 
  interactive = true,
  enableJournal = true,
  activeNodes = [],
  fullscreen = true, // Default to fullscreen
  nightMode = false,
  showLabels = true
}: ConstellationViewProps) {
  // CORE REFS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isComponentMounted = useRef(true);
  
  // STORE ACCESS - Use stable selectors with useCallback
  // Direct store for actions to avoid re-renders
  const knowledgeStore = useRef(useKnowledgeStore.getState());
  
  // Set up selectors with useCallback to avoid recreation on each render
  const nodes = useKnowledgeStore(useCallback(state => state.nodes, []));
  const connections = useKnowledgeStore(useCallback(state => state.connections, []));
  const totalMastery = useKnowledgeStore(useCallback(state => state.totalMastery, []));
  const domainMastery = useKnowledgeStore(useCallback(state => state.domainMastery, [])); 
  const pendingInsights = useKnowledgeStore(useCallback(state => state.pendingInsights, []));
  const newlyDiscovered = useKnowledgeStore(useCallback(state => state.newlyDiscovered, []));
  const journalEntries = useKnowledgeStore(useCallback(state => state.journalEntries, []));

  // HOOKS
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // STATE MANAGEMENT
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [recentInsights, setRecentInsights] = useState<{conceptId: string, amount: number}[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  
  // INTERACTION STATE
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
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
  
  // Initialize dimensions based on window size or provided dimensions
  useEffect(() => {
    if (fullscreen) {
      const updateDimensions = () => {
        // Calculate available space (accounting for margins/padding)
        // Using window.innerWidth and window.innerHeight as fallbacks
        const containerWidth = containerRef.current?.parentElement?.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current?.parentElement?.clientHeight || window.innerHeight;
        
        // Subtract some padding to avoid touching the edge of the screen
        const padding = 24;
        setDimensions({
          width: Math.max(800, containerWidth - padding * 2),
          height: Math.max(600, containerHeight - padding * 2)
        });
      };
      
      // Set initial dimensions
      updateDimensions();
      
      // Update dimensions on window resize
      window.addEventListener('resize', updateDimensions);
      
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    } else if (width && height) {
      // Use provided dimensions if not fullscreen
      setDimensions({ width, height });
    }
  }, [fullscreen, width, height]);
  
  // MEMOIZE DATA FOR RENDERING
  // Memoize discovered nodes 
  const discoveredNodes = useMemo(() => 
    nodes.filter(node => node.discovered), 
    [nodes]
  );
  
  // Memoize discovered connections
  const discoveredConnections = useMemo(() => 
    connections.filter(conn => conn.discovered), 
    [connections]
  );

  // Track component mounted state for cleanup
  useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      
      // Cleanup any active animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // Focus on active nodes passed from parent
  useEffect(() => {
    if (!isComponentMounted.current || activeNodes.length === 0 || nodes.length === 0) return;
    
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
      
      if (newParticles.length > 0) {
        setParticleEffects(prev => [...prev, ...newParticles]);
        
        // Play discovery sound effect
        if (playSound) playSound('success');
      }
    }
  }, [activeNodes, nodes, playSound]);
  
  // Also highlight newly discovered nodes from knowledgeStore
  useEffect(() => {
    if (!isComponentMounted.current || newlyDiscovered.length === 0 || nodes.length === 0) return;
    
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
    
    if (newParticles.length > 0) {
      setParticleEffects(prev => [...prev, ...newParticles]);
    }
  }, [newlyDiscovered, nodes]);
  
  // Track recent insights for journal
  useEffect(() => {
    if (!isComponentMounted.current) return;
    
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
        { conceptId: 'electron-equilibrium', amount: 15 },
        { conceptId: 'radiation-safety', amount: 30 }
      ]);
    }
  }, [journalEntries]);

  // ANIMATION LOOP
  // Handle particle animations and movement with proper cleanup
  useEffect(() => {
    if (!isComponentMounted.current || particleEffects.length === 0) return;
    
    let active = true;
    
    const animate = () => {
      if (!active || !isComponentMounted.current) return;
      
      let animating = false;
      
      setParticleEffects(prev => {
        // Skip update if component unmounted during animation frame
        if (!active) return prev;
        
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
        
        return updatedParticles;
      });
      
      // Continue animation if particles still exist or stop
      if (animating && active && isComponentMounted.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      active = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [particleEffects.length]); // Only depends on length changing

  // RENDERING FUNCTIONS

  // Draw constellation on canvas
  useEffect(() => {
    if (!canvasRef.current || !isComponentMounted.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and camera position transform
    ctx.save();
    ctx.translate(canvas.width / 2 + cameraPosition.x, canvas.height / 2 + cameraPosition.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
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
    zoomLevel,
    cameraPosition
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
      const randomDomain = domainKeys[Math.floor(Math.random() * domainKeys.length)] as KnowledgeDomain;
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
        const colorKey = domain.color;
        const lightColor = domain.textClass === 'text-clinical-light' ? 'var(--clinical-color-light)' : 
                          domain.textClass === 'text-qa-light' ? 'var(--qa-color-light)' :
                          domain.textClass === 'text-educational-light' ? 'var(--educational-color-light)' :
                          domain.textClass === 'text-warning' ? 'var(--warning-color)' : 
                          domain.color;
        
        glow.addColorStop(0, isHighlighted ? lightColor : colorKey);
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
          outerGlow.addColorStop(0, `${colorKey}50`); // 50 is hex for 31% opacity
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
        const lightColor = domain.textClass === 'text-clinical-light' ? 'var(--clinical-color-light)' : 
                          domain.textClass === 'text-qa-light' ? 'var(--qa-color-light)' :
                          domain.textClass === 'text-educational-light' ? 'var(--educational-color-light)' :
                          domain.textClass === 'text-warning' ? 'var(--warning-color)' : 
                          domain.color;
        ctx.fillStyle = lightColor;
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
        
        // Get light color for domain
        const lightColor = domain.textClass === 'text-clinical-light' ? 'var(--clinical-color-light)' : 
                          domain.textClass === 'text-qa-light' ? 'var(--qa-color-light)' :
                          domain.textClass === 'text-educational-light' ? 'var(--educational-color-light)' :
                          domain.textClass === 'text-warning' ? 'var(--warning-color)' : 
                          domain.color;
                          
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw labels for active/selected nodes or when showLabels is true
      if ((isActiveNode || isSelectedNode || isHighlighted || showLabels)) {
        const isTemporaryLabel = isActiveNode && !isSelectedNode && !isHighlighted && !showLabels;
        
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
        ctx.fillStyle = isHighlighted ? '#FFFFFF' : domain.color;
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

  // INTERACTION HANDLERS - With left-click drag panning

  // Handle mouse movement for node hover and dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMounted.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle dragging to move the camera
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Update camera position
      setCameraPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      // Update drag start position
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      
      return;
    }
    
    // Apply inverse transforms to get the correct mouse position in the canvas space
    const canvasX = (e.clientX - rect.left);
    const canvasY = (e.clientY - rect.top);
    
    // Convert to scene coordinates
    const sceneX = (canvasX - (canvas.width / 2 + cameraPosition.x)) / zoomLevel + canvas.width / 2;
    const sceneY = (canvasY - (canvas.height / 2 + cameraPosition.y)) / zoomLevel + canvas.height / 2;
    
    // Check if mouse is over any node
    const hoveredNode = discoveredNodes.find(node => {
      if (!node.position) return false;
      
      const baseSize = 10 + (node.mastery / 100) * 10;
      const distance = Math.sqrt(
        Math.pow(node.position.x - sceneX, 2) + 
        Math.pow(node.position.y - sceneY, 2)
      );
      
      return distance <= baseSize + 5; // Add margin for easier hovering
    });
    
    // Update active node
    setActiveNode(hoveredNode || null);
    
    // Update cursor style based on context
    if (hoveredNode) {
      canvas.style.cursor = 'pointer';
    } else if (isDragging) {
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = 'grab';
    }
  }, [isDragging, dragStart, cameraPosition, zoomLevel, discoveredNodes]);

  // Handle mouse down for both left-click interactions and dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive || !isComponentMounted.current) return;
    
    // Determine if we're over a node
    const isOverNode = activeNode != null;
    
    // Use left button (0) for both node selection and dragging
    if (e.button === 0) {
      if (!isOverNode) {
        // Start dragging if not over a node
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY
        });
        
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
      } else {
        // Note: We'll handle node selection in the click handler
        // This prevents both dragging and node selection at the same time
        setIsConnecting(true);
      }
    }
    
    // Middle button (1) or right button (2) for panning (keep existing behavior)
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
    }
  }, [interactive, activeNode]);
  
  // Handle mouse up to end dragging
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isComponentMounted.current) return;
    
    // End drag regardless of which button was released
    setIsDragging(false);
    setIsConnecting(false);
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = activeNode ? 'pointer' : 'grab';
    }
  }, [activeNode]);

  // Handle node click - Modified to work with the improved dragging
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeNode || !interactive || isDragging || !isComponentMounted.current) return;
    
    // Handle node interaction for connection making
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
            knowledgeStore.current.createConnection(pendingConnection, activeNode.id);
            
            // Grant insights based on nodes' mastery
            const insightGain = Math.floor((sourceNode.mastery + activeNode.mastery) / 10) + 5;
            
            // Boost mastery for both nodes
            knowledgeStore.current.updateMastery(pendingConnection, Math.min(5, 100 - sourceNode.mastery));
            knowledgeStore.current.updateMastery(activeNode.id, Math.min(5, 100 - activeNode.mastery));
            
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
  }, [activeNode, discoveredNodes, discoveredConnections, pendingConnection, selectedNode, playSound, flashScreen, showRewardEffect, isDragging]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive || !isComponentMounted.current) return;
    
    // Prevent default scrolling
    e.preventDefault();
    
    // Calculate new zoom level
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
    
    setZoomLevel(newZoom);
  }, [zoomLevel, interactive]);
  
  // Handler for creating connections from the suggestions panel
  const handleCreateConnectionFromSuggestion = useCallback((sourceId: string, targetId: string) => {
    if (!isComponentMounted.current) return;
    
    // Find the source node and set it as selected
    const sourceNode = discoveredNodes.find(n => n.id === sourceId);
    setSelectedNode(sourceNode || null);
    
    // Start the connection process from this node
    setPendingConnection(sourceId);
    
    // Play sound effect
    if (playSound) playSound('click');
  }, [discoveredNodes, playSound]);
  
  // Handle closing the constellation view
  const handleClose = useCallback(() => {
    if (!isComponentMounted.current || !onClose) return;
    
    // Reset selected nodes before closing
    setSelectedNode(null);
    setActiveNode(null);
    setPendingConnection(null);
    
    // Clean up newly discovered highlights
    knowledgeStore.current.resetNewlyDiscovered();
    
    onClose();
  }, [onClose]);
  
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
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setIsConnecting(false);
        }}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
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
            onSelectConnection={handleCreateConnectionFromSuggestion}
            maxSuggestions={3}
          />
        </div>
      )}
      
      {/* Domains legend */}
      <div className="absolute bottom-4 left-4 bg-surface-dark/80 p-3 pixel-borders-thin z-10">
        <PixelText className="text-text-primary mb-2">Knowledge Domains</PixelText>
        <div className="space-y-1 text-sm">
          {Object.entries(domainMastery)
            .filter(([_, mastery]) => mastery > 0)
            .map(([key, mastery]) => {
              const domain = KNOWLEDGE_DOMAINS[key as KnowledgeDomain];
              if (!domain) return null;
              
              return (
                <div key={key} className="flex items-center">
                  <div 
                    className="w-3 h-3 mr-2" 
                    style={{ backgroundColor: domain.color }}
                  ></div>
                  <PixelText className={domain.textClass}>{domain.name}: {mastery}%</PixelText>
                </div>
              );
            })}
        </div>
      </div>
      
      {/* Zoom and camera controls */}
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
          onClick={() => {
            setZoomLevel(0.8); // Reset to initial zoom level
            setCameraPosition({ x: 0, y: 0 }); // Reset camera position
          }}
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
            onClick={handleClose}
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
                      key={`insight-${index}-${insight.conceptId}`}
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
                  • Click and drag anywhere to pan the view
                  • Use the mouse wheel to zoom in and out
                  • Right-click and drag also works for panning
                  • Use the +/- buttons to adjust zoom level
                  • Click the ↺ button to reset zoom and position
                </PixelText>
              </div>
            </div>
            
            <div className="p-3 bg-clinical/20 pixel-borders-thin">
              <PixelText className="text-clinical-light mb-1">Pro Tip</PixelText>
              <PixelText className="text-sm text-text-secondary">
                The most powerful insights come from connecting concepts across different domains.
                Try connecting clinical knowledge with radiation physics principles!
              </PixelText>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}