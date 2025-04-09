// app/components/gameplay/StrategicActions.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore } from '../../store/resourceStore';
import { PixelText } from '../PixelThemeProvider';

// Type definitions
type StrategicActionType = 'reframe' | 'extrapolate' | 'boast' | 'synthesis';

interface StrategicActionsProps {
  characterId: string;
  stageId: string;
  className?: string;
  onActionActivate?: (actionType: StrategicActionType) => void;
  onActionComplete?: (actionType: StrategicActionType, successful: boolean) => void;
  onActionCancel?: (actionType: StrategicActionType) => void;
}

/**
 * Strategic Actions Component
 * 
 * Control options that help shape dialogue flow using action icons
 */
export default function StrategicActions({
  characterId,
  stageId,
  className = '',
  onActionActivate,
  onActionComplete,
  onActionCancel
}: StrategicActionsProps) {
  // Track hover and expanded states
  const [hoveredAction, setHoveredAction] = useState<StrategicActionType | null>(null);
  
  // Access resource store for action availability
  const { availableActions, activeAction, insight } = useResourceStore();
  
  // Action definitions with metadata
  const actionDefinitions: Record<StrategicActionType, {
    label: string;
    description: string;
    cost: number;
    bgClass: string;
    borderClass: string;
    iconPath: string;
  }> = {
    reframe: {
      label: 'Reframe',
      description: 'Shift to more approachable topics',
      cost: 25,
      bgClass: 'bg-blue-800',
      borderClass: 'border-blue-900',
      iconPath: "M4,4 H12 M4,8 H12 M4,12 H10" // Simple text-line icon SVG path
    },
    extrapolate: {
      label: 'Extrapolate',
      description: 'Form connections between concepts',
      cost: 50,
      bgClass: 'bg-purple-800',
      borderClass: 'border-purple-900',
      iconPath: "M5,8 L8,5 M9,6 L12,3 M8,9 L11,6" // Connect-the-dots icon
    },
    boast: {
      label: 'Challenge',
      description: 'Demonstrate expert knowledge',
      cost: 0, // Uses momentum instead
      bgClass: 'bg-orange-700',
      borderClass: 'border-orange-800',
      iconPath: "M8,3 L12,7 L8,11 L4,7 Z" // Diamond shape
    },
    synthesis: {
      label: 'Synthesis',
      description: 'Discover new knowledge domains',
      cost: 75,
      bgClass: 'bg-green-700',
      borderClass: 'border-green-900',
      iconPath: "M4,5 H12 M4,8 H10 M4,11 H8" // Narrowing text lines
    }
  };
  
  // SVG icon component for pixel art icons
  const PixelIcon = ({ path, className = '' }: { path: string, className?: string }) => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      className={`stroke-white stroke-[1.5px] ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      <path d={path} strokeLinecap="square" />
    </svg>
  );
  
  // Button component for strategic actions
  const ActionButton = ({ 
    type, 
    isAvailable 
  }: { 
    type: StrategicActionType, 
    isAvailable: boolean 
  }) => {
    const def = actionDefinitions[type];
    const isActive = activeAction === type;
    const affordabilityClass = def.cost > 0 && insight < def.cost ? 'opacity-50' : '';
    
    return (
      <motion.button
        className={`
          w-16 h-16 relative 
          ${def.bgClass} ${def.borderClass}
          border-2 box-content
          flex items-center justify-center
          transition-colors duration-150
          ${isActive ? 'ring-1 ring-white' : ''}
          ${isAvailable ? '' : 'opacity-40'}
          ${affordabilityClass}
          pixel-borders
        `}
        disabled={!isAvailable || (def.cost > 0 && insight < def.cost)}
        onClick={() => isAvailable && onActionActivate && onActionActivate(type)}
        onMouseEnter={() => setHoveredAction(type)}
        onMouseLeave={() => setHoveredAction(null)}
        whileHover={{ y: isAvailable ? -2 : 0 }}
        whileTap={{ y: isAvailable ? 1 : 0 }}
        initial={{ scale: 1 }}
        animate={isActive ? { 
          scale: [1, 1.05, 1],
          transition: { repeat: Infinity, duration: 1.5 }
        } : { scale: 1 }}
      >
        <PixelIcon path={def.iconPath} className="w-8 h-8" />
        
        {/* Cost indicator */}
        {def.cost > 0 && (
          <div className="absolute -bottom-1 -right-1 text-sm bg-black/80 px-1 rounded-sm">
            {def.cost}◆
          </div>
        )}
        
        {/* Active indicator pulse */}
        {isActive && (
          <motion.div 
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0],
              transition: { repeat: Infinity, duration: 2 }
            }}
          />
        )}
        
        {/* Tooltip on hover */}
        <AnimatePresence>
          {hoveredAction === type && !isActive && (
            <motion.div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 z-50
                        bg-gray-900/95 border border-gray-700 pixel-borders-thin shadow-lg"
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="p-3">
                <div className="text-sm font-pixel text-white mb-1">{def.label}</div>
                <div className="text-xs text-gray-300">{def.description}</div>
                {def.cost > 0 ? (
                  <div className={`text-xs mt-1 ${insight >= def.cost ? 'text-blue-300' : 'text-red-300'}`}>
                    Cost: {def.cost} Insight
                  </div>
                ) : (
                  <div className="text-xs mt-1 text-orange-300">
                    Requires max momentum
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };
  
  // Render the action buttons with proper spacing
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {availableActions.reframe && <ActionButton type="reframe" isAvailable={availableActions.reframe} />}
      {availableActions.extrapolate && <ActionButton type="extrapolate" isAvailable={availableActions.extrapolate} />}
      {availableActions.synthesis && <ActionButton type="synthesis" isAvailable={availableActions.synthesis} />}
    </div>
  );
}

/**
 * Container version with expanded state support
 */
export function StrategicActionsContainer(props: StrategicActionsProps) {
  const { activeAction } = useResourceStore();
  
  return (
    <div className="relative">
      <StrategicActions {...props} />
      
      {/* Expanded state panel - shows when an action is active */}
      <AnimatePresence>
        {activeAction && (
          <motion.div
            className="absolute top-full right-0 mt-3 bg-gray-900/90 border border-gray-700 
                      pixel-borders shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="p-3 w-48">
              <PixelText className="text-sm mb-2 text-white">
                {activeAction === 'reframe' && 'Reframing Conversation'}
                {activeAction === 'extrapolate' && 'Extrapolating Connections'}
                {activeAction === 'boast' && 'Challenge Mode Active'}
                {activeAction === 'synthesis' && 'Synthesizing Knowledge'}
              </PixelText>
              
              <div className="text-xs text-gray-300">
                {activeAction === 'reframe' && 'Simpler topics now available.'}
                {activeAction === 'extrapolate' && 'Form connections between concepts.'}
                {activeAction === 'boast' && 'Expert-level questions with higher rewards.'}
                {activeAction === 'synthesis' && 'Discover new knowledge areas.'}
              </div>
              
              {/* Optional cancel button */}
              <button 
                className="mt-2 text-xs text-gray-400 hover:text-white"
                onClick={() => props.onActionCancel && props.onActionCancel(activeAction)}
              >
                Cancel (recover cost)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}