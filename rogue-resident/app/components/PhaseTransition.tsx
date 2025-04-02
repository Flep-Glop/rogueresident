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

/**
 * Phase transition component that creates a meaningful pause between day and night cycles
 * 
 * The transition emphasizes the conceptual and physical journey between the hospital and 
 * hillside home, reinforcing the core game rhythm without being visually intrusive.
 */
export default function PhaseTransition({ fromPhase, toPhase, onComplete }: PhaseTransitionProps) {
  const [opacity, setOpacity] = useState(0);
  const [showText, setShowText] = useState(false);
  const [transitionStage, setTransitionStage] = useState(0);
  const { currentDay } = useGameStore();
  
  useEffect(() => {
    // Stage 0: Initial fade in
    setOpacity(0);
    setTransitionStage(0);
    
    const timers = [
      // Stage 1: Fade in (100ms)
      setTimeout(() => {
        setOpacity(1);
        setShowText(true);
        setTransitionStage(1);
      }, 100),
      
      // Stage 2: Hold (1500ms)
      setTimeout(() => {
        setTransitionStage(2);
      }, 1600),
      
      // Stage 3: Fade out (500ms)
      setTimeout(() => {
        setOpacity(0);
        setShowText(false);
        setTransitionStage(3);
      }, 2000),
      
      // Stage 4: Complete
      setTimeout(() => {
        onComplete();
        setTransitionStage(4);
      }, 2500)
    ];
    
    // Cleanup all timers
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [onComplete]);
  
  // Get the appropriate transition message based on direction
  const getTransitionMessage = () => {
    if (fromPhase === 'day' && toPhase === 'night') {
      return "Returning to hillside home...";
    } else {
      return `Heading to the hospital...`;
    }
  };
  
  // Get the transition title based on direction
  const getTransitionTitle = () => {
    if (fromPhase === 'day' && toPhase === 'night') {
      return "Day Complete";
    } else {
      return `Day ${currentDay}`;
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{ 
        transition: 'opacity 0.5s ease-in-out',
        opacity: opacity
      }}
    >
      {showText && (
        <div className="text-center text-white">
          <div className={`transition-opacity duration-300 ${transitionStage === 2 ? 'opacity-50' : 'opacity-100'}`}>
            <PixelText className="text-6xl font-pixel-heading mb-4">
              {getTransitionTitle()}
            </PixelText>
            <PixelText className="text-2xl">
              {getTransitionMessage()}
            </PixelText>
          </div>
        </div>
      )}
    </div>
  );
}