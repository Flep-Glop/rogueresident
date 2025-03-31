// app/components/PhaseTransition.tsx
'use client';
import { useState, useEffect } from 'react';
import { PixelText } from './PixelThemeProvider';
import { useGameStore } from '../store/gameStore';

interface PhaseTransitionProps {
  fromPhase: 'day' | 'night';
  toPhase: 'day' | 'night';
  onComplete: () => void;
}

export default function PhaseTransition({ fromPhase, toPhase, onComplete }: PhaseTransitionProps) {
  const [opacity, setOpacity] = useState(0);
  const [showText, setShowText] = useState(false);
  const { currentDay } = useGameStore();
  
  useEffect(() => {
    // Fade in
    setOpacity(0);
    const fadeInTimer = setTimeout(() => {
      setOpacity(1);
      setShowText(true);
    }, 100);
    
    // Show transition for 1.5 seconds, then fade out
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
      setShowText(false);
    }, 1500);
    
    // Complete transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);
    
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);
  
  // Determine background gradient based on transition direction
  const getGradientStyle = () => {
    if (fromPhase === 'day' && toPhase === 'night') {
      // Day to night transition (sunset)
      return 'from-orange-600 via-purple-700 to-indigo-900';
    } else {
      // Night to day transition (sunrise)
      return 'from-indigo-900 via-purple-700 to-orange-400';
    }
  };
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b ${getGradientStyle()}`}
      style={{ 
        transition: 'opacity 0.5s ease-in-out',
        opacity: opacity
      }}
    >
      {showText && (
        <div className="text-center text-white">
          <div className="animate-pulse">
            {fromPhase === 'day' && toPhase === 'night' ? (
              <>
                <PixelText className="text-6xl font-pixel-heading mb-4">Day Complete</PixelText>
                <PixelText className="text-2xl">Returning to your hillside home...</PixelText>
              </>
            ) : (
              <>
                <PixelText className="text-6xl font-pixel-heading mb-4">Day {currentDay}</PixelText>
                <PixelText className="text-2xl">Heading to the hospital...</PixelText>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}