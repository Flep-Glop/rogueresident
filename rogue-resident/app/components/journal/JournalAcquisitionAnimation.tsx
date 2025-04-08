// app/components/journal/JournalAcquisitionAnimation.tsx
import React, { useEffect, useState } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { useEventSubscription } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';

interface JournalAcquisitionAnimationProps {
  onComplete?: () => void;
}

/**
 * JournalAcquisitionAnimation - Displays an animation when the player
 * acquires a journal, with a button to open it after acquisition
 */
export default function JournalAcquisitionAnimation({ 
  onComplete 
}: JournalAcquisitionAnimationProps) {
  // State for animation phases
  const [show, setShow] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'fadeIn' | 'display' | 'fadeOut'>('fadeIn');
  const [journalTier, setJournalTier] = useState<'base' | 'technical' | 'annotated'>('base');
  
  // Access journal store
  const { toggleJournal, hasJournal } = useJournalStore();
  
  // Listen for journal acquisition events
  useEventSubscription(
    GameEventType.JOURNAL_ACQUIRED,
    (event) => {
      const payload = event.payload as any;
      if (payload && payload.tier) {
        setJournalTier(payload.tier);
        setShow(true);
        setAnimationPhase('fadeIn');
        
        // Transition to display phase after fade in
        setTimeout(() => {
          setAnimationPhase('display');
        }, 1000);
      }
    },
    []
  );
  
  // Handle animation completion
  const handleClose = () => {
    setAnimationPhase('fadeOut');
    
    // Hide component after fade out
    setTimeout(() => {
      setShow(false);
      if (onComplete) {
        onComplete();
      }
    }, 1000);
  };
  
  // Handle journal open button
  const handleOpenJournal = () => {
    toggleJournal();
    handleClose();
  };
  
  // Don't render if not showing or if player doesn't have journal
  if (!show || !hasJournal) {
    return null;
  }
  
  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-[1000] bg-black/80
        ${animationPhase === 'fadeIn' ? 'animate-fadeIn' : ''}
        ${animationPhase === 'fadeOut' ? 'animate-fadeOut' : ''}
      `}
    >
      <div className="max-w-md text-center">
        {/* Journal icon */}
        <div className="w-32 h-40 mx-auto mb-6 relative">
          <div 
            className={`w-full h-full ${
              journalTier === 'base' ? 'bg-amber-800' :
              journalTier === 'technical' ? 'bg-clinical' :
              'bg-clinical-light'
            } shadow-lg rounded-sm animate-float`}
          >
            <div className="absolute inset-2 border border-amber-500/30"></div>
            
            {/* Visual embellishments based on tier */}
            {journalTier === 'technical' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-amber-500/50 rounded-full"></div>
              </div>
            )}
            
            {journalTier === 'annotated' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-amber-500/50 rounded-full"></div>
                <div className="absolute inset-0 m-auto w-10 h-10 border-2 border-amber-300/70 transform rotate-45"></div>
              </div>
            )}
            
            {/* Particle effects */}
            <div className="absolute -inset-4 pointer-events-none">
              <div className="absolute top-0 left-1/2 w-1 h-1 bg-clinical rounded-full animate-particle1"></div>
              <div className="absolute top-0 left-1/3 w-2 h-2 bg-educational rounded-full animate-particle2"></div>
              <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-qa rounded-full animate-particle3"></div>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-pixel text-white mb-4 animate-glow">
          Journal Acquired!
        </h2>
        
        {/* Description based on tier */}
        <p className="text-gray-300 mb-6">
          {journalTier === 'base' && "You've received a basic notebook to record your observations."}
          {journalTier === 'technical' && "You've received a technical journal with specialized sections for medical physics notes."}
          {journalTier === 'annotated' && "You've received an annotated journal with expert guidance and reference sections!"}
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
      
      {/* CSS for animations */}
      <style jsx>{`
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
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-particle1 {
          animation: particle1 2s ease-out infinite;
        }
        
        .animate-particle2 {
          animation: particle2 2.5s ease-out infinite;
        }
        
        .animate-particle3 {
          animation: particle3 3s ease-out infinite;
        }
      `}</style>
    </div>
  );
}