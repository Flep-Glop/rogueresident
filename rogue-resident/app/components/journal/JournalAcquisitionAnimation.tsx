// app/components/journal/JournalAcquisitionAnimation.tsx
/**
 * JournalAcquisitionAnimation - Enhanced with Chamber Pattern
 * 
 * Improvements:
 * 1. DOM-based animations instead of React state
 * 2. Refs for tracking animation state
 * 3. Stable callbacks for event handling
 * 4. Primitive value extraction from store
 * 5. Proper cleanup on unmount
 */
import React, { useRef, useEffect } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useEventSubscription } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
import { usePrimitiveStoreValue, useStableCallback } from '../../core/utils/storeHooks';

interface JournalAcquisitionAnimationProps {
  onComplete?: () => void;
}

export default function JournalAcquisitionAnimation({ 
  onComplete 
}: JournalAcquisitionAnimationProps) {
  // DOM refs for manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  const journalRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  // Refs for state tracking that don't trigger re-renders
  const isVisibleRef = useRef(false);
  const animationPhaseRef = useRef<'fadeIn' | 'display' | 'fadeOut'>('fadeIn');
  const journalTierRef = useRef<'base' | 'technical' | 'annotated'>('base');
  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  
  // Access journal store with primitive extraction
  const hasJournal = usePrimitiveStoreValue(
    useJournalStore,
    state => state.hasJournal,
    false
  );
  
  const toggleJournal = useStableCallback(() => {
    const journalStore = useJournalStore.getState();
    journalStore.toggleJournal();
  }, []);
  
  // Stable callback for starting the animation
  const startAnimation = useStableCallback((tier: 'base' | 'technical' | 'annotated' = 'base') => {
    if (!containerRef.current || !journalRef.current || !isMountedRef.current) return;
    
    // Set internal state
    journalTierRef.current = tier;
    isVisibleRef.current = true;
    animationPhaseRef.current = 'fadeIn';
    
    // Make container visible
    containerRef.current.style.display = 'flex';
    
    // Force reflow for animation
    void containerRef.current.offsetWidth;
    
    // Start fade in
    containerRef.current.classList.add('animate-fadeIn');
    containerRef.current.classList.remove('animate-fadeOut');
    
    // Apply journal tier styling
    if (journalRef.current) {
      journalRef.current.className = `w-full h-full ${
        tier === 'base' ? 'bg-amber-800' :
        tier === 'technical' ? 'bg-clinical' :
        'bg-clinical-light'
      } shadow-lg rounded-sm animate-float`;
      
      // Add tier-specific elements
      if (tier === 'technical' || tier === 'annotated') {
        const circle = document.createElement('div');
        circle.className = 'absolute inset-0 flex items-center justify-center';
        
        const innerCircle = document.createElement('div');
        innerCircle.className = 'w-16 h-16 border-4 border-amber-500/50 rounded-full';
        circle.appendChild(innerCircle);
        
        journalRef.current.appendChild(circle);
        
        if (tier === 'annotated') {
          const diamond = document.createElement('div');
          diamond.className = 'absolute inset-0 m-auto w-10 h-10 border-2 border-amber-300/70 transform rotate-45';
          circle.appendChild(diamond);
        }
      }
    }
    
    // Start particle effects
    if (particlesRef.current) {
      const particles = particlesRef.current.querySelectorAll('.particle');
      particles.forEach((p, i) => {
        const particle = p as HTMLElement;
        particle.style.animationDelay = `${i * 0.2}s`;
        particle.classList.add('animate-particle');
      });
    }
    
    // Transition to display phase after fade in
    const displayTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      animationPhaseRef.current = 'display';
      if (containerRef.current) {
        containerRef.current.classList.remove('animate-fadeIn');
      }
    }, 1000);
    
    timerRefs.current.push(displayTimer);
  }, []);
  
  // Handle animation completion
  const handleClose = useStableCallback(() => {
    if (!containerRef.current || !isMountedRef.current) return;
    
    animationPhaseRef.current = 'fadeOut';
    
    // Start fade out animation
    containerRef.current.classList.add('animate-fadeOut');
    containerRef.current.classList.remove('animate-fadeIn');
    
    // Hide component after fade out
    const hideTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      isVisibleRef.current = false;
      
      if (containerRef.current) {
        containerRef.current.style.display = 'none';
      }
      
      if (onComplete) {
        onComplete();
      }
    }, 1000);
    
    timerRefs.current.push(hideTimer);
  }, [onComplete]);
  
  // Handle journal open button
  const handleOpenJournal = useStableCallback(() => {
    toggleJournal();
    handleClose();
  }, [toggleJournal, handleClose]);
  
  // Listen for journal acquisition events
  useEventSubscription(
    GameEventType.JOURNAL_ACQUIRED,
    (event) => {
      if (!isMountedRef.current) return;
      
      const payload = event.payload as any;
      const tier = payload?.tier || 'base';
      
      // Start animation with the appropriate tier
      startAnimation(tier);
    },
    []
  );
  
  // Setup and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Hide container initially to avoid flash
    if (containerRef.current) {
      containerRef.current.style.display = 'none';
    }
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      // Clear all pending timers
      timerRefs.current.forEach(timer => clearTimeout(timer));
      timerRefs.current = [];
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 items-center justify-center z-[1000] bg-black/80"
      style={{ display: 'none' }} // Initially hidden
    >
      <div className="max-w-md text-center">
        {/* Journal icon */}
        <div className="w-32 h-40 mx-auto mb-6 relative">
          <div ref={journalRef} className="w-full h-full bg-amber-800 shadow-lg rounded-sm">
            <div className="absolute inset-2 border border-amber-500/30"></div>
            
            {/* Particle effects container */}
            <div ref={particlesRef} className="absolute -inset-4 pointer-events-none">
              <div className="particle absolute top-0 left-1/2 w-1 h-1 bg-clinical rounded-full"></div>
              <div className="particle absolute top-0 left-1/3 w-2 h-2 bg-educational rounded-full"></div>
              <div className="particle absolute bottom-0 right-1/4 w-1 h-1 bg-qa rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Title with glow effect applied via DOM instead of CSS classes */}
        <h2 
          className="text-2xl font-pixel text-white mb-4" 
          style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.7)' }}
        >
          Journal Acquired!
        </h2>
        
        {/* Description based on tier */}
        <p className="text-gray-300 mb-6 journal-description">
          You've received a notebook to record your observations.
        </p>
        
        {/* Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            className="px-6 py-2 bg-clinical hover:bg-clinical-light text-white font-pixel transition-colors"
            onClick={handleOpenJournal}
          >
            Open Journal
          </button>
          
          <button
            className="px-6 py-2 bg-surface hover:bg-surface-dark text-white font-pixel transition-colors"
            onClick={handleClose}
          >
            Continue
          </button>
        </div>
      </div>
      
      {/* CSS for animations - using global style for animation definitions */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
          50% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
        }
        
        @keyframes particle1 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-20px, -50px); opacity: 0; }
        }
        
        @keyframes particle2 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(30px, -40px); opacity: 0; }
        }
        
        @keyframes particle3 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-10px, 60px); opacity: 0; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1s forwards;
        }
        
        .animate-fadeOut {
          animation: fadeOut 1s forwards;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-particle:nth-child(1) {
          animation: particle1 2s ease-out infinite;
        }
        
        .animate-particle:nth-child(2) {
          animation: particle2 2.5s ease-out infinite;
        }
        
        .animate-particle:nth-child(3) {
          animation: particle3 3s ease-out infinite;
        }
      `}</style>
      
      {/* Script for updating description text based on journal tier */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const updateDescription = function() {
              const descriptionEl = document.querySelector('.journal-description');
              if (!descriptionEl) return;
              
              const journalEl = document.querySelector('#journalRef');
              if (!journalEl) return;
              
              // Determine tier from journal class
              let tier = 'base';
              if (journalEl.classList.contains('bg-clinical-light')) {
                tier = 'annotated';
              } else if (journalEl.classList.contains('bg-clinical')) {
                tier = 'technical';
              }
              
              // Update text based on tier
              if (tier === 'base') {
                descriptionEl.textContent = "You've received a basic notebook to record your observations.";
              } else if (tier === 'technical') {
                descriptionEl.textContent = "You've received a technical journal with specialized sections for medical physics notes.";
              } else {
                descriptionEl.textContent = "You've received an annotated journal with expert guidance and reference sections!";
              }
            };
            
            // Run initially and set a mutation observer to check for changes
            updateDescription();
            
            const observer = new MutationObserver(updateDescription);
            observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
          });
        `
      }} />
    </div>
  );
}