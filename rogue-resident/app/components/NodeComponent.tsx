// app/components/NodeComponent.tsx
import { useEffect } from 'react';
import { Node } from '../types/map';

// Enhanced color palette with primary and secondary colors for each node type
const nodeColors = {
  clinical: {
    primary: 'bg-clinical',
    secondary: 'bg-clinical-dark',
    border: 'border-clinical-light',
    glow: 'rgba(78, 131, 189, 0.6)',
    icon: '🏥'
  },
  qa: {
    primary: 'bg-qa',
    secondary: 'bg-qa-dark',
    border: 'border-qa-light',
    glow: 'rgba(90, 105, 120, 0.6)',
    icon: '🔍'
  },
  educational: {
    primary: 'bg-educational',
    secondary: 'bg-educational-dark',
    border: 'border-educational-light',
    glow: 'rgba(44, 146, 135, 0.6)',
    icon: '📚'
  },
  storage: {
    primary: 'bg-storage',
    secondary: 'bg-storage-dark',
    border: 'border-storage-light',
    glow: 'rgba(191, 179, 139, 0.6)',
    icon: '📦'
  },
  vendor: {
    primary: 'bg-vendor',
    secondary: 'bg-vendor-dark',
    border: 'border-vendor-light',
    glow: 'rgba(50, 63, 79, 0.6)',
    icon: '🛒'
  },
  boss: {
    primary: 'bg-boss',
    secondary: 'bg-boss-dark',
    border: 'border-boss-light',
    glow: 'rgba(204, 77, 77, 0.6)',
    icon: '⚠️'
  },
};

// Completed node colors
const completedColors = {
  primary: 'bg-success',
  secondary: 'bg-success-dark',
  border: 'border-success-light',
  glow: 'rgba(78, 158, 106, 0.6)',
  icon: '✓',
};

// Type descriptions for node tooltip
const nodeDescriptions = {
  clinical: 'Clinical Scenario: Apply your medical physics knowledge to patient cases',
  qa: 'Quality Assurance: Calibrate and test important medical equipment',
  educational: 'Educational Challenge: Test your ability to explain complex concepts',
  storage: 'Storage Closet: Find useful items to aid your journey',
  vendor: 'Vendor Showcase: Purchase specialized equipment',
  boss: 'Critical Challenge: A major test of your medical physics knowledge',
};

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
  // Get node style info - use completed style if completed
  const nodeStyle = isCompleted ? completedColors : nodeColors[node.type];
  
  // Add data attributes for debug purposes
  const dataAttributes = {
    'data-node-id': node.id,
    'data-node-type': node.type,
    'data-completed': isCompleted ? 'true' : 'false',
    'data-available': isAvailable ? 'true' : 'false',
  };
  
  return (
    <>
      {/* Node glow effect (rendered separately from node for layering) */}
      {(isAvailable || isSelected || isHovered) && (
        <div
          className={`absolute rounded-full opacity-30 transition-all duration-300 
            ${isHovered || isSelected ? 'node-glow-active' : 'node-glow'}`}
          style={{
            left: '-10px',
            top: '-10px',
            width: '70px',
            height: '70px',
            background: `radial-gradient(circle, ${nodeStyle.glow} 0%, transparent 70%)`,
            zIndex: 0
          }}
        ></div>
      )}
    
      {/* Main node */}
      <div
        {...dataAttributes}
        className={`
          w-12 h-12 rounded-full relative overflow-hidden
          ${isCompleted ? 'bg-success' : nodeStyle.primary}
          ${isAvailable && !isCompleted ? 'cursor-pointer' : 'cursor-default'}
          ${isAvailable && !isCompleted ? 'border-2 border-yellow-300' : 'border border-gray-700'}
          ${isSelected ? 'border-2 border-white' : ''}
          ${!isAvailable && !isCompleted ? 'opacity-50 grayscale' : ''}
          box-content
        `}
        onClick={isAvailable ? onClick : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Node pixel overlay effect */}
        <div className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
            backgroundSize: '4px 4px',
            backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0'
          }}
        ></div>
        
        {/* Node inner shadow for 3D effect */}
        <div className={`
          absolute inset-2 rounded-full 
          ${isCompleted ? 'bg-success-dark' : nodeStyle.secondary}
        `}></div>
        
        {/* Node icon and label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl text-white drop-shadow-md">{isCompleted ? '✓' : nodeStyle.icon}</div>
          {node.type === 'boss' && (
            <div className="text-xs text-white font-bold mt-1 font-pixel">IONIX</div>
          )}
        </div>
        
        {/* Completion checkmark */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 bg-success w-5 h-5 flex items-center justify-center rounded-full border border-white">
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
    </>
  );
}