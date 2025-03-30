// app/components/NodeComponent.tsx
import { useState, useEffect } from 'react';
import { Node } from '../types/map';

// Enhanced color palette with primary and secondary colors for each node type
const nodeColors = {
  clinical: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-700',
    ring: 'ring-blue-300',
    glow: '#3B82F6',
    icon: '🏥'
  },
  qa: {
    primary: 'bg-gray-500',
    secondary: 'bg-gray-700',
    ring: 'ring-gray-300',
    glow: '#6B7280',
    icon: '🔍'
  },
  educational: {
    primary: 'bg-green-500',
    secondary: 'bg-green-700',
    ring: 'ring-green-300',
    glow: '#10B981',
    icon: '📚'
  },
  storage: {
    primary: 'bg-amber-500',
    secondary: 'bg-amber-700',
    ring: 'ring-amber-300',
    glow: '#F59E0B',
    icon: '📦'
  },
  vendor: {
    primary: 'bg-indigo-500',
    secondary: 'bg-indigo-700',
    ring: 'ring-indigo-300',
    glow: '#6366F1',
    icon: '🛒'
  },
  boss: {
    primary: 'bg-red-500',
    secondary: 'bg-red-700',
    ring: 'ring-red-300',
    glow: '#EF4444',
    icon: '⚠️'
  },
};

// Completed node colors
const completedColors = {
  primary: 'bg-green-500',
  secondary: 'bg-green-700',
  ring: 'ring-green-300',
  glow: '#10B981',
  icon: '✓', // Add icon property to match the nodeColors structure
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
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Log state for debugging
  useEffect(() => {
    if (isCompleted) {
      console.log(`Node ${node.id} (${node.type}) is completed`);
    }
    if (isAvailable) {
      console.log(`Node ${node.id} (${node.type}) is available`);
    }
  }, [isCompleted, isAvailable, node.id, node.type]);
  
  // Pulse animation when a node becomes available
  useEffect(() => {
    if (isAvailable && !isCompleted && !isPulsing) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAvailable, isCompleted, isPulsing]);

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
          className={`absolute rounded-full opacity-20 transition-all duration-300 ${isPulsing ? 'animate-pulse' : ''}`}
          style={{
            left: `${node.position.x * 150 + 12}px`,
            top: `${node.position.y * 100 + 12}px`,
            width: '76px',
            height: '76px',
            background: `radial-gradient(circle, ${nodeStyle.glow} 0%, transparent 70%)`,
            transform: isHovered ? 'scale(1.5)' : 'scale(1.2)',
            zIndex: 0
          }}
        ></div>
      )}
    
      {/* Main node */}
      <div
        {...dataAttributes}
        className={`
          absolute w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200
          ${isCompleted ? 'bg-green-500' : nodeStyle.primary}
          ${isAvailable && !isCompleted ? 'cursor-pointer' : 'cursor-default'}
          ${isAvailable && !isCompleted ? 'ring-4 ring-yellow-300' : ''}
          ${isSelected ? 'ring-4 ring-white' : ''}
          ${!isAvailable && !isCompleted ? 'opacity-50 grayscale' : ''}
          ${isHovered && isAvailable ? 'transform scale-110 shadow-lg' : ''}
          ${isPulsing && isAvailable ? 'animate-pulse' : ''}
        `}
        style={{
          left: `${node.position.x * 150}px`,
          top: `${node.position.y * 100}px`,
          boxShadow: isHovered && isAvailable ? `0 0 15px ${nodeStyle.glow}` : 'none',
          zIndex: isHovered || isSelected ? 20 : 10
        }}
        onClick={isAvailable ? onClick : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={`
          absolute inset-0 rounded-full 
          ${isCompleted ? 'bg-green-700' : nodeStyle.secondary}
          transform scale-90
        `}></div>
        
        <div className="flex flex-col items-center">
          <span className="text-2xl mb-1">{isCompleted ? '✓' : nodeStyle.icon}</span>
          <span className="text-white font-bold text-sm">
            {node.type === 'boss' ? 'IONIX' : node.type.charAt(0).toUpperCase() + node.type.slice(1)}
          </span>
        </div>
        
        {/* Completion checkmark - more prominent */}
        {isCompleted && (
          <div className="absolute -top-2 -right-2 bg-green-500 rounded-full w-8 h-8 flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute z-30 bg-gray-800 text-white p-3 rounded shadow-lg max-w-xs"
          style={{
            left: `${node.position.x * 150 + 60}px`,
            top: `${node.position.y * 100 - 30}px`,
          }}>
          <div className="font-bold mb-1">
            {node.type === 'boss' ? 'IONIX Encounter' : `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node`}
          </div>
          <p className="text-sm">{nodeDescriptions[node.type]}</p>
          {isCompleted && <p className="text-green-400 text-xs mt-1">✓ Completed</p>}
          {!isAvailable && !isCompleted && <p className="text-red-400 text-xs mt-1">🔒 Locked</p>}
        </div>
      )}
    </>
  );
}