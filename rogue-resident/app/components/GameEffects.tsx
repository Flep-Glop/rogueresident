// app/components/GameEffects.tsx
'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  // New methods for enhanced effects
  createStarburstEffect: (x: number, y: number, color?: string, particleCount?: number) => void;
  createConnectionEffect: (startX: number, startY: number, endX: number, endY: number, color?: string) => void;
  createFloatingParticles: (x: number, y: number, count?: number) => void;
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
  
  // Refs for effects containers
  const particleContainerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Helper function to create a single particle element
  const createParticle = useCallback((
    x: number, 
    y: number, 
    color: string = '#ffffff', 
    size: number = 4, 
    duration: number = 1000,
    velocityX: number = 0,
    velocityY: number = 0
  ) => {
    if (!particleContainerRef.current) return null;
    
    // Create particle element
    const particle = document.createElement('div');
    
    // Set initial styles
    particle.style.position = 'absolute';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.opacity = '1';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    particle.style.boxShadow = `0 0 ${size}px ${color}`;
    
    // Position at starting point
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    
    // Add to container
    particleContainerRef.current.appendChild(particle);
    
    // Animate using Web Animations API for better performance
    const keyframes = [
      { 
        transform: 'scale(1) translate(0, 0)', 
        opacity: 1 
      },
      { 
        transform: `scale(0.2) translate(${velocityX}px, ${velocityY}px)`, 
        opacity: 0 
      }
    ];
    
    const animation = particle.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
      fill: 'forwards'
    });
    
    // Remove particle when animation completes
    animation.onfinish = () => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    };
    
    return particle;
  }, []);
  
  // Create starburst effect (particles radiating outward)
  const createStarburstEffect = useCallback((
    x: number, 
    y: number, 
    color: string = '#4bf1ff', 
    particleCount: number = 20
  ) => {
    if (!particleContainerRef.current) return;
    
    // Play a sound
    playSound('knowledge-connect');
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      // Calculate random direction
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 100;
      
      // Calculate end position
      const velocityX = Math.cos(angle) * distance;
      const velocityY = Math.sin(angle) * distance;
      
      // Create particle with random size and duration
      const size = 2 + Math.random() * 4;
      const duration = 800 + Math.random() * 1000;
      
      // Randomize color slightly
      const particleColor = i % 3 === 0 ? '#ffffff' : color;
      
      createParticle(x, y, particleColor, size, duration, velocityX, velocityY);
    }
  }, [createParticle, playSound]);
  
  // Create a visual effect for connections between nodes
  const createConnectionEffect = useCallback((
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    color: string = '#4bf1ff'
  ) => {
    if (!particleContainerRef.current) return;
    
    // Calculate direction
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const numParticles = Math.floor(distance / 10);
    
    // Create particles along the path
    for (let i = 0; i < numParticles; i++) {
      const ratio = i / numParticles;
      const x = startX + dx * ratio;
      const y = startY + dy * ratio;
      
      // Add some randomness to position
      const randomOffset = 10;
      const offsetX = (Math.random() - 0.5) * randomOffset;
      const offsetY = (Math.random() - 0.5) * randomOffset;
      
      // Use small particles that fade quickly
      const size = 2 + Math.random() * 2;
      const duration = 500 + Math.random() * 1000;
      
      createParticle(x + offsetX, y + offsetY, color, size, duration);
    }
    
    // Play a softer sound
    playSound('knowledge-select');
  }, [createParticle, playSound]);
  
  // Create floating particles that drift upward
  const createFloatingParticles = useCallback((
    x: number, 
    y: number, 
    count: number = 5
  ) => {
    if (!particleContainerRef.current) return;
    
    const colors = ['#4bf1ff', '#c1feff', '#ffffff', '#94ebff'];
    
    for (let i = 0; i < count; i++) {
      // Random horizontal drift
      const driftX = (Math.random() - 0.5) * 40;
      // Always float upward, but with varying speeds
      const driftY = -30 - Math.random() * 70;
      
      // Random particle properties
      const size = 1 + Math.random() * 3;
      const duration = 1000 + Math.random() * 2000;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Small random offset from center
      const offsetX = (Math.random() - 0.5) * 15;
      const offsetY = (Math.random() - 0.5) * 15;
      
      createParticle(x + offsetX, y + offsetY, color, size, duration, driftX, driftY);
    }
  }, [createParticle]);
  
  // Completion effect
  const showCompletionEffect = useCallback((x: number, y: number) => {
    // Create a starburst with green color
    createStarburstEffect(x, y, '#34D399', 30);
    playSound('success');
  }, [createStarburstEffect, playSound]);
  
  // Reward effect with particle count
  const showRewardEffect = useCallback((count: number, x: number, y: number) => {
    // Create a starburst with gold color
    createStarburstEffect(x, y, '#FBBF24', count);
    playSound('success');
  }, [createStarburstEffect, playSound]);
  
  // Damage effect
  const showDamageEffect = useCallback((count: number, x: number, y: number) => {
    // Create a starburst with red color
    createStarburstEffect(x, y, '#EF4444', count);
    playSound('failure');
  }, [createStarburstEffect, playSound]);
  
  // Heal effect
  const showHealEffect = useCallback((count: number, x: number, y: number) => {
    // Create a starburst with blue/green colors
    createStarburstEffect(x, y, '#10B981', count);
    playSound('success');
  }, [createStarburstEffect, playSound]);
  
  // Context value
  const value = {
    playSound,
    stopSound,
    flashScreen,
    shakeScreen,
    showCompletionEffect,
    showRewardEffect,
    showDamageEffect,
    showHealEffect,
    // New methods
    createStarburstEffect,
    createConnectionEffect,
    createFloatingParticles
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
      
      {/* Particle container for visual effects */}
      <div 
        ref={particleContainerRef}
        className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      />
      
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