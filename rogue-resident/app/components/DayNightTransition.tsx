// app/components/DayNightTransition.tsx
/**
 * DayNightTransition Component
 * 
 * Handles the visual transition between day and night phases.
 * This is a pure presentational component that responds to game state
 * but doesn't modify it directly - similar to Transistor's scene transitions.
 * 
 * Uses the "Chamber Transition Pattern" from Hades to avoid render loops:
 * 1. Uses refs for DOM manipulation instead of state
 * 2. Animations driven by CSS, not React state
 * 3. Only extracts primitive values from state
 * 4. Phase finalization triggered by animation completion
 */
import React, { useEffect, useRef, useCallback } from 'react';
import useGameStateMachine from '../core/statemachine/GameStateMachine';
import { usePrimitiveStoreValue } from '../core/utils/storeHooks';

const DayNightTransition: React.FC = () => {
  // Access gamePhase directly with primitive selector to avoid reference cycles
  // This prevents the recursive render loop by ensuring stable value references
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.gamePhase,
    'day' // Fallback to day if we get a non-string value
  );
  
  // Keep track of animation state with a ref to avoid render loops
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Determine visibility based on gamePhase
  const isVisible = gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night';
  const isFadingOut = gamePhase === 'transition_to_night'; // Fading to black for night
  const isFadingIn = gamePhase === 'transition_to_day'; // Fading from black for day

  // Finalize transition after animation completes - extract to stable function
  const finalizeTransition = useCallback(() => {
    // Get fresh reference to stateMachine to avoid closure issues
    const stateMachine = useGameStateMachine.getState();
    
    if (gamePhase === 'transition_to_night') {
      stateMachine.finalizeNightTransition();
    } else if (gamePhase === 'transition_to_day') {
      stateMachine.finalizeDayTransition();
    }
  }, [gamePhase]);

  // Handle animation start when phase changes
  useEffect(() => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay) return;
    
    // Clear any existing animation timeout to prevent overlap
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    // Transition duration in ms - keep in sync with CSS
    const TRANSITION_DURATION = 800;

    if (isVisible) {
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
        }
      }
      
      // Set timeout to finalize transition after animation completes
      // This is safer than using animationend event which can be missed
      animationTimeoutRef.current = setTimeout(() => {
        finalizeTransition();
        
        // Clean up animation classes after completion
        if (overlay) {
          overlay.classList.remove('fade-out-animation');
        }
        
        animationTimeoutRef.current = null;
      }, TRANSITION_DURATION + 50); // Add a small buffer
    }
    
    // Cleanup function to remove any pending timeouts on unmount or phase change
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [gamePhase, isVisible, isFadingIn, isFadingOut, finalizeTransition]);

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
    transition: 'opacity 800ms ease-in-out',
    pointerEvents: 'none', // Ensure it doesn't block interactions
    opacity: isVisible ? undefined : 0, // Allow debugging in development
  };

  // Optional: Add text or simple animation based on phase
  const renderTransitionContent = () => {
    if (gamePhase === 'transition_to_night') {
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
          <div className="star-field">
            {/* Generated stars */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="star" 
                style={{ 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`
                }} 
              />
            ))}
          </div>
        </div>
      );
    } else if (gamePhase === 'transition_to_day') {
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
          <div className="sun-rays">
            <div className="sun" />
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
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .fade-out-animation {
          animation: fadeOutEffect 800ms ease-in-out forwards;
        }
        
        .fade-in-animation {
          animation: fadeInEffect 800ms ease-in-out forwards;
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
          animation: twinkle 2s ease-in-out infinite;
        }
        
        /* Day transition elements */
        .sun-rays {
          position: absolute;
          width: 100px;
          height: 100px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: -1;
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
        
        .sun:before {
          content: '';
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
          border: 4px dashed rgba(255, 239, 155, 0.6);
          border-radius: 50%;
          animation: rotate 10s linear infinite;
        }
      `}</style>
    </>
  );
};

export default DayNightTransition;