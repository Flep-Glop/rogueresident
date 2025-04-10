// app/components/gameplay/MomentumCounter.tsx
'use client';
import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore } from '../../store/resourceStore';
import { usePrimitiveStoreValue } from '../../core/utils/storeHooks';

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
 * Momentum Counter Component - Enhanced with Pattern Implementation
 *
 * Refactored to use the "Chamber Transition Pattern":
 * - Primitive value extraction 
 * - CSS-driven animations
 * - DOM manipulation with refs
 */
export default function MomentumCounter({
  showLabel = true,
  className = '',
  compact = false,
  level: overrideLevel,
  consecutiveCorrect: overrideConsecutive
}: MomentumCounterProps) {
  // PATTERN: Extract primitive values using specialized hooks
  const storeMomentum = usePrimitiveStoreValue(useResourceStore, state => state.momentum, 0);
  const storeConsecutive = usePrimitiveStoreValue(useResourceStore, state => state.consecutiveCorrect, 0);
  const maxMomentum = usePrimitiveStoreValue(useResourceStore, state => state.maxMomentum, 3);
  
  // PATTERN: Extract effect data with stable reference
  const momentumEffect = usePrimitiveStoreValue(
    useResourceStore, 
    state => state.momentumEffect?.active, 
    false
  );
  const effectIntensity = usePrimitiveStoreValue(
    useResourceStore,
    state => state.momentumEffect?.intensity,
    'medium'
  );
  
  // Use override if provided, otherwise use store value
  const momentum = overrideLevel !== undefined ? overrideLevel : storeMomentum;
  const consecutiveCorrect = overrideConsecutive !== undefined ? overrideConsecutive : storeConsecutive;
  
  // Refs for DOM manipulation & animation tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const previousMomentumRef = useRef(momentum);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // PATTERN: Detect momentum changes via refs and effects
  useEffect(() => {
    const prevMomentum = previousMomentumRef.current;
    
    // Clear existing timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    
    if (momentum !== prevMomentum) {
      const momentumChange = momentum > prevMomentum ? 'gain' : 'loss';
      
      // Apply appropriate animation classes
      if (containerRef.current) {
        containerRef.current.setAttribute('data-momentum-change', momentumChange);
        
        // Get all momentum pips
        const pips = document.querySelectorAll('.momentum-pip');
        
        if (momentumChange === 'gain') {
          // Animate the newly gained pip
          const gainedPip = pips[momentum - 1];
          if (gainedPip) {
            gainedPip.classList.add('momentum-pip-gained');
            
            const clearTimer = setTimeout(() => {
              gainedPip.classList.remove('momentum-pip-gained');
            }, 500);
            timeoutRefs.current.push(clearTimer);
          }
        } else if (momentumChange === 'loss') {
          // Animate the lost pip
          const lostPip = pips[prevMomentum - 1];
          if (lostPip) {
            lostPip.classList.add('momentum-pip-lost');
            
            const clearTimer = setTimeout(() => {
              lostPip.classList.remove('momentum-pip-lost');
            }, 500);
            timeoutRefs.current.push(clearTimer);
          }
          
          // Show momentum break overlay
          const overlay = document.createElement('div');
          overlay.className = 'momentum-break-overlay';
          overlay.innerHTML = '<div class="momentum-break-text">MOMENTUM BROKEN!</div>';
          document.body.appendChild(overlay);
          
          const clearOverlay = setTimeout(() => {
            document.body.removeChild(overlay);
          }, 800);
          timeoutRefs.current.push(clearOverlay);
        }
        
        // Reset change attribute after animation
        const resetTimer = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.removeAttribute('data-momentum-change');
          }
        }, 500);
        timeoutRefs.current.push(resetTimer);
      }
    }
    
    // Update ref for next comparison
    previousMomentumRef.current = momentum;
    
    // Cleanup
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [momentum]);
  
  // PATTERN: Handle effect animations with DOM manipulation
  useEffect(() => {
    if (momentumEffect) {
      // Add pulse effect to all filled pips
      document.querySelectorAll('.momentum-pip-filled').forEach(pip => {
        pip.classList.add('momentum-pip-pulse');
        
        const clearTimer = setTimeout(() => {
          pip.classList.remove('momentum-pip-pulse');
        }, effectIntensity === 'high' ? 1600 : 800);
        timeoutRefs.current.push(clearTimer);
      });
    }
    
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [momentumEffect, effectIntensity]);
  
  // PATTERN: Create momentum pips array once per render
  const momentumPips = useMemo(() => 
    Array.from({ length: maxMomentum }, (_, i) => i < momentum),
  [momentum, maxMomentum]);
  
  // PATTERN: Calculate progress to next level once per render
  const progressToNextLevel = useMemo(() => {
    const nextLevelThreshold = momentum < maxMomentum ? (momentum + 1) * 2 : Infinity;
    return momentum < maxMomentum ? (consecutiveCorrect % 2) / 2 : 0; // 0 or 0.5
  }, [momentum, maxMomentum, consecutiveCorrect]);
  
  // PATTERN: Memoize color generation function
  const getMomentumColor = useMemo(() => (level: number) => {
    if (level === 0) return { bg: 'bg-gray-800', border: 'border-gray-700', pulse: 'rgba(255, 140, 0, 0.3)', text: 'text-gray-400' };
    if (level === 1) return { bg: 'bg-orange-900', border: 'border-orange-800', pulse: 'rgba(255, 140, 0, 0.4)', text: 'text-orange-300' };
    if (level === 2) return { bg: 'bg-orange-700', border: 'border-orange-600', pulse: 'rgba(255, 140, 0, 0.5)', text: 'text-orange-200' };
    return { bg: 'bg-orange-500', border: 'border-orange-400', pulse: 'rgba(255, 140, 0, 0.7)', text: 'text-orange-100' };
  }, []);
  
  return (
    <div className={`${className} relative`} ref={containerRef}>
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
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {consecutiveCorrect > 0 ? `${consecutiveCorrect}×` : ''}
            </motion.div>
          </AnimatePresence>
        )}

        {/* "Max" indicator when at max momentum */}
        {momentum === maxMomentum && !compact && (
          <div className="momentum-max-indicator ml-auto font-pixel text-sm text-orange-300 font-bold">
            MAX!
          </div>
        )}
      </div>

      {/* Render momentum pips with improved visual design */}
      <div className="flex space-x-2 items-center">
        {momentumPips.map((filled, index) => {
          const colors = getMomentumColor(filled ? index + 1 : 0);
          const isHighestPip = filled && index === maxMomentum - 1;

          return (
            <div
              key={`pip-${index}`}
              className={`
                relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full
                ${filled ? `${colors.bg} momentum-pip-filled` : 'bg-gray-900 momentum-pip-empty'}
                border-2 ${filled ? colors.border : 'border-gray-800'}
                momentum-pip
                ${isHighestPip ? 'momentum-pip-max' : ''}
              `}
              style={{
                boxShadow: filled ? `0 0 8px ${colors.pulse}` : 'none',
              }}
            >
              {/* Inner texture for filled pips */}
              {filled && (
                <div
                  className="absolute inset-0 rounded-full opacity-70 momentum-pip-texture"
                  data-level={index + 1}
                />
              )}

              {/* Central highlight dot */}
              {filled && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full opacity-80"></div>
              )}

              {/* Partial fill for pip in progress */}
              {!filled && index === momentum && progressToNextLevel > 0 && (
                <div
                  className="momentum-pip-progress absolute bottom-0 left-0 right-0 bg-orange-800/60 rounded-b-full"
                  style={{
                    height: `${progressToNextLevel * 100}%`,
                  }}
                />
              )}

              {/* Level indicator */}
              {filled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${colors.text} font-pixel`}>
                    {index + 1}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status messages below the counter */}
      <AnimatePresence>
        {momentum > 0 && momentum < maxMomentum && (
          <motion.div
            key={`status-${momentum}`}
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
        {momentum === maxMomentum && (
          <motion.div
            key="max-momentum"
            className="mt-1 text-xs font-pixel text-orange-300 font-bold"
            initial={{ opacity: 0, y: -5 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { type: 'spring', damping: 10 }
            }}
            exit={{ opacity: 0, y: 5 }}
          >
            MAX MOMENTUM! EXTRAPOLATE Unlocked!
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animations */}
      <style jsx>{`
        /* Animation for pip gain */
        @keyframes pip-gain-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        
        /* Animation for pip loss */
        @keyframes pip-loss-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.7); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Animation for pip pulse effect */
        @keyframes pip-effect-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); box-shadow: 0 0 12px currentColor; }
        }
        
        /* Animation for max momentum indicator */
        @keyframes max-indicator-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        /* Animation for pip progress */
        @keyframes progress-wave {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }
        
        /* Pip textures */
        .momentum-pip-texture[data-level="1"] {
          background-image: url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23ea580c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23f97316'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23f97316'/%3E%3C/svg%3E");
          background-size: 4px 4px;
          image-rendering: pixelated;
        }
        
        .momentum-pip-texture[data-level="2"] {
          background-image: url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ea580c'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ea580c'/%3E%3C/svg%3E");
          background-size: 4px 4px;
          image-rendering: pixelated;
        }
        
        .momentum-pip-texture[data-level="3"] {
          background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='4' y='0' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='0' y='4' width='2' height='2' fill='%23ea580c'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23ea580c'/%3E%3C/svg%3E");
          background-size: 6px 6px;
          image-rendering: pixelated;
        }
        
        /* Animation classes */
        .momentum-pip-progress {
          background-image: url("data:image/svg+xml,%3Csvg width='2' height='2' viewBox='0 0 2 2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='2' height='2' fill='%23c2410c'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ea580c'/%3E%3C/svg%3E");
          background-size: 2px 2px;
          image-rendering: pixelated;
          animation: progress-wave 1.5s ease-in-out infinite;
          transform-origin: bottom;
        }
        
        .momentum-pip-gained {
          animation: pip-gain-pulse 0.3s ease-out;
        }
        
        .momentum-pip-lost {
          animation: pip-loss-pulse 0.3s ease-out;
        }
        
        .momentum-pip-pulse {
          animation: pip-effect-pulse 0.5s ease-in-out;
        }
        
        .momentum-pip-max {
          animation: max-indicator-pulse 1.5s infinite;
        }
        
        .momentum-max-indicator {
          animation: max-indicator-pulse 1.5s infinite;
        }
        
        /* Momentum break overlay */
        .momentum-break-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(220, 38, 38, 0.3);
          backdrop-filter: blur(2px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: break-overlay-fade 0.6s ease-out forwards;
          pointer-events: none;
        }
        
        @keyframes break-overlay-fade {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .momentum-break-text {
          color: #fef2f2;
          font-family: 'Press Start 2P', monospace;
          font-size: 1.5rem;
          font-weight: bold;
          animation: break-text-shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
        }
        
        @keyframes break-text-shake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate3d(-4px, 0, 0); }
          20%, 40%, 60%, 80% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}