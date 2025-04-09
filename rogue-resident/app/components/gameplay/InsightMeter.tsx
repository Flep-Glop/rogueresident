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
  showAnimation?: boolean;
}

/**
 * Insight Meter Component - Enhanced Visual Design
 * 
 * A strategic resource meter inspired by roguelite persistent resources
 * (like Darkness in Hades). Features clear threshold markers and
 * distinctive visual states as player approaches key unlocks.
 */
export default function InsightMeter({
  showLabel = true,
  showValue = true,
  className = '',
  size = 'md',
  compact = false,
  vertical = false,
  showAnimation = false
}: InsightMeterProps) {
  // Get resource state
  const { 
    insight, 
    insightMax, 
    insightEffect,
  } = useResourceStore();
  
  // Refs for tracking previous values
  const prevInsightRef = useRef(insight);
  
  // Local state
  const [insightDelta, setInsightDelta] = useState(0);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [thresholdCrossed, setThresholdCrossed] = useState<number | null>(null);
  const [actionAvailable, setActionAvailable] = useState<string | null>(null);
  
  // Calculate fill percentage
  const fillPercentage = Math.min(100, Math.max(0, (insight / insightMax) * 100));
  
  // Process insight changes and threshold crossings
  useEffect(() => {
    const prevPercentage = (prevInsightRef.current / insightMax) * 100;
    
    // Calculate delta for animation
    const delta = insight - prevInsightRef.current;
    if (delta !== 0) {
      setInsightDelta(delta);
      // Clear delta after animation duration
      const clearTimer = setTimeout(() => setInsightDelta(0), 1500);
      return () => clearTimeout(clearTimer);
    }
    
    // Check if we crossed important thresholds
    const thresholds = [
      { value: 25, name: 'REFRAME' },
      { value: 50, name: 'EXTRAPOLATE' },
      { value: 75, name: 'SYNTHESIS' }
    ];
    
    thresholds.forEach(threshold => {
      if (prevPercentage < threshold.value && fillPercentage >= threshold.value) {
        setThresholdCrossed(threshold.value);
        setActionAvailable(threshold.name);
        setTimeout(() => setThresholdCrossed(null), 2000);
      }
    });
    
    prevInsightRef.current = insight;
  }, [insight, insightMax, fillPercentage]);
  
  // Handle animation from gameplay effect
  useEffect(() => {
    if (insightEffect.active || showAnimation) {
      setPulseEffect(true);
      
      const timer = setTimeout(() => {
        setPulseEffect(false);
      }, insightEffect.duration || 2000);
      
      return () => clearTimeout(timer);
    }
  }, [insightEffect, showAnimation]);
  
  // Size classes based on orientation
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
  
  // Get appropriate fill color based on level
  const getFillColor = () => {
    if (fillPercentage >= 75) return '#2dd4bf'; // Teal for highest tier
    if (fillPercentage >= 50) return '#a855f7'; // Purple for medium tier
    if (fillPercentage >= 25) return '#3b82f6'; // Blue for first tier
    return '#1d4ed8'; // Dark blue for starting tier
  };
  
  // Get appropriate shader colors
  const getShaderColors = () => {
    if (fillPercentage >= 75) {
      return {
        darkShade: '#0d9488',
        lightShade: '#5eead4',
        pattern: 'teal',
        glow: 'rgba(45, 212, 191, 0.5)'
      };
    }
    if (fillPercentage >= 50) {
      return {
        darkShade: '#7e22ce',
        lightShade: '#c084fc',
        pattern: 'purple',
        glow: 'rgba(168, 85, 247, 0.5)'
      };
    }
    return {
      darkShade: '#1d4ed8',
      lightShade: '#60a5fa',
      pattern: 'blue',
      glow: 'rgba(59, 130, 246, 0.4)'
    };
  };
  
  // Get pattern SVG for the fill texture
  const getPatternSvg = () => {
    const { darkShade, lightShade } = getShaderColors();
    const darkHex = darkShade.replace('#', '');
    const lightHex = lightShade.replace('#', '');
    
    return `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23${darkHex}'/%3E%3Crect width='1' height='1' fill='%23${lightHex}'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23${lightHex}'/%3E%3C/svg%3E")`;
  };
  
  // Threshold markers with improved visualization
  const thresholdMarkers = [
    { 
      percent: 25, 
      label: 'R', 
      action: 'REFRAME',
      colorClass: 'blue' 
    },
    { 
      percent: 50, 
      label: 'E', 
      action: 'EXTRAPOLATE',
      colorClass: 'purple' 
    },
    { 
      percent: 75, 
      label: 'S', 
      action: 'SYNTHESIS',
      colorClass: 'teal' 
    }
  ];
  
  return (
    <div className={`${className} ${vertical ? 'flex items-end' : ''}`}>
      {/* Header with label and value display */}
      <div className={`flex items-center justify-between ${vertical ? 'flex-col mr-2' : 'mb-1'}`}>
        {showLabel && (
          <div className={`
            font-pixel 
            text-${fillPercentage >= 75 ? 'teal' : fillPercentage >= 50 ? 'purple' : 'blue'}-300
            ${compact ? 'text-sm' : 'text-base'} tracking-wider
            ${vertical ? 'rotate-90 origin-bottom-right transform translate-y-6' : ''}
          `}>
            INSIGHT
          </div>
        )}
        
        {showValue && (
          <div className={`
            font-pixel text-sm tabular-nums 
            text-${fillPercentage >= 75 ? 'teal' : fillPercentage >= 50 ? 'purple' : 'blue'}-200
            ${vertical ? 'mt-2' : ''}
          `}>
            <AnimatePresence mode="wait">
              <motion.span
                key={insight}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
              >
                {insight}
              </motion.span>
            </AnimatePresence>
            /{insightMax}
          </div>
        )}
      </div>
      
      {/* Main meter container */}
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
        {/* Enhanced pixelated fill with dynamic color and pattern */}
        <motion.div
          className={`absolute ${vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0'}`}
          style={{ 
            backgroundImage: getPatternSvg(),
            backgroundSize: '4px 4px',
            imageRendering: 'pixelated',
            boxShadow: `0 0 8px ${getShaderColors().glow}`,
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
          {/* Scan lines effect */}
          <div 
            className="absolute inset-0 mix-blend-overlay opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='2' height='2' viewBox='0 0 2 2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect y='1' width='2' height='1' fill='%23000000'/%3E%3C/svg%3E")`,
              backgroundSize: '2px 2px',
              imageRendering: 'pixelated'
            }}
          />
          
          {/* Animated scanline */}
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
        
        {/* Threshold markers with improved visibility */}
        {thresholdMarkers.map((marker, index) => {
          const isActive = fillPercentage >= marker.percent;
          const isHighlighted = thresholdCrossed === marker.percent;
          const markerColor = marker.colorClass === 'teal' 
            ? (isActive ? 'text-teal-400' : 'text-teal-900') 
            : marker.colorClass === 'purple'
              ? (isActive ? 'text-purple-400' : 'text-purple-900')
              : (isActive ? 'text-blue-400' : 'text-blue-900');
          
          return (
            <div 
              key={`threshold-${index}`} 
              className={`absolute ${vertical ? 'inset-x-0' : 'inset-y-0'}`} 
              style={{ 
                [vertical ? 'bottom' : 'left']: `${marker.percent}%`, 
                zIndex: 2
              }}
            >
              {/* Marker line */}
              <div className={`
                ${vertical ? 'h-1 w-full' : 'w-1 h-full'} 
                ${isActive 
                  ? marker.colorClass === 'teal' 
                    ? 'bg-teal-400' 
                    : marker.colorClass === 'purple' 
                      ? 'bg-purple-400' 
                      : 'bg-blue-400'
                  : 'bg-gray-700'
                }
                ${isHighlighted ? 'animate-pulse' : ''}
              `}></div>
              
              {/* Action label */}
              {!compact && size !== 'sm' && (
                <div className={`
                  absolute 
                  ${vertical 
                    ? 'left-full ml-1 -translate-y-1/2' 
                    : '-top-6 -translate-x-1/2'} 
                  text-xs font-pixel
                  ${markerColor}
                  ${isHighlighted ? 'text-glow-sm animate-pulse' : ''}
                  ${isActive ? 'font-bold' : 'opacity-50'}
                `}
                style={{
                  textShadow: isHighlighted 
                    ? `0 0 6px ${marker.colorClass === 'teal' 
                        ? '#2dd4bf' 
                        : marker.colorClass === 'purple' 
                          ? '#a855f7' 
                          : '#3b82f6'
                      }`
                    : 'none'
                }}>
                  {marker.label}
                </div>
              )}
              
              {/* Threshold crossing animation */}
              {isHighlighted && (
                <motion.div 
                  className={`
                    absolute ${vertical ? 'inset-x-0 h-3' : 'inset-y-0 w-3'} 
                    ${marker.colorClass === 'teal' 
                      ? 'bg-teal-400' 
                      : marker.colorClass === 'purple' 
                        ? 'bg-purple-400' 
                        : 'bg-blue-400'
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
        })}
        
        {/* Pulse effect animation */}
        <AnimatePresence>
          {pulseEffect && (
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.4, 0],
                transition: { 
                  repeat: insightEffect.intensity === 'high' ? 3 : 2,
                  duration: 0.5 
                }
              }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        
        {/* Delta indicator */}
        <AnimatePresence>
          {insightDelta !== 0 && (
            <motion.div
              className={`
                absolute ${vertical ? 'right-full mr-1' : 'bottom-full mb-1'} 
                font-pixel text-xs ${insightDelta > 0 ? 'text-green-400' : 'text-red-400'}
              `}
              initial={{ opacity: 0, y: insightDelta > 0 ? 10 : -10 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { type: 'spring', damping: 15 }
              }}
              exit={{ 
                opacity: 0, 
                y: insightDelta > 0 ? -10 : 10,
                transition: { duration: 0.3 }
              }}
            >
              {insightDelta > 0 ? '+' : ''}{insightDelta}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-white/50"></div>
        <div className="absolute top-0 right-0 w-1 h-1 bg-white/30"></div>
        <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/20"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 bg-black/30"></div>
      </div>
      
      {/* Action unlocked notification */}
      <AnimatePresence>
        {actionAvailable && (
          <motion.div
            className={`
              mt-1 text-xs font-pixel 
              ${actionAvailable === 'SYNTHESIS' 
                ? 'text-teal-300' 
                : actionAvailable === 'EXTRAPOLATE' 
                  ? 'text-purple-300' 
                  : 'text-blue-300'
              }
              ${vertical ? 'ml-2' : ''}
            `}
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              transition: { type: 'spring', damping: 15 }
            }}
            exit={{ opacity: 0, y: -5 }}
          >
            {actionAvailable} unlocked!
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Threshold labels */}
      {size === 'lg' && !compact && !vertical && (
        <div className="flex justify-between text-2xs mt-1 px-1">
          <div className="text-gray-400">0</div>
          <div className={fillPercentage >= 25 ? 'text-blue-400' : 'text-gray-600'}>25◆</div>
          <div className={fillPercentage >= 50 ? 'text-purple-400' : 'text-gray-600'}>50◆</div>
          <div className={fillPercentage >= 75 ? 'text-teal-400' : 'text-gray-600'}>75◆</div>
          <div className="text-gray-400">100</div>
        </div>
      )}
      
      {/* Vertical mode threshold labels */}
      {size === 'lg' && !compact && vertical && (
        <div className="flex flex-col justify-between text-2xs text-gray-400 ml-1 py-1 h-full">
          <div>100</div>
          <div className={fillPercentage >= 75 ? 'text-teal-400' : 'text-gray-600'}>75◆</div>
          <div className={fillPercentage >= 50 ? 'text-purple-400' : 'text-gray-600'}>50◆</div>
          <div className={fillPercentage >= 25 ? 'text-blue-400' : 'text-gray-600'}>25◆</div>
          <div>0</div>
        </div>
      )}
    </div>
  );
}