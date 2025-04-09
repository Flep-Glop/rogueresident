// app/components/DayNightTransition.tsx
// Refactored DayNightTransition - Purely Presentational
import React from 'react';
import { useGameState } from '../core/statemachine/GameStateMachine';

const DayNightTransition: React.FC = () => {
  const { gamePhase } = useGameState();

  // Determine visibility and animation based solely on gamePhase
  const isVisible = gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night';
  const isFadingOut = gamePhase === 'transition_to_night'; // Fading to black for night
  const isFadingIn = gamePhase === 'transition_to_day'; // Fading from black for day

  if (!isVisible) {
    return null;
  }

  // Define transition styles
  const transitionStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'black',
    opacity: isFadingOut ? 1 : 0, // Start opaque for fade-out, start transparent for fade-in
    transition: 'opacity 800ms ease-in-out', // Use duration from state machine (or define here)
    pointerEvents: 'none', // Ensure it doesn't block interactions
  };

  // For day transition, we need to simulate the fade *in* (from black to transparent)
  // We achieve this by setting initial opacity to 1 and transitioning to 0
  const dayTransitionStyle: React.CSSProperties = isFadingIn ? {
      ...transitionStyle,
      opacity: 1, // Start opaque
      animation: 'fadeOutEffect 800ms ease-in-out forwards' // Use animation to fade out
  } : transitionStyle;


  // Optional: Add text or simple animation based on phase
  const renderTransitionContent = () => {
    if (gamePhase === 'transition_to_night') {
      return (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center' }}>
          <p className="animate-pulse">Returning to Hill Home...</p>
          {/* Add simple star/moon visuals if desired */}
        </div>
      );
    } else if (gamePhase === 'transition_to_day') {
      return (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center' }}>
           <p className="animate-pulse">Heading to the Hospital...</p>
           {/* Add simple sun/sky visuals if desired */}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div style={dayTransitionStyle}>
        {renderTransitionContent()}
      </div>
      {/* Add fade-out animation style */}
       <style jsx global>{`
          @keyframes fadeOutEffect {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
          }
          .animate-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
    </>
  );
};

export default DayNightTransition;