// app/components/gameplay/InsightMeter.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore, RESOURCE_THRESHOLDS } from '../../store/resourceStore';

interface InsightMeterProps {
  showLabel?: boolean;
  showValue?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  vertical?: boolean;
}

/**
 * Insight Meter Component - Pixel-Perfect Version
 * 
 * Visual representation of player's insight resource with threshold markers
 * and pixelated fill that changes color at key thresholds.
 */
export default function InsightMeter({
  showLabel = true,
  showValue = true,
  className = '',
  size = 'md',
  compact = false,
  vertical = false
}: InsightMeterProps) {
  // Get resource state
  const { 
    insight, 
    insightMax, 
    insightEffect,
  } = useResourceStore();
  
  // Refs for tracking previous values
  const prevInsightRef = useRef(insight);
  
  // Local delta tracking
  const [insightDelta, setInsightDelta] = useState(0);
  
  // Animation states
  const [pulseEffect, setPulseEffect] = useState(false);
  const [thresholdCrossed, setThresholdCrossed] = useState<number | null>(null);
  
  // Calculate fill percentage and chunking
  const fillPercentage = Math.min(100, Math.max(0, (insight / insightMax) * 100));
  
  // Determine if we just crossed a threshold and track delta
  useEffect(() => {
    const prevPercentage = (prevInsightRef.current / insightMax) * 100;
    
    // Calculate insight delta for animation
    const delta = insight - prevInsightRef.current;
    if (delta !== 0) {
      setInsightDelta(delta);
      // Clear delta after animation duration
      const clearTimer = setTimeout(() => setInsightDelta(0), 1000);
      return () => clearTimeout(clearTimer);
    }
    
    // Check if we crossed 25%, 50%, or 75% thresholds
    [25, 50, 75].forEach(threshold => {
      if (prevPercentage < threshold && fillPercentage >= threshold) {
        setThresholdCrossed(threshold);
        setTimeout(() => setThresholdCrossed(null), 1000);
      }
    });
    
    prevInsightRef.current = insight;
  }, [insight, insightMax, fillPercentage]);
  
  // Dynamic fill color based on fill level
  const getFillClass = () => {
    // For pixelated fill effect, we use solid colors instead of gradients
    if (fillPercentage >= 75) {
      return 'bg-green-600';
    } else if (fillPercentage >= 50) {
      return 'bg-purple-600';
    } else {
      return 'bg-blue-600';
    }
  };
  
  // Get pattern for the pixelated fill
  const getPixelPattern = () => {
    if (fillPercentage >= 75) {
      return `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%2322c55e'/%3E%3Crect width='1' height='1' fill='%2315803d'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%2315803d'/%3E%3C/svg%3E")`;
    } else if (fillPercentage >= 50) {
      return `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%239333ea'/%3E%3Crect width='1' height='1' fill='%237e22ce'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%237e22ce'/%3E%3C/svg%3E")`;
    } else {
      return `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%232563eb'/%3E%3Crect width='1' height='1' fill='%231d4ed8'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%231d4ed8'/%3E%3C/svg%3E")`;
    }
  };
  
  // Size classes for different sizes
  const sizeClasses = vertical 
    ? {
        sm: "w-2 h-32",
        md: "w-4 h-40",
        lg: "w-6 h-48",
        xl: "w-8 h-64"
      }
    : {
        sm: "h-2 w-full",
        md: "h-4 w-full",
        lg: "h-6 w-full",
        xl: "h-8 w-full"
      };
  
  // Handle effect animations
  useEffect(() => {
    if (insightEffect.active) {
      setPulseEffect(true);
      
      // Clear effect after animation
      const timer = setTimeout(() => {
        setPulseEffect(false);
      }, insightEffect.duration);
      
      return () => clearTimeout(timer);
    }
  }, [insightEffect]);
  
  // Threshold markers configuration
  const thresholdMarkers = [
    { 
      value: RESOURCE_THRESHOLDS.REFRAME, 
      label: 'R', 
      color: 'blue'
    },
    { 
      value: RESOURCE_THRESHOLDS.EXTRAPOLATE, 
      label: 'E', 
      color: 'purple'
    },
    { 
      value: RESOURCE_THRESHOLDS.SYNTHESIS, 
      label: 'S', 
      color: 'green'
    }
  ];
  
  return (
    <div className={`${className} ${vertical ? 'flex items-end' : 'w-full'}`}>
      {/* Only show labels for horizontal mode or if specifically requested */}
      {showLabel && !vertical && (
        <div className="flex justify-between items-center mb-1">
          <div className="font-pixel text-blue-300 text-xs tracking-wider">
            INSIGHT
          </div>
          {showValue && (
            <div className="font-pixel text-blue-200 text-sm tabular-nums">
              {insight}/{insightMax}
            </div>
          )}
        </div>
      )}
      
      {/* Label for vertical orientation */}
      {showLabel && vertical && (
        <div className="flex flex-col mr-2 items-end">
          <div className="font-pixel text-blue-300 text-xs tracking-wider rotate-90 origin-bottom-right transform translate-y-6">
            INSIGHT
          </div>
          {showValue && (
            <div className="font-pixel text-blue-200 text-sm tabular-nums mt-2">
              {insight}
              <br />
              {insightMax}
            </div>
          )}
        </div>
      )}
      
      {/* Container for meter with pixel-perfect styling */}
      <div className={`
        relative bg-blue-900/30 ${sizeClasses[size]}
        overflow-hidden
        ${vertical ? 'flex flex-col-reverse' : ''}
      `}
      style={{ 
        imageRendering: 'pixelated',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderImage: 'url("data:image/svg+xml,%3Csvg width=\'3\' height=\'3\' viewBox=\'0 0 3 3\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%231a1f2e\'/%3E%3Crect width=\'3\' height=\'3\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'2\'/%3E%3C/svg%3E") 2 stretch'
      }}>
        {/* Chunked fill with pixel pattern */}
        <motion.div
          className={`absolute ${getFillClass()} ${vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0'}`}
          style={{ 
            backgroundImage: getPixelPattern(),
            backgroundSize: '4px 4px',
            imageRendering: 'pixelated',
            [vertical ? 'height' : 'width']: `${fillPercentage}%` 
          }}
          initial={{ [vertical ? 'height' : 'width']: `${fillPercentage}%` }}
          animate={{ 
            [vertical ? 'height' : 'width']: `${fillPercentage}%`,
            transition: { 
              type: 'spring', 
              damping: 30,
              stiffness: 400
            }
          }}
        >
          {/* Pixelated scan lines for retro effect */}
          <div 
            className="absolute inset-0 mix-blend-overlay opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='2' height='2' viewBox='0 0 2 2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect y='1' width='2' height='1' fill='%23000000'/%3E%3C/svg%3E")`,
              backgroundSize: '2px 2px',
              imageRendering: 'pixelated'
            }}
          />
          
          {/* Scanline animation effect */}
          <motion.div 
            className="absolute inset-0 bg-white/10 origin-top"
            style={{ scaleY: 0.05 }}
            animate={{ 
              top: ['-10%', '110%'],
              transition: { 
                repeat: Infinity, 
                duration: 1.5, 
                ease: 'linear',
                repeatDelay: 1
              }
            }}
          />
        </motion.div>
        
        {/* Threshold markers placed appropriately for orientation */}
        {thresholdMarkers.map((marker, index) => {
          const position = (marker.value / insightMax) * 100;
          const isHighlighted = thresholdCrossed === position;
          
          // Only show markers within the visible range
          if (position > 0 && position <= 100) {
            return (
              <div 
                key={index} 
                className={`absolute ${vertical ? 'inset-x-0' : 'inset-y-0'}`} 
                style={{ 
                  [vertical ? 'bottom' : 'left']: `${position}%`, 
                  zIndex: isHighlighted ? 2 : 1 
                }}
              >
                {/* Marker line with pixel styling */}
                <div className={`
                  ${vertical ? 'h-1 w-full' : 'w-1 h-full'} 
                  ${marker.color === 'blue' 
                    ? 'bg-blue-400' 
                    : marker.color === 'purple' 
                      ? 'bg-purple-400' 
                      : 'bg-green-400'
                  }
                  ${isHighlighted ? 'animate-pulse' : ''}
                `}></div>
                
                {/* Marker label positioned according to orientation */}
                {!compact && size !== 'sm' && (
                  <div className={`
                    absolute 
                    ${vertical 
                      ? 'left-full ml-1 -translate-y-1/2' 
                      : '-top-6 -translate-x-1/2'} 
                    text-xs font-pixel
                    ${marker.color === 'blue' 
                      ? 'text-blue-400' 
                      : marker.color === 'purple' 
                        ? 'text-purple-400' 
                        : 'text-green-400'
                    }
                    ${isHighlighted ? 'text-glow-sm animate-pulse' : ''}
                  `}
                  style={{
                    textShadow: isHighlighted ? '0 0 5px currentColor' : 'none'
                  }}>
                    {marker.label}
                  </div>
                )}
                
                {/* Threshold crossing flare animation */}
                {isHighlighted && (
                  <motion.div 
                    className={`
                      absolute ${vertical ? 'inset-x-0 h-3' : 'inset-y-0 w-3'} 
                      ${marker.color === 'blue' 
                        ? 'bg-blue-400' 
                        : marker.color === 'purple' 
                          ? 'bg-purple-400' 
                          : 'bg-green-400'
                      }
                    `}
                    initial={{ opacity: 0.8 }}
                    animate={{ 
                      opacity: [0.8, 0.3, 0],
                      [vertical ? 'height' : 'width']: ['3px', '16px', '24px'],
                      transition: { duration: 0.8 }
                    }}
                  />
                )}
              </div>
            );
          }
          return null;
        })}
        
        {/* Pulse effect for visual feedback - orientation aware */}
        <AnimatePresence>
          {pulseEffect && (
            <motion.div
              className={`
                absolute inset-0 
                ${insightEffect.intensity === 'high' 
                  ? 'bg-blue-400/40' 
                  : insightEffect.intensity === 'medium'
                    ? 'bg-blue-500/30'
                    : 'bg-blue-600/20'
                }
              `}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                transition: { 
                  repeat: insightEffect.intensity === 'high' ? 3 : 2,
                  duration: 0.5 
                }
              }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        
        {/* Gain/loss indicator */}
        <AnimatePresence>
          {insightDelta !== 0 && (
            <motion.div
              className={`
                absolute ${vertical ? 'right-full mr-1' : 'bottom-full mb-1'} 
                font-pixel text-xs ${insightDelta > 0 ? 'text-green-400' : 'text-red-400'}
              `}
              initial={{ opacity: 0, y: insightDelta > 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: insightDelta > 0 ? -10 : 10 }}
              transition={{ duration: 0.3 }}
            >
              {insightDelta > 0 ? '+' : ''}{insightDelta}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Decorative pixel corners - pixelated styling */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-white/50"></div>
        <div className="absolute top-0 right-0 w-1 h-1 bg-white/30"></div>
        <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/20"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 bg-black/30"></div>
      </div>
      
      {/* Threshold hints - orientation aware */}
      {size === 'lg' && !compact && !vertical && (
        <div className="flex justify-between text-2xs text-gray-400 mt-1 px-1">
          <div>0</div>
          <div className="text-blue-400">25◆</div>
          <div className="text-purple-400">50◆</div>
          <div className="text-green-400">75◆</div>
          <div>100</div>
        </div>
      )}
      
      {/* Vertical threshold indicators */}
      {size === 'lg' && !compact && vertical && (
        <div className="flex flex-col justify-between text-2xs text-gray-400 ml-1 py-1 h-full">
          <div>100</div>
          <div className="text-green-400">75◆</div>
          <div className="text-purple-400">50◆</div>
          <div className="text-blue-400">25◆</div>
          <div>0</div>
        </div>
      )}
    </div>
  );
}