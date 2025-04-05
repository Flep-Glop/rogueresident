// app/components/EnhancedNode.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameEffects } from './GameEffects';
import { Node, NodeState } from '../types/map';

interface EnhancedNodeProps {
  node: Node;
  state: NodeState;
  onClick: () => void;
  onHover: (nodeId: string | null) => void;
  isSelected: boolean;
  tier: number;
  animationDelay?: number;
}

// Map of node types to icon paths (replace with your actual icon paths)
const NODE_ICONS = {
  'clinical': '/icons/clinical.png',
  'qa': '/icons/qa.png',
  'educational': '/icons/educational.png',
  'storage': '/icons/storage.png',
  'entrance': '/icons/entrance.png',
  'boss': '/icons/boss.png',
  'boss-ionix': '/icons/boss-ionix.png',
  'kapoorCalibration': '/icons/calibration.png',
  'vendor': '/icons/vendor.png',
  'experimental': '/icons/experimental.png',
  'qualification': '/icons/qualification.png',
  // Default fallback
  'default': '/icons/default.png'
};

// Color schemes by node type for consistent visuals
const NODE_COLORS = {
  'clinical': {
    base: '#4e83bd',
    light: '#63a0db',
    dark: '#3a6590',
    glow: 'rgba(78, 131, 189, 0.5)'
  },
  'qa': {
    base: '#5a6978',
    light: '#6d7c8a',
    dark: '#464e59',
    glow: 'rgba(90, 105, 120, 0.5)'
  },
  'educational': {
    base: '#2c9287',
    light: '#3db3a6',
    dark: '#1f6e66',
    glow: 'rgba(44, 146, 135, 0.5)'
  },
  'storage': {
    base: '#bfb38b',
    light: '#d8cca3',
    dark: '#a59970',
    glow: 'rgba(191, 179, 139, 0.5)'
  },
  'boss': {
    base: '#cc4d4d',
    light: '#e05e5e',
    dark: '#a33c3c',
    glow: 'rgba(204, 77, 77, 0.5)'
  },
  'entrance': {
    base: '#4e83bd',
    light: '#63a0db',
    dark: '#3a6590',
    glow: 'rgba(78, 131, 189, 0.5)'
  },
  'kapoorCalibration': {
    base: '#4e83bd',
    light: '#63a0db',
    dark: '#3a6590',
    glow: 'rgba(78, 131, 189, 0.5)'
  },
  'boss-ionix': {
    base: '#cc4d4d',
    light: '#e05e5e',
    dark: '#a33c3c',
    glow: 'rgba(204, 77, 77, 0.5)'
  },
  'default': {
    base: '#6f78a3',
    light: '#8a92b8',
    dark: '#545d7e',
    glow: 'rgba(111, 120, 163, 0.5)'
  }
};

const EnhancedNode: React.FC<EnhancedNodeProps> = ({ 
  node, 
  state, 
  onClick, 
  onHover, 
  isSelected,
  tier,
  animationDelay = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const nodeRef = useRef<HTMLDivElement>(null);
  const { createStarburstEffect, createFloatingParticles, playSound } = useGameEffects();
  
  // Get colors based on node type
  const getNodeColors = () => {
    return NODE_COLORS[node.type as keyof typeof NODE_COLORS] || NODE_COLORS.default;
  };
  
  // Get icon based on node type
  const getNodeIcon = () => {
    return NODE_ICONS[node.type as keyof typeof NODE_ICONS] || NODE_ICONS.default;
  };
  
  // Reveal animation with delay based on tier
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 500 + animationDelay * 1000);
    
    return () => clearTimeout(timer);
  }, [animationDelay]);
  
  // Particle effect system
  useEffect(() => {
    if (!nodeRef.current) return;
    
    // Ambient particles for special nodes
    if (isRevealed && (state === 'active' || state === 'accessible')) {
      const interval = setInterval(() => {
        if (nodeRef.current && Math.random() < 0.3) {
          const rect = nodeRef.current.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          createFloatingParticles(x, y, 1);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isRevealed, state, createFloatingParticles]);
  
  // Handle node hover effects
  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover(node.id);
    
    // Only play sound for interactive nodes
    if (state === 'accessible' || state === 'active') {
      playSound('hover');
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover(null);
  };
  
  // Handle click with appropriate feedback
  const handleClick = () => {
    // Only allow interaction with accessible or active nodes
    if (state === 'accessible' || state === 'active') {
      onClick();
      
      // Create visual effect at node position
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        createStarburstEffect(x, y);
      }
    }
  };
  
  // Determine appropriate node styles based on state
  const getNodeClassNames = () => {
    const colors = getNodeColors();
    let classes = 'enhanced-node ';
    
    switch(state) {
      case 'active':
        classes += 'node-active ';
        break;
      case 'completed':
        classes += 'node-completed ';
        break;
      case 'accessible':
        classes += 'node-accessible ';
        break;
      case 'future':
        classes += 'node-future ';
        break;
      case 'locked':
        classes += 'node-locked ';
        break;
    }
    
    if (isHovered) classes += 'node-hovered ';
    if (isSelected) classes += 'node-selected ';
    if (isRevealed) classes += 'node-revealed ';
    
    return classes;
  };
  
  // Create orbital particles for active/accessible nodes
  const renderOrbitalParticles = () => {
    if (state !== 'active' && state !== 'accessible') return null;
    
    return (
      <>
        <div className="orbital-particle orbital-1"></div>
        <div className="orbital-particle orbital-2"></div>
      </>
    );
  };
  
  // Get appropriate node icon and overlay elements
  const renderNodeContent = () => {
    const colors = getNodeColors();
    
    return (
      <>
        {/* Node background and effects */}
        <div 
          className="node-background"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${colors.light}, ${colors.base} 50%, ${colors.dark})`
          }}
        ></div>
        
        {/* Node glow effect */}
        <div 
          className="node-glow"
          style={{
            boxShadow: `0 0 15px ${colors.glow}`
          }}
        ></div>
        
        {/* Node border */}
        <div 
          className="node-border"
          style={{
            borderColor: colors.base
          }}
        ></div>
        
        {/* Node icon */}
        <div className="node-icon">
          <img 
            src={getNodeIcon()} 
            alt={node.type} 
            className="pixel-art-sprite"
          />
        </div>
        
        {/* Reward indicator */}
        {node.insightReward && (
          <div className="node-reward">+{node.insightReward}</div>
        )}
        
        {/* Orbital particles for active/accessible nodes */}
        {renderOrbitalParticles()}
        
        {/* Node overlay for locked/future states */}
        {(state === 'locked' || state === 'future') && (
          <div className="node-overlay"></div>
        )}
        
        {/* Node title tooltip */}
        <div className="node-title">{node.title}</div>
      </>
    );
  };
  
  // Render appropriate completion indicator
  const renderCompletionIndicator = () => {
    if (state !== 'completed') return null;
    
    return (
      <div className="completion-indicator">✓</div>
    );
  };
  
  return (
    <div
      ref={nodeRef}
      className={getNodeClassNames()}
      data-node-id={node.id}
      data-node-type={node.type}
      data-node-state={state}
      data-tier={tier}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        animationDelay: `${animationDelay}s`
      }}
    >
      <div className="node-container">
        {renderNodeContent()}
      </div>
      {renderCompletionIndicator()}
      
      {/* Optional selection indicator */}
      {isSelected && <div className="selection-indicator"></div>}
    </div>
  );
};

export default EnhancedNode;