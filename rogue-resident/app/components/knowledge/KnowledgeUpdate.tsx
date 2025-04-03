'use client';
import { useState, useEffect } from 'react';
import { useGameEffects } from '../GameEffects';
import { PixelText } from '../PixelThemeProvider';

interface KnowledgeUpdateProps {
  conceptName: string;
  domainName: string;
  domainColor: string;
  gainAmount: number;
  onComplete?: () => void;
}

export default function KnowledgeUpdate({
  conceptName,
  domainName,
  domainColor,
  gainAmount,
  onComplete
}: KnowledgeUpdateProps) {
  const [visible, setVisible] = useState(true);
  const [animationStage, setAnimationStage] = useState<'enter' | 'active' | 'exit'>('enter');
  const { playSound } = useGameEffects();
  
  // Play sound effect when component mounts
  useEffect(() => {
    if (playSound) {
      // Use compatible sound effects based on gain amount
      if (gainAmount >= 20) {
        // Major knowledge gain - use success sound
        playSound('success');
      } else if (gainAmount >= 10) {
        // Medium knowledge gain - use click sound
        playSound('click');
      } else {
        // Minor knowledge gain - use a soft sound
        playSound('select');
      }
      
      // TODO: Add specific knowledge gain sounds to SoundEffect type
      // For now, using compatible sound effects as placeholders
    }
    
    // Animation sequence
    const enterTimer = setTimeout(() => {
      setAnimationStage('active');
    }, 500);
    
    const activeTimer = setTimeout(() => {
      setAnimationStage('exit');
    }, 2500);
    
    const exitTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 3000);
    
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(activeTimer);
      clearTimeout(exitTimer);
    };
  }, [gainAmount, onComplete, playSound]);
  
  if (!visible) return null;
  
  // Style based on gain amount
  const getGainStyle = () => {
    if (gainAmount >= 20) {
      return 'text-2xl font-bold';
    } else if (gainAmount >= 10) {
      return 'text-xl';
    } else {
      return 'text-lg';
    }
  };
  
  // Get animation classes based on stage
  const getAnimationClass = () => {
    switch (animationStage) {
      case 'enter':
        return 'opacity-0 scale-95 translate-y-4';
      case 'active':
        return 'opacity-100 scale-100 translate-y-0';
      case 'exit':
        return 'opacity-0 scale-105 -translate-y-4';
    }
  };
  
  return (
    <div 
      className={`
        fixed top-1/4 left-1/2 transform -translate-x-1/2
        z-50 pointer-events-none
        transition-all duration-500 ease-in-out
        ${getAnimationClass()}
      `}
    >
      <div 
        className="bg-surface/90 backdrop-blur-sm pixel-borders p-4 min-w-[300px] max-w-[400px]"
        style={{ borderColor: domainColor }}
      >
        <div className="text-center mb-2">
          <PixelText className="text-educational-light">Knowledge Updated</PixelText>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <PixelText className="text-md font-medium">{conceptName}</PixelText>
            <PixelText className="text-sm text-text-secondary">{domainName}</PixelText>
          </div>
          
          <div 
            className={`${getGainStyle()} font-pixel`}
            style={{ color: domainColor }}
          >
            +{gainAmount}%
          </div>
        </div>
        
        {/* Progress visualization */}
        <div className="w-full h-2 bg-surface-dark">
          <div 
            className="h-full"
            style={{ 
              width: `${gainAmount}%`,
              backgroundColor: domainColor,
              transition: 'width 1s ease-in-out'
            }}
          ></div>
        </div>
        
        {/* Insight bonus for significant gains */}
        {gainAmount >= 15 && (
          <div className="mt-2 text-center">
            <PixelText className="text-sm text-clinical-light">+{Math.floor(gainAmount / 5)} Insight Bonus</PixelText>
          </div>
        )}
        
        {/* Special indicator for major knowledge updates */}
        {gainAmount >= 25 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-educational rounded-full flex items-center justify-center text-white text-xs">
            ⭐
          </div>
        )}
      </div>
    </div>
  );
}