// app/components/gameplay/MomentumCounter.tsx
import React, { useEffect, useState, useRef } from 'react';
import { MAX_MOMENTUM_LEVEL } from '../../hooks/useGameplayEffects';

interface MomentumCounterProps {
  level: number;
  showEffect?: boolean;
  consecutiveCorrect?: number;
  className?: string;
  compact?: boolean;
}

/**
 * MomentumCounter - Visual representation of the player's answer streak
 * 
 * Similar to combo systems in action games, this provides immediate visual
 * feedback for answering questions correctly in sequence.
 * 
 * The component provides several visual states:
 * - Empty pips (no momentum)
 * - Filled pips (momentum building)
 * - Pulsing pips (maximum momentum)
 */
export default function MomentumCounter({
  level,
  showEffect = false,
  consecutiveCorrect = 0,
  className = '',
  compact = false
}: MomentumCounterProps) {
  // Track previous level for animation
  const [prevLevel, setPrevLevel] = useState(level);
  const [animatingLevel, setAnimatingLevel] = useState<number | null>(null);
  
  // References for animation control
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle level change animations
  useEffect(() => {
    // Clear any existing animation timer
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    
    // If level increased, animate it
    if (level > prevLevel) {
      setAnimatingLevel(level);
      
      // Clear animation after delay
      animationTimerRef.current = setTimeout(() => {
        setAnimatingLevel(null);
      }, 1000);
    }
    // If level decreased, show break animation
    else if (level < prevLevel) {
      setAnimatingLevel(-1); // Use -1 to indicate breaking animation
      
      // Clear animation after delay
      animationTimerRef.current = setTimeout(() => {
        setAnimatingLevel(null);
      }, 1000);
    }
    
    // Update previous level
    setPrevLevel(level);
    
    // Cleanup on unmount
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [level, prevLevel]);

  // Generate proper CSS classes for momentum pips
  const getPipClasses = (pipLevel: number) => {
    const baseClasses = "w-4 h-4 rounded-full transition-all duration-300";
    
    // Breaking momentum animation
    if (animatingLevel === -1) {
      return `${baseClasses} ${pipLevel <= prevLevel ? 'animate-break bg-red-500' : 'bg-gray-700'}`;
    }
    
    // Pip is active (filled)
    if (pipLevel <= level) {
      // Maximum momentum level - special styling
      if (level === MAX_MOMENTUM_LEVEL) {
        return `${baseClasses} bg-orange-500 ${pipLevel === level ? 'animate-pulse-glow' : ''}`;
      }
      
      // Currently animating this pip
      if (animatingLevel !== null && pipLevel === animatingLevel) {
        return `${baseClasses} bg-yellow-500 animate-pip-fill`;
      }
      
      // Regular filled pip
      return `${baseClasses} bg-yellow-400`;
    }
    
    // Inactive pip
    return `${baseClasses} bg-gray-700`;
  };
  
  // For compact mode (just dots, no labels)
  if (compact) {
    return (
      <div className={`flex space-x-1 items-center justify-center ${className}`}>
        {Array.from({ length: MAX_MOMENTUM_LEVEL }).map((_, i) => (
          <div 
            key={`momentum-pip-${i}`} 
            className={getPipClasses(i + 1)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Title & Counter */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-pixel text-yellow-200">Momentum</div>
        {consecutiveCorrect > 0 && (
          <div className="text-xs font-pixel text-yellow-100">
            {consecutiveCorrect} correct
          </div>
        )}
      </div>
      
      {/* Momentum pips */}
      <div className="flex space-x-1.5 items-center p-1 bg-surface-dark/60 rounded">
        {Array.from({ length: MAX_MOMENTUM_LEVEL }).map((_, i) => (
          <div 
            key={`momentum-pip-${i}`} 
            className={getPipClasses(i + 1)}
          />
        ))}
        
        {/* Show action reminder at max momentum */}
        {level === MAX_MOMENTUM_LEVEL && (
          <div className="ml-2 text-xs animate-pulse text-yellow-300 font-pixel">
            Boast/Expand available!
          </div>
        )}
      </div>
      
      {/* Animation overlay for effects */}
      {showEffect && (
        <div className="absolute inset-0 pointer-events-none">
          {level === MAX_MOMENTUM_LEVEL && (
            <>
              <div className="absolute inset-0 bg-orange-500/10 animate-pulse" />
              <div className="absolute inset-0 bg-yellow-400/5 animate-flash" />
            </>
          )}
        </div>
      )}
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pip-fill {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); background-color: rgb(250, 204, 21); }
          100% { transform: scale(1); }
        }
        
        @keyframes break {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.5); }
        }
        
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 0 10px rgba(249, 115, 22, 0.7); }
          100% { box-shadow: 0 0 0 rgba(249, 115, 22, 0.4); }
        }
        
        @keyframes flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .animate-pip-fill {
          animation: pip-fill 1s ease-out;
        }
        
        .animate-break {
          animation: break 0.8s ease-out forwards;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 1.5s infinite;
        }
        
        .animate-flash {
          animation: flash 0.8s ease-out 2;
        }
      `}</style>
    </div>
  );
}