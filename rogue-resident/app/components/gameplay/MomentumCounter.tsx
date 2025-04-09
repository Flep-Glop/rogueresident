// app/components/gameplay/MomentumCounter.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore, MAX_MOMENTUM_LEVEL } from '../../store/resourceStore';

interface MomentumCounterProps {
  showLabel?: boolean;
  className?: string;
  compact?: boolean;
  level?: number; // Optional override for displaying specific level
  consecutiveCorrect?: number; // Optional consecutive counter
}

/**
 * Momentum Counter Component
 * 
 * Visual representation of player's momentum level, showing pips
 * that fill up as the player builds momentum with correct answers.
 */
export default function MomentumCounter({
  showLabel = true,
  className = '',
  compact = false,
  level: overrideLevel,
  consecutiveCorrect: overrideConsecutive
}: MomentumCounterProps) {
  // Get resource state, but allow override
  const { 
    momentum: storeMomentum, 
    consecutiveCorrect: storeConsecutive,
    momentumEffect
  } = useResourceStore();
  
  // Use override if provided, otherwise use store value
  const momentum = overrideLevel !== undefined ? overrideLevel : storeMomentum;
  const consecutiveCorrect = overrideConsecutive !== undefined ? overrideConsecutive : storeConsecutive;
  
  // Animation state
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Handle effect animations
  useEffect(() => {
    if (momentumEffect.active) {
      setPulseEffect(true);
      
      // Clear effect after animation
      const timer = setTimeout(() => {
        setPulseEffect(false);
      }, momentumEffect.duration);
      
      return () => clearTimeout(timer);
    }
  }, [momentumEffect]);
  
  // Create array of MAX_MOMENTUM_LEVEL length for rendering pips
  const momentumPips = Array.from({ length: MAX_MOMENTUM_LEVEL }, (_, i) => i < momentum);
  
  // Calculate progress to next level
  const nextLevelThreshold = momentum < MAX_MOMENTUM_LEVEL ? (momentum + 1) * 2 : Infinity;
  const progressToNextLevel = momentum < MAX_MOMENTUM_LEVEL 
    ? (consecutiveCorrect % 2) / 2 // 0 or 0.5
    : 0;
  
  return (
    <div className={`flex items-center ${className} ${compact ? 'space-x-2' : 'space-x-4'}`}>
      {showLabel && (
        <div className={`font-pixel ${compact ? 'text-sm' : 'text-base'} text-orange-300`}>
          {compact ? 'MOM.' : 'MOMENTUM'}
        </div>
      )}
      
      <div className="flex space-x-2">
        {/* Render momentum pips - 200% larger */}
        {momentumPips.map((filled, index) => (
          <div 
            key={`pip-${index}`}
            className={`relative ${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full border-2 ${
              filled 
                ? 'bg-orange-600 border-orange-400' 
                : 'bg-gray-900 border-gray-700'
            } ${index === MAX_MOMENTUM_LEVEL - 1 && filled ? 'animate-pulse' : ''}`}
          >
            {/* Partial fill for pip in progress */}
            {!filled && index === momentum && progressToNextLevel > 0 && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-orange-600/60 rounded-b-full"
                style={{ 
                  height: `${progressToNextLevel * 100}%`,
                  borderBottomLeftRadius: '100%',
                  borderBottomRightRadius: '100%'
                }}
                initial={{ height: 0 }}
                animate={{ 
                  height: `${progressToNextLevel * 100}%`,
                  transition: { type: 'spring', damping: 15 }
                }}
              />
            )}
            
            {/* Pulse effect for active pips */}
            {filled && pulseEffect && (
              <motion.div
                className="absolute inset-0 rounded-full bg-orange-500"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0.8, 1.2, 1.5],
                  transition: { 
                    duration: 0.8,
                    repeat: momentumEffect.intensity === 'high' ? 2 : 1
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Show consecutive correct count */}
      {!compact && (
        <AnimatePresence mode="wait">
          <motion.div 
            key={consecutiveCorrect}
            className="ml-2 font-pixel text-sm text-orange-300/80 tabular-nums"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            {consecutiveCorrect > 0 ? `${consecutiveCorrect}×` : ''}
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* "Max" indicator when at max momentum */}
      {momentum === MAX_MOMENTUM_LEVEL && !compact && (
        <motion.div 
          className="ml-2 font-pixel text-sm text-orange-300 font-bold"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.7, 1, 0.7],
            transition: { repeat: Infinity, duration: 1.5 }
          }}
        >
          MAX
        </motion.div>
      )}
      
      {/* Special notification for first momentum level */}
      <AnimatePresence>
        {momentum === 1 && consecutiveCorrect === 2 && !compact && (
          <motion.div
            className="absolute -bottom-6 left-0 right-0 text-center text-sm font-pixel text-orange-300"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.3 }}
          >
            Momentum gained!
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Special notification for max momentum */}
      <AnimatePresence>
        {momentum === MAX_MOMENTUM_LEVEL && consecutiveCorrect === MAX_MOMENTUM_LEVEL * 2 && !compact && (
          <motion.div
            className="absolute -bottom-6 left-0 right-0 text-center text-sm font-pixel text-orange-300 font-bold"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.3 }}
          >
            Maximum momentum!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}