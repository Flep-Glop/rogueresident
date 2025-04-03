'use client';
import { useState, useEffect } from 'react';
import { PixelText } from '../PixelThemeProvider';

interface KnowledgeToastProps {
  concept: {
    id: string;
    name: string;
    category: string;
    description?: string;
  };
  onComplete: () => void;
}

export default function KnowledgeToast({ concept, onComplete }: KnowledgeToastProps) {
  const [animationState, setAnimationState] = useState('entering');
  
  useEffect(() => {
    // Sequence the animation states with precise timing for satisfying progression
    const enterTimer = setTimeout(() => setAnimationState('active'), 300);
    const activeTimer = setTimeout(() => setAnimationState('particles'), 1200);
    const particleTimer = setTimeout(() => setAnimationState('exiting'), 2500);
    const exitTimer = setTimeout(() => onComplete(), 3000);
    
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(activeTimer);
      clearTimeout(particleTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div className={`
      fixed right-4 top-16 z-50 
      transition-all duration-300 transform
      ${animationState === 'entering' ? 'translate-x-full opacity-0' : 
        animationState === 'exiting' ? 'translate-y-[-20px] opacity-0' : 
        'translate-x-0 opacity-100'}
    `}>
      <div className="bg-surface-dark pixel-borders-thin w-64 overflow-hidden">
        <div className="bg-educational px-3 py-2 border-b border-border">
          <PixelText>Knowledge Acquired</PixelText>
        </div>
        <div className="p-3 relative">
          <PixelText className="text-educational-light font-bold mb-1">{concept.name}</PixelText>
          <PixelText className="text-xs text-text-secondary">{concept.category}</PixelText>
          
          {/* Extra details if available */}
          {concept.description && (
            <div className="mt-2 text-xs text-text-secondary font-pixel opacity-80">
              {concept.description.length > 60 
                ? concept.description.substring(0, 60) + '...' 
                : concept.description}
            </div>
          )}
          
          {/* Particle effect during 'particles' state */}
          {animationState === 'particles' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Star particles that flow toward journal icon */}
              <div className="absolute top-1/2 right-0 w-2 h-2 bg-educational rounded-full"
                   style={{ animation: 'particle-flow 1.5s ease-in-out forwards' }}></div>
              <div className="absolute top-1/3 right-0 w-1 h-1 bg-educational-light rounded-full"
                   style={{ animation: 'particle-flow 1.7s ease-in-out forwards', animationDelay: '100ms' }}></div>
              <div className="absolute top-2/3 right-0 w-1 h-1 bg-clinical rounded-full"
                   style={{ animation: 'particle-flow 1.6s ease-in-out forwards', animationDelay: '200ms' }}></div>
              <div className="absolute top-1/4 right-0 w-2 h-2 bg-qa rounded-full"
                   style={{ animation: 'particle-flow 1.8s ease-in-out forwards', animationDelay: '300ms' }}></div>
              <div className="absolute top-3/4 right-0 w-1 h-1 bg-clinical-light rounded-full"
                   style={{ animation: 'particle-flow 1.5s ease-in-out forwards', animationDelay: '400ms' }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}