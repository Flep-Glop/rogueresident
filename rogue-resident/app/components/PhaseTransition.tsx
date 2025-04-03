// app/components/PhaseTransition.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { PixelText } from './PixelThemeProvider';
import { useGameStore } from '../store/gameStore';
import { useGameEffects } from './GameEffects';

interface PhaseTransitionProps {
  fromPhase: 'day' | 'night';
  toPhase: 'day' | 'night';
  onComplete: () => void;
}

/**
 * Phase transition component that creates a meaningful pause between day and night cycles
 * 
 * The transition emphasizes the conceptual and physical journey between the hospital and 
 * hillside home, reinforcing the core game rhythm while ensuring content isn't visible
 * during transitions.
 */
export default function PhaseTransition({ fromPhase, toPhase, onComplete }: PhaseTransitionProps) {
  const [opacity, setOpacity] = useState(0);
  const [showText, setShowText] = useState(false);
  const [transitionStage, setTransitionStage] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState('');
  const { currentDay } = useGameStore();
  const { playSound } = useGameEffects();
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Create background gradients based on time of day
  useEffect(() => {
    // Immediately set high opacity to prevent flickering of underlying content
    setOpacity(1);
    
    if (fromPhase === 'day' && toPhase === 'night') {
      // Day to night: sunset gradient
      setBackgroundImage('linear-gradient(to bottom, #0B1026 0%, #2F2032 50%, #764C29 100%)');
    } else {
      // Night to day: sunrise gradient
      setBackgroundImage('linear-gradient(to bottom, #5293D7 0%, #DF9553 50%, #FAF6DB 100%)');
    }
  }, [fromPhase, toPhase]);
  
  useEffect(() => {
    // Mark component as mounted
    isMounted.current = true;
    
    // Play transition sound
    if (playSound) {
      // Use sound effects that are compatible with the SoundEffect type
      playSound(fromPhase === 'day' && toPhase === 'night' ? 'success' : 'click');
    }
    
    // Ensure we start fully opaque to hide content underneath
    setOpacity(1);
    setTransitionStage(0);
    
    const timers = [
      // Stage 1: Show text after a brief delay (300ms)
      setTimeout(() => {
        if (!isMounted.current) return;
        setShowText(true);
        setTransitionStage(1);
      }, 300),
      
      // Stage 2: Hold (2000ms)
      setTimeout(() => {
        if (!isMounted.current) return;
        setTransitionStage(2);
      }, 2300),
      
      // Stage 3: Begin fade out (3500ms)
      setTimeout(() => {
        if (!isMounted.current) return;
        setShowText(false);
        setTransitionStage(3);
      }, 3500),
      
      // Stage 4: Complete transition after fade out (4000ms)
      setTimeout(() => {
        if (!isMounted.current) return;
        onComplete();
        setTransitionStage(4);
      }, 4000)
    ];
    
    // Cleanup all timers
    return () => {
      isMounted.current = false;
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [onComplete, fromPhase, toPhase, playSound]);
  
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        background: backgroundImage,
        opacity: 1, // Always maintain full opacity to ensure no content bleeds through
      }}
    >
      {showText && (
        <div className="text-center text-white relative">
          {/* Main transition text */}
          <div className={`transition-opacity duration-300 ${transitionStage === 2 ? 'opacity-100' : 'opacity-100'}`}>
            <PixelText className="text-6xl font-pixel-heading mb-4 text-shadow">
              {getTransitionTitle()}
            </PixelText>
            <PixelText className="text-2xl text-shadow">
              {getTransitionMessage()}
            </PixelText>
          </div>
          
          {/* Visual embellishments */}
          {fromPhase === 'day' && toPhase === 'night' ? (
            // Day to night: stars and moon
            <div className="absolute inset-0 -z-10 opacity-70 overflow-hidden">
              <div className="stars-bg"></div>
              <div className="absolute top-10 right-20 w-16 h-16 bg-white rounded-full shadow-glow"></div>
            </div>
          ) : (
            // Night to day: sun rays
            <div className="absolute inset-0 -z-10 opacity-70 overflow-hidden">
              <div className="absolute top-10 left-20 w-24 h-24 bg-yellow-200 rounded-full shadow-glow-gold"></div>
              <div className="sun-rays"></div>
            </div>
          )}
          
          {/* Visual indicator of transition progress */}
          <div className="mt-10 w-48 h-2 bg-white/30 rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ 
                width: transitionStage === 0 ? '0%' :
                       transitionStage === 1 ? '33%' :
                       transitionStage === 2 ? '66%' : '100%' 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}