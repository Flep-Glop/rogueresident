'use client';
import { useEffect, useState, useRef } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useGameEffects } from '../GameEffects';
import { PixelText } from '../PixelThemeProvider';
import { GameEventType, useEventBus } from '../../core/events/GameEvents';
import Image from 'next/image';

// Define expanded sound effect types
export type JournalSoundEffect = 
  | 'ui-click' 
  | 'success' 
  | 'item-acquired' 
  | 'challenge-complete';

export default function JournalIcon() {
  const { 
    hasJournal, 
    toggleJournal, 
    isOpen, 
    currentUpgrade 
  } = useJournalStore();
  
  const { gamePhase } = useGameStore();
  const { playSound } = useGameEffects();
  
  // Track previous journal state for acquisition detection
  const previousHasJournalRef = useRef(hasJournal);
  
  // Enhanced animation states
  const [isNotifying, setIsNotifying] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showKnowledgeFlow, setShowKnowledgeFlow] = useState(false);
  const [bounceAnimation, setBounceAnimation] = useState(false);
  
  // Journal acquisition animation state
  const [showAcquisitionAnimation, setShowAcquisitionAnimation] = useState(false);
  
  // Set pulse animation based on game phase
  useEffect(() => {
    if (gamePhase === 'night' && hasJournal) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [gamePhase, hasJournal]);
  
  // Listen for journal acquisition events
  useEffect(() => {
    // Subscribe to journal acquisition events
    const unsubscribe = useEventBus.getState().subscribe(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        console.log(`[JOURNAL ICON] Journal acquisition event received:`, event.payload);
        
        // Only show animation if this is a new journal (not already had one)
        if (!previousHasJournalRef.current && hasJournal) {
          triggerAcquisitionAnimation();
        }
      }
    );
    
    return () => unsubscribe();
  }, [hasJournal]);
  
  // Check for journal acquisition based on direct state changes
  useEffect(() => {
    if (hasJournal && !previousHasJournalRef.current) {
      console.log('[JOURNAL ICON] Journal newly acquired!');
      triggerAcquisitionAnimation();
    }
    
    previousHasJournalRef.current = hasJournal;
  }, [hasJournal]);
  
  // When new knowledge is added, show enhanced notification
  useEffect(() => {
    // This would hook into knowledgeStore updates in a full implementation
    // For prototype, we'll just trigger it on journal open/close
    
    const handleKnowledgeChange = () => {
      if (hasJournal && !isOpen) {
        setIsNotifying(true);
        setBounceAnimation(true);
        
        // Show knowledge flow animation shortly after notification appears
        setTimeout(() => setShowKnowledgeFlow(true), 300);
        
        // Clean up animations after delays
        setTimeout(() => setBounceAnimation(false), 1000);
        setTimeout(() => setShowKnowledgeFlow(false), 3000);
        setTimeout(() => setIsNotifying(false), 5000);
      }
    };
    
    // Mock trigger for prototype demo
    if (hasJournal && !isOpen) {
      const timer = setTimeout(handleKnowledgeChange, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasJournal, isOpen]);
  
  // Helper to trigger acquisition animation with sound effect
  const triggerAcquisitionAnimation = () => {
    console.log('[JOURNAL ICON] Triggering acquisition animation');
    setShowAcquisitionAnimation(true);
    
    // Play acquisition sound
    if (playSound) {
      // Use a sound that's already defined in your game's sound system
      // This could be 'success' or 'challenge-complete' instead of 'item-acquired'
      playSound('success');
      setTimeout(() => playSound('success'), 300);
    }
    
    // Add bounce effect
    setBounceAnimation(true);
    
    // Clear animations after delay
    setTimeout(() => setBounceAnimation(false), 1500);
    setTimeout(() => setShowAcquisitionAnimation(false), 3000);
  };
  
  // Don't render if player doesn't have journal yet
  if (!hasJournal) return null;
  
  // Get icon style based on journal upgrade level
  const getIconStyle = () => {
    switch(currentUpgrade) {
      case 'base':
        return {
          border: '2px solid #aa8855',
          background: 'linear-gradient(145deg, #926d3d, #c8965a)'
        };
      case 'technical':
        return {
          border: '2px solid var(--clinical-color)',
          background: 'linear-gradient(145deg, var(--clinical-color-dark), var(--clinical-color))'
        };
      case 'annotated':
        return {
          border: '2px solid var(--clinical-light)',
          background: 'linear-gradient(145deg, var(--clinical-color), var(--clinical-light))'
        };
      case 'indexed':
        return {
          border: '2px solid #4a77b3',
          background: 'linear-gradient(145deg, #2c4a70, #4a77b3)'
        };
      case 'integrated':
        return {
          border: '2px solid var(--educational-light)',
          background: 'linear-gradient(145deg, var(--educational-color), var(--educational-light))'
        };
      default:
        return {
          border: '2px solid #aa8855',
          background: 'linear-gradient(145deg, #926d3d, #c8965a)'
        };
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        className={`
          relative w-12 h-12 rounded-md shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isPulsing ? 'animate-pulse' : ''}
          ${isNotifying ? 'scale-110' : 'hover:scale-105'}
          ${gamePhase === 'night' ? 'shadow-educational/30' : ''}
        `}
        style={{
          ...getIconStyle(),
          transform: `translateY(${bounceAnimation ? '-4px' : '0px'})`,
        }}
        onClick={() => {
          toggleJournal();
          if (playSound) playSound('ui-click');
        }}
        aria-label="Open Journal"
      >
        {/* Journal progression visualization */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Book icon with letter J - would be replaced with actual journal sprites */}
          <div className="text-white font-pixel text-xl">J</div>
        </div>
        
        {/* Enhanced notification indicator */}
        {isNotifying && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-educational rounded-full">
            <div className="absolute inset-0 bg-educational rounded-full animate-ping"></div>
          </div>
        )}
        
        {/* Knowledge flow visualization */}
        {showKnowledgeFlow && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-md bg-educational/20 animate-pulse"></div>
            
            {/* Constellation-themed particles */}
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-educational rounded-full"
                 style={{ animation: 'float-particle 2s ease-in-out infinite' }}></div>
            <div className="absolute top-1/3 right-0 w-2 h-2 bg-clinical rounded-full"
                 style={{ animation: 'float-particle 1.8s ease-in-out infinite', animationDelay: '300ms' }}></div>
            <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-qa rounded-full"
                 style={{ animation: 'float-particle 2.2s ease-in-out infinite', animationDelay: '600ms' }}></div>
          </div>
        )}
        
        {/* Night phase special glow */}
        {gamePhase === 'night' && (
          <div className="absolute inset-0 rounded-md bg-educational/20 animate-pulse"></div>
        )}
        
        {/* Journal acquisition animation */}
        {showAcquisitionAnimation && (
          <div className="absolute inset-0 overflow-hidden z-50">
            {/* Radial glow */}
            <div className="absolute inset-0 bg-clinical/30 animate-pulse rounded-md"></div>
            
            {/* Particles */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-clinical rounded-full animate-float-up"></div>
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-clinical-light rounded-full animate-float-up" style={{ animationDelay: '200ms' }}></div>
              <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-clinical-light rounded-full animate-float-up" style={{ animationDelay: '400ms' }}></div>
              <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-clinical rounded-full animate-float-up" style={{ animationDelay: '300ms' }}></div>
              <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-clinical-light rounded-full animate-float-up" style={{ animationDelay: '500ms' }}></div>
            </div>
            
            {/* Acquisition message */}
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-surface px-3 py-1 rounded-md pixel-borders-thin whitespace-nowrap">
              <PixelText className="text-clinical">Journal Acquired!</PixelText>
            </div>
          </div>
        )}
      </button>
      
      {/* Enhanced contextual label */}
      {(isNotifying || gamePhase === 'night' || isPulsing || showAcquisitionAnimation) && (
        <div className="absolute -top-10 right-0 w-32 bg-surface px-2 py-1 text-center pixel-borders-thin animate-fade-in">
          <PixelText className="text-xs">
            {showAcquisitionAnimation ? 'Journal Acquired!' :
             isNotifying ? 'New Knowledge!' : 
             gamePhase === 'night' ? 'Record learnings' : 'Open Journal'}
          </PixelText>
        </div>
      )}
      
      {/* For debugging only - shows if journal exists but isn't visible */}
      {process.env.NODE_ENV === 'development' && hasJournal === false && (
        <div className="absolute -top-10 left-0 bg-red-500 text-white px-2 py-1 text-xs">
          Journal exists but not showing!
        </div>
      )}
    </div>
  );
}