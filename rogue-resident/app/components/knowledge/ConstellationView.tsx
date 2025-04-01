// app/components/knowledge/ConstellationView.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { useGameStore } from '../../store/gameStore';
import Image from 'next/image';

// Knowledge domains and their theme colors
export const KNOWLEDGE_DOMAINS = {
  'clinical': {
    name: 'Clinical Practice',
    color: 'var(--clinical-color)',
    lightColor: 'var(--clinical-color-light)',
    darkColor: 'var(--clinical-color-dark)',
    bgClass: 'bg-clinical',
    textClass: 'text-clinical-light',
    icon: '🏥'
  },
  'technical': {
    name: 'Equipment & QA',
    color: 'var(--qa-color)',
    lightColor: 'var(--qa-color-light)',
    darkColor: 'var(--qa-color-dark)',
    bgClass: 'bg-qa',
    textClass: 'text-qa-light',
    icon: '🔧'
  },
  'theoretical': {
    name: 'Physics Theory',
    color: 'var(--educational-color)',
    lightColor: 'var(--educational-color-light)',
    darkColor: 'var(--educational-color-dark)',
    bgClass: 'bg-educational',
    textClass: 'text-educational-light',
    icon: '🔬'
  },
  'general': {
    name: 'General Knowledge',
    color: 'var(--text-primary)',
    lightColor: 'var(--text-primary)',
    darkColor: 'var(--text-secondary)',
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
}

export default function ConstellationView({ 
  onClose, 
  width = 800, 
  height = 600, 
  interactive = true,
  enableJournal = true
}: ConstellationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  const { updateInsight } = useGameStore();
  
  // State for constellation
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [connections, setConnections] = useState<ConceptConnection[]>([]);
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animatingNodeId, setAnimatingNodeId] = useState<string | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [recentInsights, setRecentInsights] = useState<{concept: string, domain: string, amount: number}[]>([]);
  
  // Animation frame tracking
  const animationFrameRef = useRef<number | null>(null);
  
  // Placeholder for recently acquired knowledge from game state
  // In a full implementation, this would come from the global state
  const recentlyAcquiredKnowledge = useRef<ConceptNode[]>([]);
  
  // Load concept data
  useEffect(() => {
    // In a real implementation, this would come from gameStore
    // For prototype, we'll use placeholder data
    const initialNodes: ConceptNode[] = [
      {
        id: 'radiation-basics',
        name: 'Radiation Fundamentals',
        domain: 'theoretical',
        description: 'Core principles of ionizing radiation including types, energy transfer, and interactions with matter.',
        mastery: 75,
        connections: ['dosimetry-principles', 'radiation-safety'],
        discovered: true,
        position: { x: 400, y: 200 }
      },
      {
        id: 'dosimetry-principles',
        name: 'Dosimetry Principles',
        domain: 'technical',
        description: 'Methods and instruments for measuring radiation dose and its distribution.',
        mastery: 60,
        connections: ['radiation-basics', 'radiation-detectors'],
        discovered: true,
        position: { x: 250, y: 280 }
      },
      {
        id: 'radiation-detectors',
        name: 'Radiation Detectors',
        domain: 'technical',
        description: 'Various technologies used for detection and measurement of radiation.',
        mastery: 50,
        connections: ['dosimetry-principles', 'ionization-chambers'],
        discovered: true,
        position: { x: 320, y: 370 }
      },
      {
        id: 'ionization-chambers',
        name: 'Ionization Chambers',
        domain: 'technical',
        description: 'Gas-filled detectors that measure ionizing radiation by collecting ions.',
        mastery: 40,
        connections: ['radiation-detectors', 'quantum-effects'],
        discovered: true,
        position: { x: 470, y: 350 }
      },
      {
        id: 'quantum-effects',
        name: 'Quantum Effects',
        domain: 'theoretical',
        description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
        mastery: 30,
        connections: ['ionization-chambers', 'ionix-anomaly'],
        discovered: true,
        position: { x: 550, y: 250 }
      },
      {
        id: 'radiation-safety',
        name: 'Radiation Safety',
        domain: 'clinical',
        description: 'Protocols and principles for ensuring safe use of radiation in medical settings.',
        mastery: 65,
        connections: ['radiation-basics', 'alara-principle'],
        discovered: true,
        position: { x: 320, y: 120 }
      },
      {
        id: 'alara-principle',
        name: 'ALARA Principle',
        domain: 'clinical',
        description: 'As Low As Reasonably Achievable - framework for minimizing radiation exposure.',
        mastery: 80,
        connections: ['radiation-safety'],
        discovered: true,
        position: { x: 180, y: 150 }
      },
      {
        id: 'ionix-anomaly',
        name: 'Ionix Anomaly',
        domain: 'theoretical',
        description: 'Unusual quantum behavior observed in experimental ion chambers.',
        mastery: 15,
        connections: ['quantum-effects'],
        discovered: true,
        position: { x: 620, y: 150 }
      },
      // Undiscovered nodes
      {
        id: 'detector-calibration',
        name: 'Detector Calibration',
        domain: 'technical',
        description: 'Procedures to ensure accurate readings from radiation detectors.',
        mastery: 0,
        connections: ['radiation-detectors', 'quality-assurance'],
        discovered: false,
        position: { x: 200, y: 420 }
      },
      {
        id: 'quality-assurance',
        name: 'Quality Assurance',
        domain: 'clinical',
        description: 'Procedures to ensure reliability and consistency of medical equipment.',
        mastery: 0,
        connections: ['detector-calibration'],
        discovered: false,
        position: { x: 150, y: 350 }
      }
    ];

    // Build connections from nodes
    const initialConnections: ConceptConnection[] = [];
    initialNodes.forEach(node => {
      node.connections.forEach(targetId => {
        // Only create connection if both nodes exist and are discovered
        const targetNode = initialNodes.find(n => n.id === targetId);
        if (targetNode && node.discovered && targetNode.discovered) {
          initialConnections.push({
            source: node.id,
            target: targetId,
            strength: (node.mastery + (targetNode?.mastery || 0)) / 2,
            discovered: true
          });
        }
      });
    });

    setNodes(initialNodes);
    setConnections(initialConnections);
    
    // In a full implementation, this would come from game state
    // Simulating recently acquired knowledge for the prototype
    recentlyAcquiredKnowledge.current = [
      {
        id: 'quantum-effects',
        name: 'Quantum Effects',
        domain: 'theoretical',
        description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
        mastery: 30,
        connections: ['ionization-chambers', 'ionix-anomaly'],
        discovered: true,
        position: { x: 550, y: 250 }
      }
    ];
    
    // Set recent insights for journal
    setRecentInsights([
      { concept: 'Quantum Effects', domain: 'theoretical', amount: 30 },
      { concept: 'Ionization Chambers', domain: 'technical', amount: 15 }
    ]);
    
  }, []);

  // Draw constellation
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw starry background (subtle)
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 1.2;
      const opacity = Math.random() * 0.5 + 0.1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
    
    // Draw connections
    connections.forEach(connection => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);
      
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
    
    // Draw nodes
    nodes.forEach(node => {
      if (!node.position || !node.discovered) return;
      
      const domain = KNOWLEDGE_DOMAINS[node.domain];
      const isActiveNode = activeNode?.id === node.id;
      const isSelectedNode = selectedNode?.id === node.id;
      const isPendingConnection = pendingConnection === node.id;
      const isAnimating = animatingNodeId === node.id;
      
      // Calculate node size based on mastery (10-20px range)
      const baseSize = 10 + (node.mastery / 100) * 10;
      
      // Increase size if active/selected
      const size = isActiveNode || isSelectedNode || isPendingConnection || isAnimating
        ? baseSize * 1.3
        : baseSize;
        
      // Draw glow for active nodes
      if (isActiveNode || isSelectedNode || isPendingConnection || isAnimating) {
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, size * 1.8, 0, Math.PI * 2);
        
        // Create radial gradient for glow
        const glow = ctx.createRadialGradient(
          node.position.x, node.position.y, size * 0.5,
          node.position.x, node.position.y, size * 2
        );
        
        // Use domain color for glow
        glow.addColorStop(0, domain.color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = glow;
        ctx.fill();
      }
      
      // Draw primary node
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
      
      // Fill based on mastery and domain
      if (isAnimating) {
        // Pulsing white for animation
        ctx.fillStyle = 'white';
      } else {
        // Normal fill with domain color
        ctx.fillStyle = domain.color;
      }
      
      ctx.fill();
      
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
          0, 
          (Math.PI * 2) * (node.mastery / 100)
        );
        ctx.strokeStyle = domain.lightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    
    // Draw connecting line when establishing new connection
    if (pendingConnection && activeNode && selectedNode) {
      const sourceNode = nodes.find(n => n.id === pendingConnection);
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
    
    // Draw labels for active/selected nodes
    nodes.forEach(node => {
      if (!node.position || !node.discovered) return;
      
      const isActiveNode = activeNode?.id === node.id;
      const isSelectedNode = selectedNode?.id === node.id;
      
      // Only show labels for active/selected nodes to avoid clutter
      if (isActiveNode || isSelectedNode) {
        const domain = KNOWLEDGE_DOMAINS[node.domain];
        
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
        ctx.fillStyle = domain.lightColor;
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.position.x, node.position.y + 28);
        
        // Domain indicator
        ctx.fillStyle = domain.color;
        ctx.fillRect(node.position.x - textWidth / 2 - padding, rectY, 3, 18);
      }
    });
  }, [nodes, connections, activeNode, selectedNode, pendingConnection, animatingNodeId]);

  // Handle mouse movement for node hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactive) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over any node
    const hoveredNode = nodes.find(node => {
      if (!node.position || !node.discovered) return false;
      
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
        const sourceNode = nodes.find(n => n.id === pendingConnection);
        
        if (sourceNode) {
          // Check if connection already exists
          const existingConnection = connections.find(
            conn => (conn.source === pendingConnection && conn.target === activeNode.id) ||
                   (conn.source === activeNode.id && conn.target === pendingConnection)
          );
          
          if (!existingConnection) {
            // Create new connection
            const newConnection: ConceptConnection = {
              source: pendingConnection,
              target: activeNode.id,
              // Strength based on average mastery of both nodes
              strength: (sourceNode.mastery + activeNode.mastery) / 2,
              discovered: true
            };
            
            // Update connections
            setConnections([...connections, newConnection]);
            
            // Update nodes to include connection reference
            setNodes(nodes.map(node => {
              if (node.id === pendingConnection) {
                return {
                  ...node,
                  connections: [...node.connections, activeNode.id]
                };
              }
              if (node.id === activeNode.id) {
                return {
                  ...node,
                  connections: [...node.connections, pendingConnection]
                };
              }
              return node;
            }));
            
            // Show connection formation effects
            if (playSound) playSound('success');
            if (flashScreen) flashScreen('blue');
            
            // Grant insight for forming connection
            const insightGain = Math.floor((sourceNode.mastery + activeNode.mastery) / 10) + 5;
            updateInsight(insightGain);
            
            if (showRewardEffect && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              showRewardEffect(
                insightGain,
                rect.left + (sourceNode.position?.x || 0) + 100,
                rect.top + (sourceNode.position?.y || 0) + 100
              );
            }
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
      } else {
        // Select node
        setSelectedNode(activeNode);
        if (playSound) playSound('click');
      }
    }
  };

  // Simulate journal insight transfer animation
  useEffect(() => {
    if (showAnimation && recentlyAcquiredKnowledge.current.length > 0) {
      // Animate each recently acquired node
      const animateNodes = async () => {
        for (const node of recentlyAcquiredKnowledge.current) {
          setAnimatingNodeId(node.id);
          
          // Play animation sound
          if (playSound) playSound('success');
          
          // Wait for animation to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setAnimatingNodeId(null);
          
          // Small pause between nodes
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Complete animation
        setShowAnimation(false);
      };
      
      animateNodes();
    }
  }, [showAnimation, playSound]);

  // Clean up any animations on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative bg-surface-dark pixel-borders"
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
      />
      
      {/* Controls and info overlays */}
      <div className="absolute top-4 left-4 space-y-4 z-10">
        <div className="bg-surface-dark/80 p-3 pixel-borders-thin text-sm">
          <PixelText className="text-text-primary mb-1">Knowledge Constellation</PixelText>
          <div className="text-text-secondary">
            <div>Discovered: {nodes.filter(n => n.discovered).length}/{nodes.length}</div>
            <div>Connections: {connections.length}/{nodes.reduce((acc, n) => acc + n.connections.length, 0) / 2}</div>
          </div>
        </div>
      </div>
      
      {/* Domains legend */}
      <div className="absolute top-4 right-4 bg-surface-dark/80 p-3 pixel-borders-thin z-10">
        <PixelText className="text-text-primary mb-2">Knowledge Domains</PixelText>
        <div className="space-y-1 text-sm">
          {Object.entries(KNOWLEDGE_DOMAINS).map(([key, domain]) => (
            <div key={key} className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: domain.color }}></div>
              <PixelText className={domain.textClass}>{domain.name}</PixelText>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom action buttons */}
      <div className="absolute bottom-4 right-4 flex space-x-3 z-10">
        {enableJournal && (
          <PixelButton
            className="bg-surface hover:bg-surface-dark text-text-primary"
            onClick={() => setJournalVisible(true)}
          >
            <div className="flex items-center">
              <Image src="/journal-icon.svg" width={16} height={16} alt="Journal" className="mr-1" />
              <span>Journal</span>
            </div>
          </PixelButton>
        )}
        
        <PixelButton
          className="bg-surface hover:bg-surface-dark text-text-primary"
          onClick={() => setShowAnimation(true)}
        >
          <div className="flex items-center">
            <Image src="/insight-icon.svg" width={16} height={16} alt="Transfer" className="mr-1" />
            <span>Transfer Insights</span>
          </div>
        </PixelButton>
        
        {onClose && (
          <PixelButton
            className="bg-surface hover:bg-danger text-text-primary"
            onClick={onClose}
          >
            Close View
          </PixelButton>
        )}
      </div>
      
      {/* Selected node details */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 max-w-sm bg-surface-dark/90 p-3 pixel-borders z-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center mb-1">
                <div className="w-3 h-3 mr-2" style={{ backgroundColor: KNOWLEDGE_DOMAINS[selectedNode.domain].color }}></div>
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
                : 'Connections: ' + selectedNode.connections.length}
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
        <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center">
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
                  const domain = Object.entries(KNOWLEDGE_DOMAINS).find(
                    ([key]) => key.toLowerCase() === insight.domain.toLowerCase()
                  )?.[1];
                  
                  return (
                    <div 
                      key={index}
                      className={`p-3 pixel-borders-thin`}
                      style={{ backgroundColor: 'var(--surface-dark)' }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 mr-2" 
                            style={{ backgroundColor: domain?.color || 'var(--text-primary)' }}
                          ></div>
                          <PixelText>{insight.concept}</PixelText>
                        </div>
                        <div className="bg-surface px-2 py-0.5 text-sm">
                          <PixelText>{insight.amount}%</PixelText>
                        </div>
                      </div>
                      <PixelText className="text-sm text-text-secondary mt-1">
                        {domain?.name || 'Unknown Domain'}
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
    </div>
  );
}