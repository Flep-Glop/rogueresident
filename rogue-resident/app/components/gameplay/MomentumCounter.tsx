// app/components/gameplay/MomentumCounter.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore, MAX_MOMENTUM_LEVEL } from '../../store/resourceStore';

interface MomentumCounterProps {
  showLabel?: boolean;
  className?: string;
  compact?: boolean;
  level?: number;
  // Optional override for displaying specific level
  consecutiveCorrect?: number;
  // Optional consecutive counter
}

/**
 * Momentum Counter Component - Enhanced with Juice!
 *
 * Visual representation of player's momentum level, inspired by resource
 * meters in roguelites like Hades.
 * Shows pips that fill up as the player
 * builds momentum with correct answers.
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
  // **NEW**: State to track momentum changes for animation
  const [momentumChanged, setMomentumChanged] = useState<'gain' | 'loss' | null>(null);
  const [prevMomentum, setPrevMomentum] = useState(momentum);

  // **NEW**: Detect momentum changes for animations
  useEffect(() => {
    if (momentum > prevMomentum) {
      setMomentumChanged('gain');
    } else if (momentum < prevMomentum) {
      setMomentumChanged('loss');
    }
    // Reset after a short delay
    const timer = setTimeout(() => setMomentumChanged(null), 500);
    setPrevMomentum(momentum); // Update previous momentum
    return () => clearTimeout(timer);
  }, [momentum, prevMomentum]);


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
  const nextLevelThreshold = momentum < MAX_MOMENTUM_LEVEL ?
  (momentum + 1) * 2 : Infinity;
  const progressToNextLevel = momentum < MAX_MOMENTUM_LEVEL
    ?
  (consecutiveCorrect % 2) / 2 // 0 or 0.5
    : 0;
  // Get color intensity based on momentum level
  const getMomentumColor = (level: number) => {
    if (level === 0) return { bg: 'bg-gray-800', border: 'border-gray-700', pulse: 'rgba(255, 140, 0, 0.3)', text: 'text-gray-400' };
  if (level === 1) return { bg: 'bg-orange-900', border: 'border-orange-800', pulse: 'rgba(255, 140, 0, 0.4)', text: 'text-orange-300' };
  if (level === 2) return { bg: 'bg-orange-700', border: 'border-orange-600', pulse: 'rgba(255, 140, 0, 0.5)', text: 'text-orange-200' };
  return { bg: 'bg-orange-500', border: 'border-orange-400', pulse: 'rgba(255, 140, 0, 0.7)', text: 'text-orange-100' };
  };
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <div className={`font-pixel ${compact ? 'text-sm' : 'text-base'} text-orange-300`}>
            {compact ? 'MOM' : 'MOMENTUM'} {/* Shorten label in compact */}
          </div>
        )}

        {/* Show consecutive correct count */}
         {!compact && (
          <AnimatePresence mode="wait">
            <motion.div
              key={consecutiveCorrect}
              className="ml-2 font-pixel text-sm text-orange-300/80 tabular-nums"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1,
  y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {consecutiveCorrect > 0 ? `${consecutiveCorrect}×` : ''}
            </motion.div>
          </AnimatePresence>
        )}

        {/*
  "Max" indicator when at max momentum */}
        {momentum === MAX_MOMENTUM_LEVEL && !compact && (
          <motion.div
            className="ml-auto font-pixel text-sm text-orange-300 font-bold animate-pulse-strong" // **NEW**: Added strong pulse animation class
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.7, 1, 0.7],
         transition: { repeat: Infinity, duration: 1.5 }
            }}
          >
            MAX! {/* **NEW**: Added exclamation */}
          </motion.div>
        )}
      </div>

      {/* Render momentum pips with improved visual design */}
      <div className="flex space-x-2 items-center">
         {momentumPips.map((filled, index) => {
          const colors = getMomentumColor(filled ?
  index + 1 : 0);

          return (
            <motion.div // **NEW**: Wrap pip in motion.div
              key={`pip-${index}`}
              className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full
                ${filled ? colors.bg : 'bg-gray-900'}
                border-2 ${filled ? colors.border : 'border-gray-800'}

                 ${filled && index === MAX_MOMENTUM_LEVEL - 1 ? 'animate-pulse' : ''}`}
              style={{
                boxShadow: filled ? `0 0 8px ${colors.pulse}` : 'none',
                transition: 'all 0.3s ease-in-out'
              }}
              // **NEW**: Add animation based on momentum change
              initial={{ scale: 1 }}
              animate={{
                scale: momentumChanged === 'gain' && index === momentum - 1 ? [1, 1.3, 1] : // Scale pulse on gain
                       momentumChanged === 'loss' && index === momentum ? [1, 0.7, 1] : // Scale down on loss
                       1,
              }}
              transition={{ duration: 0.3 }}
           >
              {/* Inner texture for filled pips */}
              {filled && (
                <div
                  className="absolute inset-0 rounded-full opacity-70"

  style={{
                    backgroundImage: index === 2
                      ? `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='4' y='0' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='0' y='4' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23ea580c'/%3E%3C/svg%3E")`

       : index === 1
                      ?

  `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ea580c'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ea580c'/%3E%3C/svg%3E")`
                      : `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23ea580c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23f97316'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23f97316'/%3E%3C/svg%3E")`,
                    backgroundSize: index === 2 ?
  '6px 6px' : '4px 4px',
                    imageRendering: 'pixelated'
                  }}
                />
              )}


   {/* Central highlight dot */}
              {filled && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full opacity-80"></div>
              )}

              {/* Partial fill for pip in progress */}

              {!filled && index === momentum && progressToNextLevel > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-orange-800/60 rounded-b-full"
                  style={{

  height: `${progressToNextLevel * 100}%`,
                    borderBottomLeftRadius: '100%',
                    borderBottomRightRadius: '100%',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='2' height='2' viewBox='0 0 2 2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='2' height='2' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ea580c'/%3E%3C/svg%3E")`,

     backgroundSize: '2px 2px',
                    imageRendering: 'pixelated'
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
                      repeat: momentumEffect.intensity === 'high' ?
  2 : 1
                    }
                  }}
                />
              )}

              {/* Level
  indicator */}
              {filled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${colors.text} font-pixel`}> {/* **NEW**: Dynamic text color */}
                    {index + 1}

  </span>
                </div>
              )}
            </motion.div> // End motion.div wrapper
          );
  })}
      </div>

      {/* Status messages below the counter */}
      <AnimatePresence>
        {momentum > 0 && momentum < MAX_MOMENTUM_LEVEL && (
          <motion.div
            className="mt-1 text-xs font-pixel text-orange-300/80"
            initial={{ opacity: 0, height: 0 }}

  animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {momentum === 1 && "Building momentum..."}
            {momentum === 2 && "High momentum!"}
          </motion.div>
        )}
      </AnimatePresence>


     {/* Special notification for max momentum */}
      <AnimatePresence>
        {momentum === MAX_MOMENTUM_LEVEL && (
          <motion.div
            className="mt-1 text-xs font-pixel text-orange-300 font-bold"
            initial={{ opacity: 0, y: -5 }}
            animate={{
              opacity: 1,

               y: 0,
              transition: { type: 'spring', damping: 10 }
            }}
            exit={{ opacity: 0, y: 5 }}
          >
            {/* **NEW**: More exciting text */}
            MAX MOMENTUM! EXTRAPOLATE Unlocked!
  </motion.div>
        )}
      </AnimatePresence>

      {/* **NEW**: Momentum break effect overlay */}
      <AnimatePresence>
          {momentumChanged === 'loss' && (
              <motion.div
                  className="absolute inset-0 bg-red-700/30 backdrop-blur-sm z-10 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0], transition: { duration: 0.6 } }}
                  exit={{ opacity: 0 }}
              >
                  <motion.div
                      className="text-red-200 text-2xl font-pixel font-bold animate-shake-strong" // Use strong shake
                      initial={{ scale: 0.5 }}
                      animate={{ scale: [1, 1.1, 1], transition: { duration: 0.4 } }}
                  >
                      MOMENTUM BROKEN!
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
 }