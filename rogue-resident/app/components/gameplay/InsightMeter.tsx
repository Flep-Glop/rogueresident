// app/components/gameplay/InsightMeter.tsx
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface InsightMeterProps {
  className?: string;
  showAnimation?: boolean;
  compact?: boolean;
}

/**
 * InsightMeter - Visual representation of the player's insight resource
 * 
 * This displays the current insight value and provides visual feedback
 * for when strategic actions become available at threshold percentages.
 */
export default function InsightMeter({
  className = '',
  showAnimation = false,
  compact = false
}: InsightMeterProps) {
  // Access global insight value
  const { player } = useGameStore();
  const insight = player.insight;
  
  // Local state for animations
  const [prevInsight, setPrevInsight] = useState(insight);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showThresholdAnimation, setShowThresholdAnimation] = useState<number | null>(null);
  
  // Action thresholds (at what insight values actions become available)
  const thresholds = [
    { value: 25, action: 'Reframe' },
    { value: 50, action: 'Extrapolate' },
    { value: 75, action: 'Advanced' }
  ];
  
  // Calculate percentage for visual meter
  const insightPercentage = Math.min(100, Math.max(0, insight));
  
  // Handle animation when insight changes
  useEffect(() => {
    if (insight !== prevInsight) {
      setIsAnimating(true);
      
      // Check if we've crossed any thresholds
      thresholds.forEach(threshold => {
        if (prevInsight < threshold.value && insight >= threshold.value) {
          setShowThresholdAnimation(threshold.value);
        }
      });
      
      setPrevInsight(insight);
      
      // Reset animations after delay
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setShowThresholdAnimation(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [insight, prevInsight]);
  
  // Compact mode for minimal UI spaces
  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-blue-500 ${isAnimating ? 'animate-pulse' : ''}`} 
            style={{ width: `${insightPercentage}%` }}
          ></div>
        </div>
        <span className="ml-2 text-xs font-pixel text-blue-300">{insight}</span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-pixel text-blue-200">Insight</div>
        <div className="text-xs font-pixel text-blue-100">{insight}/100</div>
      </div>
      
      {/* Main meter */}
      <div className="h-4 bg-surface-dark/60 rounded overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r from-blue-600 to-blue-400 ${isAnimating ? 'animate-pulse' : ''}`} 
          style={{ width: `${insightPercentage}%` }}
        ></div>
      </div>
      
      {/* Threshold markers */}
      <div className="relative h-1 mt-1">
        {thresholds.map(threshold => (
          <div 
            key={`threshold-${threshold.value}`}
            className={`absolute h-4 w-0.5 -mt-3 ${
              insight >= threshold.value 
                ? 'bg-blue-300' 
                : 'bg-gray-700'
            } ${
              showThresholdAnimation === threshold.value 
                ? 'animate-ping' 
                : ''
            }`}
            style={{ left: `${threshold.value}%` }}
          />
        ))}
      </div>
      
      {/* Action labels */}
      <div className="relative h-4 mt-1">
        {thresholds.map(threshold => (
          insight >= threshold.value && (
            <div 
              key={`label-${threshold.value}`}
              className={`absolute text-xs font-pixel ${
                showThresholdAnimation === threshold.value 
                  ? 'text-blue-300 animate-bounce' 
                  : 'text-blue-500'
              }`}
              style={{ left: `${threshold.value}%`, transform: 'translateX(-50%)' }}
            >
              {threshold.action}
            </div>
          )
        ))}
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .animate-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-5px) translateX(-50%); }
        }
        
        .animate-bounce {
          animation: bounce 1s ease infinite;
        }
      `}</style>
    </div>
  );
}