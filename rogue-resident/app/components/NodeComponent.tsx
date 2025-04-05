// app/components/NodeComponent.tsx
import { useEffect, useState, useRef } from 'react';
import { Node } from '../types/map';
import Image from 'next/image';
import { 
  dispatchUIEvent, 
  playSoundEffect,
  flashScreen 
} from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';
import { useGameEffects } from './GameEffects';

interface NodeComponentProps {
  node: Node;
  isAvailable: boolean;
  isCompleted: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  revealMode?: boolean; // Prop to toggle enhanced visibility
}

export default function NodeComponent({
  node,
  isAvailable,
  isCompleted,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  revealMode = false,
}: NodeComponentProps) {
  // Add state for animation
  const [animating, setAnimating] = useState<boolean>(false);
  const [hasGlowEffect, setHasGlowEffect] = useState<boolean>(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const { playSound } = useGameEffects();
  
  // Initialize glow effect once component renders
  useEffect(() => {
    // Add slight delay for better entrance effect
    const timer = setTimeout(() => {
      setHasGlowEffect(true);
    }, Math.random() * 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Apply visual enhancements when node becomes available or selected
  useEffect(() => {
    if (isAvailable || isSelected) {
      const nodeElement = nodeRef.current;
      if (nodeElement) {
        nodeElement.animate(
          [
            { opacity: '0.7', transform: 'scale(0.95)' },
            { opacity: '1', transform: 'scale(1)' }
          ],
          { 
            duration: 600, 
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          }
        );
      }
    }
  }, [isAvailable, isSelected]);
  
  // Handle click with animation and sound
  const handleNodeClick = () => {
    // Skip if node isn't available or is already animating
    if ((!isAvailable && !revealMode) || animating || isSelected) {
      return;
    }
    
    // Start animation
    setAnimating(true);
    
    // Play sound effect through centralized system
    playSoundEffect('node_select');
    
    // Apply visual feedback
    const nodeElement = nodeRef.current;
    if (nodeElement) {
      nodeElement.animate(
        [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(1.2)', filter: 'brightness(1.3)' },
          { transform: 'scale(1)', filter: 'brightness(1)' }
        ],
        { 
          duration: 400, 
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        }
      );
    }
    
    // Small delay for animation to complete
    setTimeout(() => {
      // Dispatch node selection event through central event bus
      dispatchUIEvent('mapNode', 'node-click', {
        nodeId: node.id,
        nodeType: node.type,
        position: nodeElement?.getBoundingClientRect() || null
      });
      
      // Call the parent's onClick handler
      onClick();
      
      // Reset animation states
      setAnimating(false);
    }, 300);
  };
  
  // Handle mouse enter with event emission
  const handleMouseEnter = () => {
    // Emit node hover event
    dispatchUIEvent('mapNode', 'node-hover', {
      nodeId: node.id,
      nodeType: node.type,
      state: isCompleted ? 'completed' : isAvailable ? 'available' : 'locked'
    });
    
    // Call the parent's onMouseEnter handler
    onMouseEnter();
  };
  
  // Handle mouse leave with event emission
  const handleMouseLeave = () => {
    // Emit node hover end event
    dispatchUIEvent('mapNode', 'node-hover-end', {
      nodeId: node.id
    });
    
    // Call the parent's onMouseLeave handler
    onMouseLeave();
  };
  
  // Get node icon path based on type
  const getNodeIconPath = () => {
    switch (node.type) {
      case 'clinical':
        return '/node-icons/clinical-node.png';
      case 'qa':
        return '/node-icons/qa-node.png';
      case 'educational':
        return '/node-icons/educational-node.png';
      case 'storage':
        return '/node-icons/storage-node.png';
      case 'vendor':
        return '/node-icons/vendor-node.png';
      case 'boss':
      case 'boss-ionix':
        return '/node-icons/boss-node.png';
      case 'qualification':
        return '/node-icons/qualification-node.png';
      case 'kapoorCalibration':
        return '/node-icons/calibration-node.png';
      default:
        return '/node-icons/default-node.png';
    }
  };
  
  // Get glow color based on node type
  const getGlowColor = () => {
    if (isCompleted) {
      return 'rgba(78, 158, 106, 0.7)'; // Success/Green color
    }
    
    switch(node.type) {
      case 'clinical':
        return 'rgba(78, 131, 189, 0.7)'; // Blue
      case 'qa':
        return 'rgba(90, 105, 120, 0.7)'; // Gray-blue
      case 'educational':
        return 'rgba(44, 146, 135, 0.7)'; // Teal
      case 'storage':
        return 'rgba(191, 179, 139, 0.7)'; // Tan
      case 'vendor':
        return 'rgba(50, 63, 79, 0.7)'; // Dark blue
      case 'qualification':
        return 'rgba(239, 164, 58, 0.7)'; // Orange
      case 'boss':
      case 'boss-ionix':
        return 'rgba(204, 77, 77, 0.7)'; // Red
      case 'kapoorCalibration':
        return 'rgba(51, 163, 220, 0.7)'; // Bright blue
      default:
        return 'rgba(255, 255, 255, 0.7)'; // White
    }
  };
  
  // Get shadow color based on node type
  const getShadowColor = () => {
    switch(node.type) {
      case 'clinical':
        return 'rgba(78, 131, 189, 0.3)'; // Blue
      case 'qa':
        return 'rgba(90, 105, 120, 0.3)'; // Gray-blue
      case 'educational':
        return 'rgba(44, 146, 135, 0.3)'; // Teal
      case 'storage':
        return 'rgba(191, 179, 139, 0.3)'; // Tan
      case 'boss':
      case 'boss-ionix':
        return 'rgba(204, 77, 77, 0.3)'; // Red
      case 'qualification':
        return 'rgba(239, 164, 58, 0.3)'; // Orange
      case 'kapoorCalibration':
        return 'rgba(51, 163, 220, 0.3)'; // Bright blue
      default:
        return 'rgba(255, 255, 255, 0.2)'; // White
    }
  };
  
  // Node descriptions for tooltip
  const nodeDescriptions = {
    clinical: 'Clinical Scenario: Apply your medical physics knowledge to patient cases',
    qa: 'Quality Assurance: Calibrate and test important medical equipment',
    educational: 'Educational Challenge: Test your ability to explain complex concepts',
    storage: 'Storage Closet: Find useful items to aid your journey',
    vendor: 'Vendor Showcase: Purchase specialized equipment',
    boss: 'Critical Challenge: A major test of your medical physics knowledge',
    'boss-ionix': 'IONIX: The experimental ion chamber has developed a quantum consciousness',
    qualification: 'Qualification Challenge: Prove your readiness for the upcoming boss encounter',
    kapoorCalibration: 'Calibration: Work with Dr. Kapoor to calibrate essential medical equipment',
    experimental: 'Experimental: High-risk, high-reward challenges for the adventurous',
    entrance: 'Starting Point: Begin your journey here',
  };
  
  // Dynamic styles based on node state
  const getNodeStyles = () => {
    // Adjust visibility based on available state and reveal mode
    let opacity = isAvailable || isCompleted || isSelected ? 1 : 
                 revealMode ? 0.7 : 0.4;
    
    let scale = isSelected ? 1.1 : 
               isHovered ? 1.05 : 1;
               
    let filter = isAvailable || isCompleted || isSelected ? 'none' : 
                revealMode ? 'grayscale(0.5)' : 'grayscale(1)';
                
    let brightness = isSelected ? 'brightness(1.2)' :
                   isHovered ? 'brightness(1.1)' : 'brightness(1)';
                   
    // Combine filters
    filter = `${filter} ${brightness}`;
    
    let cursor = (isAvailable || isSelected || revealMode) ? 'pointer' : 'default';
    
    // Particle effects for active nodes
    let particles = (isSelected || isHovered) && (isAvailable || isCompleted);
    
    return {
      opacity,
      scale,
      filter,
      cursor,
      particles
    };
  };
  
  // Generate node style
  const nodeStyles = getNodeStyles();
  
  // Add data attributes for debug purposes
  const dataAttributes = {
    'data-node-id': node.id,
    'data-node-type': node.type,
    'data-completed': isCompleted ? 'true' : 'false',
    'data-available': isAvailable ? 'true' : 'false',
    'data-selected': isSelected ? 'true' : 'false',
    'data-reveal-mode': revealMode ? 'true' : 'false',
  };
  
  return (
    <>
      {/* Main node component */}
      <div
        ref={nodeRef}
        id={`node-${node.id}`}
        {...dataAttributes}
        className={`
          relative
          transition-all duration-300
          ${isAvailable || revealMode ? 'cursor-pointer' : 'cursor-default'}
          ${animating ? 'animate-node-pulse' : ''}
        `}
        style={{
          opacity: nodeStyles.opacity,
          transform: `scale(${nodeStyles.scale})`,
          filter: nodeStyles.filter,
          cursor: nodeStyles.cursor,
        }}
        onClick={handleNodeClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Shadow effect under node */}
        <div 
          className="absolute inset-0 rounded-full -z-10 blur-md transition-opacity duration-500"
          style={{ 
            backgroundColor: getShadowColor(),
            opacity: hasGlowEffect ? (isSelected || isHovered ? 0.8 : 0.4) : 0,
            transform: 'scale(1.2) translateY(4px)',
          }}
        />
      
        {/* Glow effect - positioned behind the node */}
        <div
          className={`
            absolute inset-0 rounded-full
            transition-all duration-300
          `}
          style={{
            backgroundColor: getGlowColor(),
            filter: `blur(${isHovered || isSelected ? '8px' : '6px'})`,
            opacity: hasGlowEffect ? (isSelected || isHovered ? 1 : 0.7) : 0,
            transform: 'scale(1.4)',
            zIndex: 0
          }}
        ></div>
        
        {/* Orbital particle effect for selected/hovered nodes */}
        {nodeStyles.particles && (
          <div className="absolute inset-0 -z-10">
            <div className="orbital-particle orbital-1"></div>
            <div className="orbital-particle orbital-2"></div>
          </div>
        )}
        
        {/* Node Icon */}
        <div className="relative w-12 h-12 z-10">
          <div 
            className={`
              w-12 h-12 rounded-full bg-gray-900 border-2 overflow-hidden
              ${isSelected ? 'border-white' : isCompleted ? 'border-success' : `border-${node.type}`}
              transition-colors duration-300 flex items-center justify-center
            `}
            style={{
              borderColor: getGlowColor().replace('0.7', '0.9'),
              boxShadow: isSelected || isHovered 
                ? `0 0 10px ${getGlowColor()}`
                : 'none'
            }}
          >
            <Image
              src={getNodeIconPath()}
              alt={`${node.type} node`}
              width={36}
              height={36}
              className={`
                pixel-art
                ${isCompleted ? 'brightness-110 contrast-125 saturate-150' : ''}
                ${isSelected ? 'scale-110' : ''}
                transition-transform duration-200
              `}
            />
          </div>
          
          {/* Selection indicator */}
          {isSelected && (
            <div 
              className="absolute -inset-2 rounded-full animate-pulse"
              style={{ 
                border: `2px solid white`,
                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                zIndex: -1
              }}
            ></div>
          )}
        </div>
        
        {/* Node type indicator - small colored dot */}
        <div
          className="absolute -top-1 -right-1 rounded-full w-3 h-3 border border-white z-20"
          style={{ 
            backgroundColor: getGlowColor().replace('0.7', '1'),
            opacity: isCompleted ? 0 : 0.9,
          }}
        />
        
        {/* Completion checkmark - positioned as an overlay */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 bg-success w-5 h-5 flex items-center justify-center rounded-full border border-white z-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      {isHovered && (
        <div 
          className="absolute z-50 bg-dark-gray border border-gray-700 p-2 rounded-sm shadow-lg w-48 text-white font-pixel"
          style={{
            left: '24px',
            top: '-12px',
          }}
        >
          <div className="font-bold text-sm mb-1">
            {node.type === 'boss-ionix' ? 'IONIX Encounter' : 
             node.type === 'boss' ? 'Boss Encounter' :
             `${node.type.charAt(0).toUpperCase() + node.type.slice(1).replace(/([A-Z])/g, ' $1')} Node`}
          </div>
          <p className="text-xs text-gray-300">
            {nodeDescriptions[node.type] || `${node.type} node`}
          </p>
          {node.insightReward && (
            <p className="text-xs text-blue-300 mt-1">Reward: +{node.insightReward} Insight</p>
          )}
          {isCompleted && <p className="text-green-400 text-xs mt-1">✓ Completed</p>}
          {!isAvailable && !isCompleted && !revealMode && <p className="text-red-400 text-xs mt-1">🔒 Locked</p>}
          
          {/* Tooltip arrow */}
          <div 
            className="absolute w-2 h-2 bg-dark-gray transform rotate-45" 
            style={{
              left: '-4px',
              top: '15px',
              borderLeft: '1px solid',
              borderBottom: '1px solid',
              borderColor: '#374151'
            }}
          ></div>
        </div>
      )}
      
      {/* Add CSS for node animations and effects */}
      <style jsx>{`
        @keyframes node-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes orbital {
          0% { transform: rotate(0deg) translateX(16px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(16px) rotate(-360deg); }
        }
        
        @keyframes orbital-reverse {
          0% { transform: rotate(0deg) translateX(14px) rotate(0deg); }
          100% { transform: rotate(-360deg) translateX(14px) rotate(360deg); }
        }
        
        .orbital-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.8);
          top: 50%;
          left: 50%;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
        }
        
        .orbital-1 {
          animation: orbital 3s linear infinite;
        }
        
        .orbital-2 {
          animation: orbital-reverse 4s linear infinite;
        }
      `}</style>
    </>
  );
}