'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';

interface ResidentPortraitProps {
  showFullBody?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showMasteryGlow?: boolean;
}

/**
 * ResidentPortrait - Renders the resident character portrait
 * 
 * Dynamically switches between headshot and full-body views based on context
 * and adds visual feedback based on knowledge mastery.
 */
export default function ResidentPortrait({ 
  showFullBody = false,
  className = '',
  size = 'md',
  showMasteryGlow = true
}: ResidentPortraitProps) {
  const { gamePhase } = useGameState();
  const { totalMastery, newlyDiscovered } = useKnowledgeStore();
  
  // Local animation states
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Apply pulse effect when new knowledge is discovered
  useEffect(() => {
    if (newlyDiscovered.length > 0) {
      setPulseEffect(true);
      
      // Clear effect after animation
      const timer = setTimeout(() => {
        setPulseEffect(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [newlyDiscovered]);
  
  // Size variants for the portrait
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };
  
  // Determine which portrait to show
  const portraitType = showFullBody ? 'full' : 'portrait';
  
  // Mastery halo color based on total knowledge mastery
  const getHaloColor = () => {
    if (totalMastery >= 75) return 'rgba(34, 197, 94, 0.4)'; // Green for high mastery
    if (totalMastery >= 50) return 'rgba(147, 51, 234, 0.4)'; // Purple for medium mastery
    if (totalMastery >= 25) return 'rgba(37, 99, 235, 0.4)'; // Blue for low mastery
    return 'rgba(37, 99, 235, 0.15)'; // Dim blue for beginning mastery
  };
  
  // Mastery halo intensity based on total knowledge mastery
  const getHaloIntensity = () => {
    if (totalMastery >= 75) return 'lg';
    if (totalMastery >= 50) return 'md';
    if (totalMastery >= 25) return 'sm';
    return 'xs';
  };
  
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Knowledge mastery halo */}
      {showMasteryGlow && (
        <div 
          className={`absolute -inset-1 rounded-full blur-${getHaloIntensity()}`}
          style={{ 
            backgroundColor: getHaloColor(),
            opacity: gamePhase === 'night' ? 0.8 : 0.4,
            zIndex: 0
          }}
        />
      )}
      
      {/* Character portrait */}
      <AnimatePresence mode="wait">
        <motion.div
          key={portraitType}
          className={`relative ${sizeClasses[size]} overflow-hidden ${
            portraitType === 'full' ? 'rounded-md' : 'rounded-full'
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            transition: { type: 'spring', damping: 15 }
          }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Image
            src={`/images/resident-${portraitType}.png`}
            alt="Medical Physics Resident"
            layout="fill"
            objectFit="cover"
            className="pixel-art"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Pulse effect when new knowledge is gained */}
          {pulseEffect && (
            <motion.div
              className="absolute inset-0 bg-educational"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.3, 0],
                transition: { repeat: 2, duration: 1 }
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Day/night phase indicator */}
      <div 
        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface
          ${gamePhase === 'day' ? 'bg-clinical' : 'bg-educational'}
        `}
      />
    </div>
  );
}