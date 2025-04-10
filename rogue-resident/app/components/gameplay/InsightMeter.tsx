// app/components/gameplay/InsightMeter.tsx
'use client';
import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore } from '../../store/resourceStore';
import { usePrimitiveStoreValue, useStableStoreValue } from '../../core/utils/storeHooks';

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
 * Insight Meter Component - Enhanced Visual Design with Render Optimization
 * 
 * Refactored to use the "Chamber Transition Pattern":
 * - Extract primitive values instead of objects
 * - Use refs for DOM manipulation
 * - CSS-driven animations
 * - Stable function references
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
  // PATTERN: Extract primitive values using specialized hooks
  const insight = usePrimitiveStoreValue(useResourceStore, state => state.insight, 0);
  const insightMax = usePrimitiveStoreValue(useResourceStore, state => state.insightMax, 100);
  
  // Stable extraction of the effect object to avoid reference changes
  const insightEffect = useStableStoreValue(useResourceStore, state => state.insightEffect || { 
    active: false, 
    duration: 2000, 
    intensity: 'medium' 
  });
  
  // Refs for DOM manipulation
  const fillRef = useRef<HTMLDivElement>(null);
  const deltaRef = useRef<HTMLDivElement>(null);
  const lastInsightRef = useRef(insight);
  const thresholdCrossedRef = useRef<number | null>(null);
  const actionAvailableRef = useRef<string | null>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // Calculate fill percentage once per render
  const fillPercentage = useMemo(() => 
    Math.min(100, Math.max(0, (insight / insightMax) * 100)),
  [insight, insightMax]);
  
  // PATTERN: Process insight changes via refs and effects
  useEffect(() => {
    const prevInsight = lastInsightRef.current;
    const delta = insight - prevInsight;
    
    // Clear existing timeouts to prevent overlapping animations
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    
    if (delta !== 0) {
      // Update delta indicator via DOM manipulation
      if (deltaRef.current) {
        // Show delta
        deltaRef.current.textContent = `${delta > 0 ? '+' : ''}${delta}`;
        deltaRef.current.classList.add('insight-delta-show');
        
        // Clear after animation
        const clearTimer = setTimeout(() => {
          if (deltaRef.current) deltaRef.current.classList.remove('insight-delta-show');
        }, 1500);
        timeoutRefs.current.push(clearTimer);
      }
    }
    
    // Check threshold crossings
    const prevPercentage = (prevInsight / insightMax) * 100;
    const thresholds = [
      { value: 25, name: 'REFRAME' },
      { value: 50, name: 'EXTRAPOLATE' },
      { value: 75, name: 'SYNTHESIS' }
    ];
    
    thresholds.forEach(threshold => {
      if (prevPercentage < threshold.value && fillPercentage >= threshold.value) {
        // Threshold crossed - update refs
        thresholdCrossedRef.current = threshold.value;
        actionAvailableRef.current = threshold.name;
        
        // Add threshold animation class to corresponding marker
        const markerEl = document.querySelector(`.threshold-marker-${threshold.value}`);
        if (markerEl) {
          markerEl.classList.add('threshold-crossed');
          
          const clearTimer = setTimeout(() => {
            markerEl.classList.remove('threshold-crossed');
            thresholdCrossedRef.current = null;
            actionAvailableRef.current = null;
          }, 2000);
          timeoutRefs.current.push(clearTimer);
        }
      }
    });
    
    // Update fill bar via DOM
    if (fillRef.current) {
      // Using CSS custom property for animation
      fillRef.current.style.setProperty('--target-fill', `${fillPercentage}%`);
      fillRef.current.classList.add('insight-fill-animate');
    }
    
    // Update ref for next comparison
    lastInsightRef.current = insight;
    
    // Cleanup
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [insight, insightMax, fillPercentage]);
  
  // PATTERN: Handle animation from gameplay effect with refs
  useEffect(() => {
    if (insightEffect.active || showAnimation) {
      // Direct DOM manipulation for pulse effect
      document.querySelectorAll('.insight-meter-container').forEach(el => {
        el.classList.add('pulse-effect');
        
        const timer = setTimeout(() => {
          el.classList.remove('pulse-effect');
        }, insightEffect.duration || 2000);
        
        timeoutRefs.current.push(timer);
      });
    }
    
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [insightEffect.active, insightEffect.duration, showAnimation]);
  
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
  
  // PATTERN: Compute derived values once per render
  const colors = useMemo(() => {
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
    
    // Generate pattern SVG for the fill texture
    const getPatternSvg = () => {
      const { darkShade, lightShade } = getShaderColors();
      const darkHex = darkShade.replace('#', '');
      const lightHex = lightShade.replace('#', '');
      
      return `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23${darkHex}'/%3E%3Crect width='1' height='1' fill='%23${lightHex}'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23${lightHex}'/%3E%3C/svg%3E")`;
    };
    
    return {
      fillColor: getFillColor(),
      shaderColors: getShaderColors(),
      patternSvg: getPatternSvg()
    };
  }, [fillPercentage]);
  
  // Threshold markers with improved visualization
  const thresholdMarkers = useMemo(() => [
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
  ], []);
  
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
        overflow-hidden insight-meter-container
        ${vertical ? 'flex flex-col-reverse' : ''}
      `}
      style={{ 
        imageRendering: 'pixelated',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderImage: 'url("data:image/svg+xml,%3Csvg width=\'3\' height=\'3\' viewBox=\'0 0 3 3\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%231a1f2e\'/%3E%3Crect width=\'3\' height=\'3\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'2\'/%3E%3C/svg%3E") 2 stretch'
      }}>
        {/* Enhanced pixelated fill with dynamic color and pattern */}
        <div
          ref={fillRef}
          className={`insight-fill absolute ${vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0'}`}
          style={{ 
            backgroundImage: colors.patternSvg,
            backgroundSize: '4px 4px',
            imageRendering: 'pixelated',
            boxShadow: `0 0 8px ${colors.shaderColors.glow}`,
            [vertical ? 'height' : 'width']: `var(--target-fill, ${fillPercentage}%)`,
            transition: 'width 0.3s ease-out, height 0.3s ease-out'
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
          
          {/* Animated scanline - CSS driven */}
          <div className="insight-scanline"></div>
        </div>
        
        {/* Threshold markers with improved visibility */}
        {thresholdMarkers.map((marker, index) => {
          const isActive = fillPercentage >= marker.percent;
          const markerColor = marker.colorClass === 'teal' 
            ? (isActive ? 'text-teal-400' : 'text-teal-900') 
            : marker.colorClass === 'purple'
              ? (isActive ? 'text-purple-400' : 'text-purple-900')
              : (isActive ? 'text-blue-400' : 'text-blue-900');
          
          return (
            <div 
              key={`threshold-${index}`} 
              className={`threshold-marker-${marker.percent} absolute ${vertical ? 'inset-x-0' : 'inset-y-0'}`} 
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
                  ${isActive ? 'font-bold' : 'opacity-50'}
                `}
                style={{
                  left: vertical ? '100%' : `${marker.percent}%`,
                }}>
                  {marker.label}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-white/50"></div>
        <div className="absolute top-0 right-0 w-1 h-1 bg-white/30"></div>
        <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/20"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 bg-black/30"></div>
      </div>
      
      {/* Delta indicator - styled with CSS instead of motion */}
      <div 
        ref={deltaRef} 
        className="insight-delta"
      ></div>
      
      {/* Action unlocked notification - now CSS-driven */}
      <div className="insight-action-notification"></div>
      
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
      
      {/* CSS Animations */}
      <style jsx>{`
        /* Animation for threshold crossing */
        @keyframes threshold-glow {
          0%, 100% { filter: drop-shadow(0 0 3px currentColor); }
          50% { filter: drop-shadow(0 0 8px currentColor); }
        }
        
        /* Animation for scanline */
        @keyframes scanline-move {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        
        /* Animation for fill */
        @keyframes fill-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        /* Animation for delta */
        @keyframes delta-fade {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        
        /* Animation for action notification */
        @keyframes action-notification {
          0% { opacity: 0; transform: translateY(5px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        
        /* Animation for container pulse */
        @keyframes container-pulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 15px 5px var(--pulse-color, rgba(59, 130, 246, 0.4)); }
        }
        
        /* Delta indicator */
        .insight-delta {
          position: absolute;
          right: 0;
          bottom: 100%;
          margin-bottom: 4px;
          font-size: 0.75rem;
          font-family: 'VT323', monospace;
          opacity: 0;
          pointer-events: none;
        }
        
        .insight-delta-show {
          animation: delta-fade 1.5s ease-out forwards;
        }
        
        /* Action notification */
        .insight-action-notification {
          margin-top: 4px;
          height: 1.25rem;
          font-size: 0.75rem;
          font-family: 'VT323', monospace;
        }
        
        /* Scanline */
        .insight-scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 5%;
          background-color: rgba(255, 255, 255, 0.2);
          animation: scanline-move 1.5s linear infinite;
          animation-delay: 1s;
        }
        
        /* Fill animation */
        .insight-fill-animate {
          animation: fill-pulse 1s ease-in-out;
        }
        
        /* Threshold animation */
        .threshold-crossed {
          animation: threshold-glow 1s ease-in-out infinite;
        }
        
        /* Container pulse effect */
        .pulse-effect {
          --pulse-color: ${fillPercentage >= 75 
            ? 'rgba(45, 212, 191, 0.5)' 
            : fillPercentage >= 50 
              ? 'rgba(168, 85, 247, 0.5)'
              : 'rgba(59, 130, 246, 0.4)'};
          animation: container-pulse 1s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}