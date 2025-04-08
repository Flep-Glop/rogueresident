// app/components/knowledge/StandaloneConstellationView.tsx
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useKnowledgeStore, KnowledgeDomain, ConceptNode, KNOWLEDGE_DOMAINS } from '../../store/knowledgeStore';
import { useGameEffects } from '../GameEffects';

// Helper component for pixel-styled text
const PixelText = ({ className = "", children }: { className?: string, children: React.ReactNode }) => (
  <div className={`font-pixel ${className}`}>{children}</div>
);

// Helper component for pixel-styled buttons
const PixelButton = ({ 
  children, 
  className = '', 
  onClick,
  disabled = false
}: { 
  children: React.ReactNode, 
  className?: string, 
  onClick?: () => void,
  disabled?: boolean
}) => {
  return (
    <button
      className={`px-4 py-2 font-pixel pixel-borders-thin transition-colors ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface StandaloneConstellationViewProps {
  onClose?: () => void;
  width?: number;
  height?: number;
  fullscreen?: boolean;
}

/**
 * Standalone Constellation View
 * 
 * A simplified version of the knowledge constellation visualization
 * that works without requiring the full component dependencies.
 */
export default function StandaloneConstellationView({
  onClose,
  width,
  height,
  fullscreen = true
}: StandaloneConstellationViewProps) {
  // CORE REFS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // STATE
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [particleEffects, setParticleEffects] = useState<Array<{
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
  }>>([]);
  const [showHelp, setShowHelp] = useState(false);
  
  // STORE ACCESS
  const nodes = useKnowledgeStore(state => state.nodes);
  const connections = useKnowledgeStore(state => state.connections);
  const totalMastery = useKnowledgeStore(state => state.totalMastery);
  const domainMastery = useKnowledgeStore(state => state.domainMastery);
  const newlyDiscovered = useKnowledgeStore(state => state.newlyDiscovered);
  
  // GAME EFFECTS - simplified stub for standalone use
  const gameEffects = useMemo(() => ({
    playSound: (sound: string) => console.log(`Would play sound: ${sound}`),
    flashScreen: (color: string) => console.log(`Would flash screen: ${color}`),
    showRewardEffect: (amount: number, x: number, y: number) => 
      console.log(`Would show reward: ${amount} at ${x},${y}`)
  }), []);
  
  // MEMOIZED DATA
  const discoveredNodes = useMemo(() => 
    nodes.filter(node => node.discovered), 
    [nodes]
  );
  
  const discoveredConnections = useMemo(() => 
    connections.filter(conn => conn.discovered), 
    [connections]
  );
  
  // Initialize dimensions based on window size or provided dimensions
  useEffect(() => {
    if (fullscreen) {
      const updateDimensions = () => {
        // Calculate available space (accounting for margins/padding)
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
  
  // Animation loop for particles
  useEffect(() => {
    if (particleEffects.length === 0) return;
    
    const animate = () => {
      setParticleEffects(prev => {
        const updatedParticles = prev.map(particle => {
          // Move particle toward target
          const dx = particle.targetX - particle.x;
          const dy = particle.targetY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            // Still moving toward target
            return {
              ...particle,
              x: particle.x + dx * 0.05,
              y: particle.y + dy * 0.05,
              life: particle.life - 1
            };
          } else {
            // At target, decay faster
            return {
              ...particle,
              life: particle.life - 3
            };
          }
        }).filter(p => p.life > 0); // Remove dead particles
        
        return updatedParticles;
      });
      
      // Continue animation if particles still exist
      if (particleEffects.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [particleEffects.length]);
  
  // Draw constellation on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
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
    
    // Draw particles
    drawParticles(ctx);
    
    // Restore transform
    ctx.restore();
  }, [
    discoveredNodes, 
    discoveredConnections, 
    activeNode, 
    selectedNode, 
    newlyDiscovered, 
    particleEffects,
    zoomLevel,
    cameraPosition
  ]);
  
  // Drawing helper functions
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
    
    // Add nebula effects in the background
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 150 + 100;
      
      // Random domain color for nebula with low opacity
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
  
  const drawConnections = (ctx: CanvasRenderingContext2D) => {
    discoveredConnections.forEach(connection => {
      const sourceNode = discoveredNodes.find(n => n.id === connection.source);
      const targetNode = discoveredNodes.find(n => n.id === connection.target);
      
      if (sourceNode && targetNode && sourceNode.position && targetNode.position) {
        const isActive = 
          (selectedNode?.id === sourceNode.id || selectedNode?.id === targetNode.id);
        
        // Connection properties based on strength
        const opacity = connection.strength / 200 + 0.3; // 0.3 - 0.8 range
        const width = connection.strength / 100 * 2 + 1; // 1 - 3 range
        
        // Get domain colors
        const sourceDomain = KNOWLEDGE_DOMAINS[sourceNode.domain];
        const targetDomain = KNOWLEDGE_DOMAINS[targetNode.domain];
        
        // Create gradient between domain colors
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
          ctx.shadowColor = 'white';
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = gradient;
          ctx.lineWidth = width;
          ctx.globalAlpha = opacity;
          ctx.shadowBlur = 0;
        }
        
        ctx.stroke();
        
        // Reset shadow and opacity
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
  };
  
  const drawNodes = (ctx: CanvasRenderingContext2D) => {
    discoveredNodes.forEach(node => {
      if (!node.position) return;
      
      const domain = KNOWLEDGE_DOMAINS[node.domain];
      const isActiveNode = activeNode?.id === node.id;
      const isSelectedNode = selectedNode?.id === node.id;
      const isHighlighted = newlyDiscovered.includes(node.id);
      
      // Node size based on mastery (10-20px range)
      const baseSize = 10 + (node.mastery / 100) * 10;
      
      // Increase size if active/selected/highlighted
      const size = isActiveNode || isSelectedNode || isHighlighted
        ? baseSize * 1.3
        : baseSize;
        
      // Draw glow for active/highlighted nodes
      if (isActiveNode || isSelectedNode || isHighlighted) {
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
      
      // Draw labels for active/selected nodes
      if (isActiveNode || isSelectedNode || isHighlighted) {
        // Text background
        ctx.font = '12px var(--font-pixel)';
        const textWidth = ctx.measureText(node.name).width;
        const padding = 4;
        const rectX = node.position.x - textWidth / 2 - padding;
        const rectY = node.position.y + 15 - padding;
        
        ctx.fillStyle = 'rgba(26, 30, 36, 0.8)';
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
  
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particleEffects.forEach(particle => {
      ctx.beginPath();
      
      // Fade particles as they age
      const opacity = particle.life / particle.maxLife;
      
      // Draw particle
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      
      // Convert opacity to hex for color string
      const alphaHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${particle.color}${alphaHex}`;
      
      ctx.fill();
    });
  };
  
  // Mouse Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
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
    
    // Apply inverse transforms to get correct mouse position
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
    
    // Update cursor style
    if (hoveredNode) {
      canvas.style.cursor = 'pointer';
    } else if (isDragging) {
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = 'grab';
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    // Use left button (0) for both node selection and dragging
    if (e.button === 0) {
      if (!activeNode) {
        // Start dragging if not over a node
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY
        });
        
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
      }
      // If over a node, will handle in click handler
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // End drag
    setIsDragging(false);
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = activeNode ? 'pointer' : 'grab';
    }
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeNode || isDragging) return;
    
    // Select node
    setSelectedNode(activeNode);
    
    // Add particle effect
    if (activeNode.position) {
      const newParticles = [];
      
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 30;
        
        newParticles.push({
          id: `click-particle-${i}-${Date.now()}`,
          x: activeNode.position.x + Math.cos(angle) * distance,
          y: activeNode.position.y + Math.sin(angle) * distance,
          targetX: activeNode.position.x,
          targetY: activeNode.position.y,
          color: KNOWLEDGE_DOMAINS[activeNode.domain].color,
          size: Math.random() * 3 + 1,
          life: 60,
          maxLife: 60
        });
      }
      
      setParticleEffects(prev => [...prev, ...newParticles]);
      
      // Play sound effect (stub)
      gameEffects.playSound('click');
    }
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Prevent default scrolling
    e.preventDefault();
    
    // Calculate new zoom level
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
    
    setZoomLevel(newZoom);
  };
  
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
        onMouseLeave={() => setIsDragging(false)}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu
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
          onClick={() => {
            setZoomLevel(0.8); // Reset zoom
            setCameraPosition({ x: 0, y: 0 }); // Reset position
          }}
        >
          ↺
        </PixelButton>
      </div>
      
      {/* Bottom buttons */}
      <div className="absolute bottom-4 right-4 flex space-x-3 z-10">
        <PixelButton
          className="bg-surface hover:bg-surface-dark text-text-primary"
          onClick={() => setShowHelp(true)}
        >
          Help
        </PixelButton>
        
        {onClose && (
          <PixelButton
            className="bg-surface hover:bg-danger text-text-primary"
            onClick={onClose}
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
              <PixelText className="text-sm text-text-secondary mb-2">
                {KNOWLEDGE_DOMAINS[selectedNode.domain].name}
              </PixelText>
            </div>
            
            <div className="bg-surface px-2 py-1 text-sm">
              <PixelText className="text-text-secondary">Mastery:</PixelText>
              <PixelText className={KNOWLEDGE_DOMAINS[selectedNode.domain].textClass}>
                {selectedNode.mastery}%
              </PixelText>
            </div>
          </div>
          
          <PixelText className="text-sm mb-3">{selectedNode.description}</PixelText>
          
          <div className="flex justify-between items-center">
            <PixelText className="text-text-secondary text-xs">
              Connections: {selectedNode.connections.filter(id => 
                discoveredNodes.some(n => n.id === id)
              ).length}
            </PixelText>
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
                <PixelText className="text-educational-light mb-1">About The Constellation</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  Your constellation represents your growing knowledge in medical physics. 
                  Each star is a concept you've discovered, with brightness indicating your mastery.
                  Connections between stars show relationships between concepts.
                </PixelText>
              </div>
              
              <div>
                <PixelText className="text-educational-light mb-1">Navigation Controls</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  • Click and drag anywhere to pan the view
                  • Use the mouse wheel to zoom in and out
                  • Click on stars to view concept details
                  • Use the +/- buttons to adjust zoom level
                  • Click the ↺ button to reset zoom and position
                </PixelText>
              </div>
              
              <div>
                <PixelText className="text-educational-light mb-1">Reading the Display</PixelText>
                <PixelText className="text-sm text-text-secondary">
                  • Colors represent different domains of knowledge
                  • Brighter stars indicate higher mastery
                  • Thicker connections show stronger relationships
                  • Newly discovered concepts pulse with bright light
                </PixelText>
              </div>
            </div>
            
            <div className="p-3 bg-clinical/20 pixel-borders-thin">
              <PixelText className="text-clinical-light mb-1">Tip</PixelText>
              <PixelText className="text-sm text-text-secondary">
                Looking for patterns in your constellation can reveal deeper insights about how 
                medical physics concepts relate to each other.
              </PixelText>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS classes needed for styling */}
      <style jsx>{`
        .pixel-borders {
          border: 4px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        
        .pixel-borders-thin {
          border: 2px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        }
        
        .text-text-primary {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .text-text-secondary {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .bg-surface {
          background-color: rgba(30, 36, 47, 0.8);
        }
        
        .bg-surface-dark {
          background-color: rgba(22, 28, 36, 0.85);
        }
        
        .bg-danger {
          background-color: rgba(220, 38, 38, 0.8);
        }
      `}</style>
    </div>
  );
}