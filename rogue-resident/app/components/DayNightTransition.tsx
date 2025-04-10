// app/components/DayNightTransition.tsx
/**
 * DayNightTransition Component - Enhanced with Chamber Pattern fixes
 * 
 * Core improvements:
 * 1. Standardized hook ordering
 * 2. Fixed hook stabilization issues
 * 3. Enhanced cleanup handling
 * 4. Improved animation timing
 * 5. More resilient DOM manipulation
 */
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import useGameStateMachine from '../core/statemachine/GameStateMachine';
import { usePrimitiveStoreValue, useStableCallback } from '../core/utils/storeHooks';

// Constants for transition naming
const PHASE_TO_NIGHT = 'transition_to_night';
const PHASE_TO_DAY = 'transition_to_day';
const PHASE_NIGHT = 'night';
const PHASE_DAY = 'day';

// Animation timing constants
const TRANSITION_DURATION = 800;
const SAFETY_BUFFER = 50;

const DayNightTransition: React.FC = () => {
  // ======== REFS (Keep all refs together for hook order stability) ========
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // ======== SELECTORS (Stably memoized) ========
  const gamePhaseSelector = useMemo(() => 
    (state: any) => state.gamePhase,
  []);
  
  // ======== PRIMITIVE STATE EXTRACTION ========
  // Access gamePhase with primitive selector
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    gamePhaseSelector,
    PHASE_DAY // Fallback to day if undefined
  );
  
  // ======== COMPUTED VALUES ========
  // Determine visibility based on gamePhase - no hooks, just derived values
  const isVisible = gamePhase === PHASE_TO_DAY || gamePhase === PHASE_TO_NIGHT;
  const isFadingOut = gamePhase === PHASE_TO_NIGHT; // Fading to black for night
  const isFadingIn = gamePhase === PHASE_TO_DAY; // Fading from black for day
  
  // ======== STABLE CALLBACKS ========
  // Finalize transition after animation completes - extract to stable function
  const finalizeTransition = useStableCallback(() => {
    if (!isMountedRef.current) return;
    
    // Get fresh reference to stateMachine to avoid closure issues
    const stateMachine = useGameStateMachine.getState();
    
    if (gamePhase === PHASE_TO_NIGHT && stateMachine.finalizeNightTransition) {
      console.log('[DayNightTransition] Finalizing night transition');
      stateMachine.finalizeNightTransition();
    } else if (gamePhase === PHASE_TO_DAY && stateMachine.finalizeDayTransition) {
      console.log('[DayNightTransition] Finalizing day transition');
      stateMachine.finalizeDayTransition();
    }
  }, [gamePhase]);
  
  // Handler to trigger star animations
  const animateStars = useStableCallback(() => {
    if (!starsRef.current || !isMountedRef.current) return;
    
    const stars = starsRef.current.querySelectorAll('.star');
    stars.forEach((star, index) => {
      const starEl = star as HTMLElement;
      // Stagger animation start times
      starEl.style.animationDelay = `${index * 0.2}s`;
      starEl.classList.add('twinkle');
    });
  }, []);
  
  // Handler to trigger sun animation
  const animateSun = useStableCallback(() => {
    if (!sunRef.current || !isMountedRef.current) return;
    
    sunRef.current.classList.add('sun-animation');
    
    // Add rays with dynamic positioning
    const sunRays = sunRef.current.querySelector('.sun-rays');
    if (sunRays) {
      for (let i = 0; i < 12; i++) {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        ray.style.transform = `rotate(${i * 30}deg)`;
        ray.style.animationDelay = `${i * 0.1}s`;
        sunRays.appendChild(ray);
      }
    }
  }, []);
  
  // ======== EFFECTS ========
  // Track component mounting status - FIRST EFFECT
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any pending timeouts
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Handle animation start when phase changes - SECOND EFFECT
  useEffect(() => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !isMountedRef.current) return;
    
    // Clear any existing animation timeout to prevent overlap
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    if (isVisible) {
      console.log(`[DayNightTransition] Starting ${gamePhase} animation`);
      
      // Add appropriate animation classes based on transition direction
      if (isFadingOut) {
        // Night transition: Fade to black
        overlay.style.opacity = '0';
        // Force reflow to trigger animation
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        
        if (content) {
          content.classList.add('fade-in-animation');
          content.classList.remove('fade-out-animation');
          // Trigger star animation
          animateStars();
        }
      } else if (isFadingIn) {
        // Day transition: Start black, fade to transparent
        overlay.style.opacity = '1';
        // Force reflow to trigger animation
        void overlay.offsetWidth;
        
        // Add animation class for fade out
        overlay.classList.add('fade-out-animation');
        
        if (content) {
          content.classList.add('fade-out-animation');
          content.classList.remove('fade-in-animation');
          // Trigger sun animation
          animateSun();
        }
      }
      
      // Set timeout to finalize transition after animation completes
      // This is safer than using animationend event which can be missed
      animationTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        finalizeTransition();
        
        // Clean up animation classes after completion
        if (overlay) {
          overlay.classList.remove('fade-out-animation');
        }
        
        animationTimeoutRef.current = null;
      }, TRANSITION_DURATION + SAFETY_BUFFER);
    } else {
      // Reset classes when not visible
      if (overlay) {
        overlay.classList.remove('fade-out-animation', 'fade-in-animation');
        overlay.style.opacity = '0';
      }
      
      if (content) {
        content.classList.remove('fade-out-animation', 'fade-in-animation');
      }
    }
    
    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [gamePhase, isVisible, isFadingIn, isFadingOut, finalizeTransition, animateStars, animateSun]);
  
  // If not visible and not in production, render nothing
  // In development, we'll render with opacity 0 for debugging
  if (!isVisible && process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Define transition styles as a base
  const transitionStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'black',
    transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
    pointerEvents: 'none', // Ensure it doesn't block interactions
    opacity: isVisible ? undefined : 0, // Allow debugging in development
  };
  
  // Render content based on phase
  const renderTransitionContent = () => {
    if (gamePhase === PHASE_TO_NIGHT) {
      return (
        <div 
          ref={contentRef}
          style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            color: 'white', 
            textAlign: 'center' 
          }}
          className="pulse-animation"
        >
          <p>Returning to Hill Home...</p>
          <div ref={starsRef} className="star-field">
            {/* Generated stars */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="star" 
                style={{ 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 100}%`,
                }} 
              />
            ))}
          </div>
        </div>
      );
    } else if (gamePhase === PHASE_TO_DAY) {
      return (
        <div 
          ref={contentRef}
          style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            color: 'white', 
            textAlign: 'center' 
          }}
          className="pulse-animation"
        >
          <p>Heading to the Hospital...</p>
          <div ref={sunRef} className="sun-container">
            <div className="sun-rays"></div>
            <div className="sun"></div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <>
      <div 
        ref={overlayRef}
        style={transitionStyle}
        data-phase={gamePhase} // For debugging
      >
        {renderTransitionContent()}
      </div>
      
      {/* Define animations in a style tag to avoid render cycles */}
      <style jsx global>{`
        @keyframes fadeOutEffect {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes fadeInEffect {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulseEffect {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes twinkleEffect {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes rotateEffect {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes rayGrowEffect {
          0% { height: 0; opacity: 0; }
          50% { height: 30px; opacity: 1; }
          100% { height: 15px; opacity: 0.7; }
        }
        
        .fade-out-animation {
          animation: fadeOutEffect ${TRANSITION_DURATION}ms ease-in-out forwards;
        }
        
        .fade-in-animation {
          animation: fadeInEffect ${TRANSITION_DURATION}ms ease-in-out forwards;
        }
        
        .pulse-animation {
          animation: pulseEffect 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        /* Night transition elements */
        .star-field {
          position: absolute;
          inset: -100px;
          z-index: -1;
        }
        
        .star {
          position: absolute;
          width: 4px;
          height: 4px;
          background-color: white;
          border-radius: 50%;
          opacity: 0.3;
        }
        
        .star.twinkle {
          animation: twinkleEffect 2s ease-in-out infinite;
        }
        
        /* Day transition elements */
        .sun-container {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 20px auto;
        }
        
        .sun-rays {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }
        
        .sun {
          position: absolute;
          width: 40px;
          height: 40px;
          background-color: #ffef9b;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 20px 10px rgba(255, 239, 155, 0.7);
        }
        
        .sun-ray {
          position: absolute;
          width: 2px;
          height: 0px;
          background-color: rgba(255, 239, 155, 0.8);
          top: 50%;
          left: 50%;
          transform-origin: center bottom;
        }
        
        .sun-animation .sun-ray {
          animation: rayGrowEffect 1.5s ease-out infinite;
        }
        
        .sun-animation .sun {
          animation: pulseEffect 2s ease-in-out infinite;
        }
        
        .sun-animation .sun-rays {
          animation: rotateEffect 10s linear infinite;
        }
      `}</style>
    </>
  );
};

export default DayNightTransition;