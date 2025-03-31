// app/components/NodeComponent.tsx
import { useEffect, useState } from 'react';
import { Node } from '../types/map';
import Image from 'next/image';

interface NodeComponentProps {
  node: Node;
  isAvailable: boolean;
  isCompleted: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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
}: NodeComponentProps) {
  // Add state for animation
  const [animating, setAnimating] = useState<boolean>(false);
  
  // Sound effects enabled state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Load sound effects
  useEffect(() => {
    // Check if we're in a browser environment with audio support
    if (typeof window !== 'undefined' && 'Audio' in window) {
      // Pre-load sounds for faster playback
      const clickSound = new Audio('/sounds/node-select.mp3');
      clickSound.preload = 'auto';
      
      // Make sure to clean up
      return () => {
        clickSound.pause();
        clickSound.src = '';
      };
    }
  }, []);
  
  // Handle click with animation and sound
  const handleNodeClick = () => {
    // Skip if node isn't available or is already animating
    if (!isAvailable || animating || isSelected) {
      return;
    }
    
    // Start animation
    setAnimating(true);
    
    // Play sound effect
    if (soundEnabled) {
      try {
        const clickSound = new Audio('/sounds/node-select.mp3');
        clickSound.volume = 0.5;
        clickSound.play().catch(err => {
          console.log('Audio play failed:', err);
          // If audio fails, disable to avoid console spam
          setSoundEnabled(false);
        });
      } catch (error) {
        console.log('Sound not supported or file not found');
        setSoundEnabled(false);
      }
    }
    
    // Apply visual feedback
    const nodeElement = document.getElementById(`node-${node.id}`);
    if (nodeElement) {
      nodeElement.classList.add('node-pulse-animation');
    }
    
    // Small delay for animation to complete
    setTimeout(() => {
      // Log node selection
      console.log(`Selecting node: ${node.id} (type: ${node.type})`);
      
      // Call the parent's onClick handler
      onClick();
      
      // Reset animation states
      setAnimating(false);
      if (nodeElement) {
        nodeElement.classList.remove('node-pulse-animation');
      }
    }, 300);
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
        return '/node-icons/boss-node.png';
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
      case 'boss':
        return 'rgba(204, 77, 77, 0.7)'; // Red
      default:
        return 'rgba(255, 255, 255, 0.7)'; // White
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
  };
  
  // Add data attributes for debug purposes
  const dataAttributes = {
    'data-node-id': node.id,
    'data-node-type': node.type,
    'data-completed': isCompleted ? 'true' : 'false',
    'data-available': isAvailable ? 'true' : 'false',
  };
  
  return (
    <>
      {/* Node with glow effect */}
      <div
        id={`node-${node.id}`}
        {...dataAttributes}
        className={`
          relative
          ${isAvailable ? 'cursor-pointer' : 'cursor-default'}
          ${!isAvailable && !isCompleted ? 'opacity-50 grayscale' : ''}
          ${animating ? 'animate-node-pulse' : ''}
          transition-all duration-200
        `}
        onClick={() => isAvailable ? handleNodeClick() : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Glow effect - positioned behind the node */}
        <div
          className={`
            absolute inset-0 rounded-full
            ${isHovered || isSelected ? 'glow-strong' : 'glow'}
            ${isAvailable || isSelected || isHovered ? 'opacity-100' : 'opacity-0'}
            transition-all duration-300
          `}
          style={{
            backgroundColor: getGlowColor(),
            filter: `blur(${isHovered || isSelected ? '8px' : '6px'})`,
            transform: 'scale(1.4)',
            zIndex: 0
          }}
        ></div>
        
        {/* Node Icon */}
        <div className="relative w-12 h-12 z-10">
        <Image
          src={getNodeIconPath()}
          alt={`${node.type} node`}
          width={48}
          height={48}
          className={`
            pixel-art
            ${isCompleted ? 'brightness-110 contrast-125 saturate-150' : ''}
            ${isSelected ? 'scale-110' : ''}
            transition-transform duration-200
          `}
        />
          
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
            {node.type === 'boss' ? 'IONIX Encounter' : `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node`}
          </div>
          <p className="text-xs text-gray-300">{nodeDescriptions[node.type]}</p>
          {isCompleted && <p className="text-green-400 text-xs mt-1">✓ Completed</p>}
          {!isAvailable && !isCompleted && <p className="text-red-400 text-xs mt-1">🔒 Locked</p>}
          
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
        
        .animate-node-pulse {
          animation: node-pulse 0.3s ease-in-out;
        }
        
        .glow {
          opacity: 0.7;
          transition: all 0.3s ease;
        }
        
        .glow-strong {
          opacity: 1;
          transition: all 0.3s ease;
        }
        
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}