'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStateMachine from '@/app/core/statemachine/GameStateMachine';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { usePrimitiveStoreValue, createStableSelector } from '@/app/core/utils/storeHooks';

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
  // FIXED: Using primitive selector directly from the source store, with a fallback value
  // This prevents the object-to-string reference chain that was causing recursive rendering
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine, 
    state => state.gamePhase,
    'day' // Fallback if we get a non-string value somehow
  );
  
  // Use stable selector with explicit property list
  const { totalMastery, newlyDiscovered } = useKnowledgeStore(
    createStableSelector(['totalMastery', 'newlyDiscovered'])
  );
  
  // Local animation states
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Apply pulse effect when new knowledge is discovered
  useEffect(() => {
    if (newlyDiscovered && newlyDiscovered.length > 0) {
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
    // Safely handle undefined totalMastery
    const mastery = totalMastery || 0;
    
    if (mastery >= 75) return 'rgba(34, 197, 94, 0.4)'; // Green for high mastery
    if (mastery >= 50) return 'rgba(147, 51, 234, 0.4)'; // Purple for medium mastery
    if (mastery >= 25) return 'rgba(37, 99, 235, 0.4)'; // Blue for low mastery
    return 'rgba(37, 99, 235, 0.15)'; // Dim blue for beginning mastery
  };
  
  // Mastery halo intensity based on total knowledge mastery
  const getHaloIntensity = () => {
    // Safely handle undefined totalMastery
    const mastery = totalMastery || 0;
    
    if (mastery >= 75) return 'lg';
    if (mastery >= 50) return 'md';
    if (mastery >= 25) return 'sm';
    return 'xs';
  };
  
  // Defensive logging to track if we're still getting non-string phases
  // This helps trace any continued issues without breaking the component
  if (typeof gamePhase !== 'string') {
    console.warn(`[ResidentPortrait] Received non-string gamePhase: ${gamePhase}, using fallback`);
  }
  
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
            fill={true}
            style={{ 
              objectFit: 'cover',
              imageRendering: 'pixelated'
            }}
            className="pixel-art"
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
          ${gamePhase === 'night' ? 'bg-educational' : 'bg-clinical'}
        `}
        data-phase={gamePhase} /* Help with debugging */
      />
    </div>
  );
}