// app/components/gameplay/InsightMeter.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore, RESOURCE_THRESHOLDS } from '../../store/resourceStore';

interface InsightMeterProps {
  showLabel?: boolean;
  showValue?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Insight Meter Component
 * 
 * Visual representation of player's insight resource with threshold markers
 * and anticipation zones as the player approaches key thresholds.
 */
export default function InsightMeter({
  showLabel = true,
  showValue = true,
  className = '',
  compact = false
}: InsightMeterProps) {
  // Get resource state
  const { 
    insight, 
    insightMax, 
    insightEffect, 
    insightThresholds,
    getThresholdProximity
  } = useResourceStore();
  
  // Animation state
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Calculate fill percentage
  const fillPercentage = Math.min(100, Math.max(0, (insight / insightMax) * 100));
  
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
      color: 'blue',
      proximity: getThresholdProximity('reframe')
    },
    { 
      value: RESOURCE_THRESHOLDS.EXTRAPOLATE, 
      label: 'E', 
      color: 'purple',
      proximity: getThresholdProximity('extrapolate')
    },
    { 
      value: RESOURCE_THRESHOLDS.SYNTHESIS, 
      label: 'S', 
      color: 'green',
      proximity: getThresholdProximity('synthesis')
    }
  ];
  
  return (
    <div className={`flex items-center ${className} ${compact ? 'space-x-1' : 'space-x-2'}`}>
      {showLabel && (
        <div className={`font-pixel ${compact ? 'text-xs' : 'text-sm'} text-blue-300`}>
          Insight
        </div>
      )}
      
      <div className={`relative grow bg-gray-900 ${compact ? 'h-2' : 'h-3'} rounded-full overflow-hidden`}>
        {/* Base fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-blue-600"
          initial={{ width: `${fillPercentage}%` }}
          animate={{ 
            width: `${fillPercentage}%`,
            transition: { 
              type: 'spring', 
              damping: 15 
            }
          }}
        />
        
        {/* Threshold markers */}
        {thresholdMarkers.map((marker, index) => {
          const position = (marker.value / insightMax) * 100;
          
          // Only show markers within the visible range
          if (position > 0 && position <= 100) {
            return (
              <div key={index} className="absolute inset-y-0" style={{ left: `${position}%` }}>
                {/* Marker line */}
                <div 
                  className={`w-0.5 h-full ${
                    marker.color === 'blue' 
                      ? 'bg-blue-400' 
                      : marker.color === 'purple' 
                        ? 'bg-purple-400' 
                        : 'bg-green-400'
                  }`}
                />
                
                {/* Marker label - only if not compact */}
                {!compact && (
                  <div 
                    className={`absolute -top-5 -translate-x-1/2 text-xs font-pixel ${
                      marker.color === 'blue' 
                        ? 'text-blue-400' 
                        : marker.color === 'purple' 
                          ? 'text-purple-400' 
                          : 'text-green-400'
                    }`}
                  >
                    {marker.label}
                  </div>
                )}
                
                {/* Proximity indicator - "anticipation zone" */}
                {marker.proximity > 0 && marker.proximity < 1 && (
                  <motion.div 
                    className={`absolute -top-1 -translate-x-1/2 w-4 h-1 rounded-full ${
                      marker.color === 'blue' 
                        ? 'bg-blue-500/60' 
                        : marker.color === 'purple' 
                          ? 'bg-purple-500/60' 
                          : 'bg-green-500/60'
                    }`}
                    initial={{ opacity: 0.3, scale: 1 }}
                    animate={{ 
                      opacity: [0.3, 0.8, 0.3], 
                      scale: [1, 1.1, 1],
                      transition: { 
                        repeat: Infinity, 
                        duration: 2
                      }
                    }}
                  />
                )}
              </div>
            );
          }
          return null;
        })}
        
        {/* Pulse effect */}
        <AnimatePresence>
          {pulseEffect && (
            <motion.div
              className={`absolute inset-0 ${
                insightEffect.intensity === 'high' 
                  ? 'bg-blue-400/40' 
                  : insightEffect.intensity === 'medium'
                    ? 'bg-blue-500/30'
                    : 'bg-blue-600/20'
              }`}
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
      </div>
      
      {showValue && (
        <motion.div 
          className={`font-pixel ${compact ? 'text-xs w-6' : 'text-sm w-8'} text-blue-300 text-right tabular-nums`}
          initial={{ opacity: 1 }}
          animate={pulseEffect ? { 
            scale: [1, 1.1, 1],
            color: ['rgb(147, 197, 253)', 'rgb(59, 130, 246)', 'rgb(147, 197, 253)'],
            transition: { duration: 0.5 }
          } : {}}
        >
          {insight}
        </motion.div>
      )}
    </div>
  );
}