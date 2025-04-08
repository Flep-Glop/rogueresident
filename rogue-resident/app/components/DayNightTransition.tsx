// components/DayNightTransition.tsx
// This creates the magical transition between day and night phases
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameEventType } from '../core/events/EventTypes';
import { safeEventDispatch } from '../core/events/CentralEventBus';

const DayNightTransition: React.FC = () => {
  const { currentState, setGameState } = useGameStore();
  const [transitionState, setTransitionState] = useState<'idle' | 'fadeOut' | 'elevate' | 'stars' | 'fadeIn'>('idle');
  const [showStars, setShowStars] = useState(false);
  const [showHillhouse, setShowHillhouse] = useState(false);
  
  // Trigger the transition sequence
  useEffect(() => {
    if (currentState === 'transitioning-to-night') {
      // Start the transition sequence
      startTransition();
    }
  }, [currentState]);
  
  const startTransition = () => {
    // Log the start of transition
    safeEventDispatch(
      GameEventType.GAME_STATE_CHANGED,
      { from: 'day', to: 'transitioning' }
    );
    
    // Begin the transition sequence
    setTransitionState('fadeOut');
    
    // Schedule the sequence of transition states
    setTimeout(() => setTransitionState('elevate'), 2000);
    setTimeout(() => setTransitionState('stars'), 4000);
    setTimeout(() => {
      setShowStars(true);
      // Start subtle star twinkle animations
      document.querySelectorAll('.star').forEach(star => {
        star.classList.add('animate-twinkle');
      });
    }, 4500);
    setTimeout(() => setShowHillhouse(true), 5500);
    setTimeout(() => setTransitionState('fadeIn'), 6500);
    
    // Complete the transition
    setTimeout(() => {
      setGameState('night');
      safeEventDispatch(
        GameEventType.NIGHT_PHASE_STARTED,
        { location: 'hillHome' }
      );
    }, 8000);
  };
  
  // Early return if not in transition
  if (currentState !== 'transitioning-to-night') {
    return null;
  }
  
  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-2000 
                    ${transitionState === 'fadeOut' ? 'bg-black' : 
                     transitionState === 'fadeIn' ? 'opacity-0' : 'bg-black'}`}>
      
      {/* Hospital fading away */}
      <div className={`absolute inset-0 bg-hospital-bg bg-cover bg-center 
                      transition-opacity duration-2000
                      ${transitionState === 'idle' ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Elevation effect - moving upward */}
      <div className={`absolute inset-0 flex items-center justify-center
                      transition-transform duration-3000
                      ${transitionState === 'elevate' || transitionState === 'stars' ? 
                        'translate-y-[-30vh]' : 'translate-y-0'}`}>
        
        {/* Star field appears */}
        {showStars && (
          <>
            {/* Generate 100 random stars */}
            {Array.from({ length: 100 }).map((_, i) => {
              const size = Math.random() * 3 + 1;
              const left = Math.random() * 100;
              const top = Math.random() * 100;
              const delay = Math.random() * 2;
              const duration = 2 + Math.random() * 3;
              
              return (
                <div
                  key={i}
                  className="star absolute rounded-full bg-white"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${left}%`,
                    top: `${top}%`,
                    opacity: Math.random() * 0.5 + 0.3,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`
                  }}
                />
              );
            })}
          </>
        )}
        
        {/* Hill home appears */}
        {showHillhouse && (
          <div className="absolute bottom-0 left-0 right-0 h-[40vh]">
            <div className="relative w-full h-full">
              {/* Hill silhouette */}
              <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-[#0a1828] rounded-tl-[50%] rounded-tr-[40%]" />
              
              {/* Home silhouette */}
              <div className="absolute bottom-[20%] left-[50%] translate-x-[-50%] w-[100px] h-[80px]">
                <div className="absolute bottom-0 w-full h-[60%] bg-[#162a3a]" />
                <div className="absolute bottom-[60%] left-[50%] translate-x-[-50%] w-[70%] h-[40%] bg-[#162a3a]"
                     style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }} />
                
                {/* Window with warm light */}
                <div className="absolute bottom-[30%] left-[50%] translate-x-[-50%] w-[20px] h-[20px] bg-[#ffb84d] opacity-80 rounded-sm" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Narrative text */}
      <div className={`absolute inset-0 flex items-center justify-center 
                      transition-opacity duration-1000
                      ${transitionState === 'stars' ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-white text-xl font-light tracking-wide">
          You return to your hill home as night falls...
        </p>
      </div>
    </div>
  );
};

export default DayNightTransition;

// Add this to your CSS (tailwind.css)
/*
@keyframes twinkle {
  0% { opacity: var(--base-opacity); }
  50% { opacity: 1; }
  100% { opacity: var(--base-opacity); }
}

.animate-twinkle {
  animation: twinkle var(--duration, 3s) ease-in-out infinite;
  --base-opacity: 0.6;
}
*/