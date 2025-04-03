// app/components/GameEffects.tsx
'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SoundEffect, getSoundFallback } from '../types/audio';

interface GameEffectsContextType {
  playSound: (effect: SoundEffect) => void;
  stopSound: (effect: SoundEffect) => void;
  flashScreen: (color: 'white' | 'red' | 'green' | 'blue' | 'yellow') => void;
  shakeScreen: (intensity: 'light' | 'medium' | 'heavy') => void;
  showCompletionEffect: (x: number, y: number) => void;
  showRewardEffect: (count: number, x: number, y: number) => void;
  showDamageEffect: (count: number, x: number, y: number) => void;
  showHealEffect: (count: number, x: number, y: number) => void;
}

// Create the context
const GameEffectsContext = createContext<GameEffectsContextType | null>(null);

// Sound effect mapping - maps our type system to actual sound files
const soundMap: Record<string, string> = {
  "click": "/sounds/ui-click.mp3",
  "hover": "/sounds/ui-hover.mp3",
  "select": "/sounds/node-select.mp3",
  "back": "/sounds/ui-back.mp3",
  "success": "/sounds/success.mp3",
  "failure": "/sounds/failure.mp3",
  "warning": "/sounds/warning.mp3",
  "error": "/sounds/error.mp3",
  "challenge-complete": "/sounds/challenge-complete.mp3",
  "node-select": "/sounds/node-select.mp3",
  "node-hover": "/sounds/node-hover.mp3",
  "dialogue-select": "/sounds/dialogue-select.mp3",
  "knowledge-select": "/sounds/knowledge-select.mp3",
  "knowledge-connect": "/sounds/knowledge-connect.mp3",
}; 

// Provider component
export function GameEffectsProvider({ children }: { children: React.ReactNode }) {
  // State for effects
  const [flash, setFlash] = useState<{ color: string, active: boolean }>({ color: 'white', active: false });
  const [shake, setShake] = useState<{ intensity: string, active: boolean }>({ intensity: 'light', active: false });
  
  // Sound cache
  const [soundCache, setSoundCache] = useState<Record<string, HTMLAudioElement>>({});
  
  // Preload sounds when component mounts
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const cache: Record<string, HTMLAudioElement> = {};
      
      // Preload core sounds
      Object.entries(soundMap).forEach(([key, path]) => {
        try {
          const audio = new Audio(path);
          audio.preload = 'auto';
          cache[key] = audio;
        } catch (err) {
          console.warn(`Failed to preload sound: ${key}`, err);
        }
      });
      
      setSoundCache(cache);
    }
    
    return () => {
      // Cleanup sounds when component unmounts
      Object.values(soundCache).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);
  
  // Play sound effect
  const playSound = useCallback((effect: SoundEffect) => {
    // Get the base sound (using fallbacks if needed)
    const baseSound = getSoundFallback(effect);
    
    // Check if sound exists in cache
    if (soundCache[baseSound]) {
      try {
        // Clone the audio to allow for overlapping sounds
        const audio = soundCache[baseSound].cloneNode() as HTMLAudioElement;
        audio.volume = 0.5; // Default volume
        audio.play().catch(err => {
          console.warn(`Failed to play sound: ${effect}`, err);
        });
      } catch (err) {
        console.warn(`Error playing sound: ${effect}`, err);
      }
    } else {
      console.warn(`Sound not found in cache: ${effect} (fallback: ${baseSound})`);
    }
  }, [soundCache]);
  
  // Stop a specific sound
  const stopSound = useCallback((effect: SoundEffect) => {
    const baseSound = getSoundFallback(effect);
    if (soundCache[baseSound]) {
      soundCache[baseSound].pause();
      soundCache[baseSound].currentTime = 0;
    }
  }, [soundCache]);
  
  // Flash screen effect
  const flashScreen = useCallback((color: 'white' | 'red' | 'green' | 'blue' | 'yellow') => {
    setFlash({ color, active: true });
    setTimeout(() => {
      setFlash(prev => ({ ...prev, active: false }));
    }, 300);
  }, []);
  
  // Screen shake effect
  const shakeScreen = useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    setShake({ intensity, active: true });
    setTimeout(() => {
      setShake(prev => ({ ...prev, active: false }));
    }, 500);
  }, []);
  
  // Completion effect
  const showCompletionEffect = useCallback((x: number, y: number) => {
    // Logic for completion particles
    console.log(`Completion effect at ${x}, ${y}`);
    playSound('success');
  }, [playSound]);
  
  // Reward effect with particle count
  const showRewardEffect = useCallback((count: number, x: number, y: number) => {
    // Logic for reward particles
    console.log(`Reward effect (${count} particles) at ${x}, ${y}`);
    playSound('success');
  }, [playSound]);
  
  // Damage effect
  const showDamageEffect = useCallback((count: number, x: number, y: number) => {
    // Logic for damage particles
    console.log(`Damage effect (${count} particles) at ${x}, ${y}`);
    playSound('failure');
  }, [playSound]);
  
  // Heal effect
  const showHealEffect = useCallback((count: number, x: number, y: number) => {
    // Logic for heal particles
    console.log(`Heal effect (${count} particles) at ${x}, ${y}`);
    playSound('success');
  }, [playSound]);
  
  // Context value
  const value = {
    playSound,
    stopSound,
    flashScreen,
    shakeScreen,
    showCompletionEffect,
    showRewardEffect,
    showDamageEffect,
    showHealEffect
  };
  
  return (
    <GameEffectsContext.Provider value={value}>
      {children}
      
      {/* Screen flash effect overlay */}
      {flash.active && (
        <div 
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{ 
            backgroundColor: flash.color, 
            opacity: 0.3 
          }}
        />
      )}
      
      {/* Screen shake effect */}
      <div 
        className={`${shake.active ? 'game-screen-shake' : ''}`}
        data-intensity={shake.intensity}
      >
        {children}
      </div>
      
      <style jsx global>{`
        /* Screen shake animations */
        @keyframes shake-light {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(0); }
          75% { transform: translateX(2px); }
        }
        
        @keyframes shake-medium {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(0); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes shake-heavy {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          50% { transform: translateX(0); }
          75% { transform: translateX(10px); }
        }
        
        .game-screen-shake[data-intensity="light"] {
          animation: shake-light 0.3s ease-in-out;
        }
        
        .game-screen-shake[data-intensity="medium"] {
          animation: shake-medium 0.5s ease-in-out;
        }
        
        .game-screen-shake[data-intensity="heavy"] {
          animation: shake-heavy 0.7s ease-in-out;
        }
      `}</style>
    </GameEffectsContext.Provider>
  );
}

// Custom hook for using game effects
export function useGameEffects() {
  const context = useContext(GameEffectsContext);
  if (!context) {
    throw new Error('useGameEffects must be used within a GameEffectsProvider');
  }
  return context;
}