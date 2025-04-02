// app/components/GameEffects.tsx
'use client';
import { useState, useCallback, createContext, useContext, ReactNode, useRef } from 'react';

// Simplified effect types
type ShakeIntensity = 'light' | 'medium' | 'heavy';
// Update your FlashColor type:
type FlashColor = 'white' | 'red' | 'green' | 'blue' | 'yellow'; // Add-yellow// app/components/GameEffects.tsx
// Add these to your existing SoundEffect type:
type SoundEffect = 
  // Basic UI sounds
  | 'click' 
  | 'ui-click'
  | 'ui-toggle'
  | 'ui-error'
  | 'ui-close'
  // Gameplay feedback
  | 'success' 
  | 'failure' 
  | 'reward' 
  | 'damage' 
  | 'heal' 
  // Challenge sounds
  | 'challenge-start'
  | 'challenge-complete'
  | 'challenge-success'
  | 'challenge-failure'
  // Navigation
  | 'node-select'
  | 'node-hover'      // Add this 
  | 'error'           // Add this
  | 'phase-transition'; // Add this

// Context interface
interface GameEffectsContextType {
  shakeScreen: (intensity: ShakeIntensity, duration?: number) => void;
  flashScreen: (color: FlashColor, duration?: number) => void;
  showDamageNumber: (amount: number) => void;
  showRewardNumber: (amount: number) => void;
  showRewardEffect: (amount: number, x: number, y: number) => void;
  showDamageEffect: (amount: number, x: number, y: number) => void;
  showHealEffect: (amount: number, x: number, y: number) => void;
  showCompletionEffect: (x: number, y: number) => void;
  playSound: (sound: SoundEffect) => void;
}

// Create context
const GameEffectsContext = createContext<GameEffectsContextType>({
  shakeScreen: () => {},
  flashScreen: () => {},
  showDamageNumber: () => {},
  showRewardNumber: () => {},
  showRewardEffect: () => {},
  showDamageEffect: () => {},
  showHealEffect: () => {},
  showCompletionEffect: () => {},
  playSound: () => {}
});

// Custom hook
export const useGameEffects = () => useContext(GameEffectsContext);

// Provider component
export function GameEffectsProvider({ children }: { children: ReactNode }) {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState('rgba(255, 255, 255, 0)');
  const [damageNumber, setDamageNumber] = useState<number | null>(null);
  const [rewardNumber, setRewardNumber] = useState<number | null>(null);
  const [particles, setParticles] = useState<Array<{id: string, x: number, y: number, type: string, text?: string}>>([]);
  
  // Track previous game state for auto effects
  const previousStateRef = useRef({
    health: 0,
    insight: 0,
    completedNodeIds: [] as string[]
  });
  
  // Screen shake effect
  const shakeScreen = useCallback((intensity: ShakeIntensity, duration = 500) => {
    setIsShaking(true);
    
    // Set CSS class based on intensity
    switch (intensity) {
      case 'light':
        setShakeClass('shake-light');
        break;
      case 'medium':
        setShakeClass('shake-medium');
        break;
      case 'heavy':
        setShakeClass('shake-heavy');
        break;
    }
    
    // Clear shake after duration
    setTimeout(() => {
      setIsShaking(false);
      setShakeClass('');
    }, duration);
  }, []);
  
  // Screen flash effect
  const flashScreen = useCallback((color: FlashColor, duration = 300) => {
    // Set flash color
    switch (color) {
      case 'white':
        setFlashColor('rgba(255, 255, 255, 0.5)');
        break;
      case 'red':
        setFlashColor('rgba(255, 0, 0, 0.3)');
        break;
      case 'green':
        setFlashColor('rgba(0, 255, 0, 0.3)');
        break;
      case 'blue':
        setFlashColor('rgba(0, 0, 255, 0.3)');
        break;
    }
    
    setIsFlashing(true);
    
    // Clear flash after duration
    setTimeout(() => {
      setIsFlashing(false);
      setFlashColor('rgba(255, 255, 255, 0)');
    }, duration);
  }, []);
  
  // Play sound effect
  const playSound = useCallback((sound: SoundEffect) => {
    // In full implementation, would play actual sounds
    console.log(`Playing sound: ${sound}`);
    
    // Example of how sound implementation might work
    // const audio = new Audio(`/sounds/${sound}.mp3`);
    // audio.volume = 0.5;
    // audio.play();
  }, []);
  
  // Show damage number
  const showDamageNumber = useCallback((amount: number) => {
    setDamageNumber(amount);
    setTimeout(() => setDamageNumber(null), 1500);
  }, []);
  
  // Show reward number
  const showRewardNumber = useCallback((amount: number) => {
    setRewardNumber(amount);
    setTimeout(() => setRewardNumber(null), 1500);
  }, []);
  
  // Spawn simple particles
  const spawnParticles = useCallback((type: string, x: number, y: number, count = 5, text?: string) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `${type}-${Date.now()}-${i}`,
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      type,
      text
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 1500);
  }, []);
  
  // Combined effect for rewards
  const showRewardEffect = useCallback((amount: number, x: number, y: number) => {
    // Flash the screen
    flashScreen('green');
    
    // Play a sound
    playSound('reward');
    
    // Show reward number
    showRewardNumber(amount);
    
    // Spawn particles
    spawnParticles('reward', x, y, 5, `+${amount}`);
  }, [flashScreen, playSound, showRewardNumber, spawnParticles]);
  
  // Combined effect for damage
  const showDamageEffect = useCallback((amount: number, x: number, y: number) => {
    // Shake and flash the screen
    shakeScreen('medium');
    flashScreen('red');
    
    // Play a sound
    playSound('damage');
    
    // Show damage number
    showDamageNumber(amount);
    
    // Spawn particles
    spawnParticles('damage', x, y, amount, `-${amount}`);
  }, [shakeScreen, flashScreen, playSound, showDamageNumber, spawnParticles]);
  
  // Combined effect for healing
  const showHealEffect = useCallback((amount: number, x: number, y: number) => {
    // Flash the screen
    flashScreen('green');
    
    // Play a sound
    playSound('heal');
    
    // Show number
    showRewardNumber(amount);
    
    // Spawn particles
    spawnParticles('heal', x, y, amount, `+${amount}`);
  }, [flashScreen, playSound, showRewardNumber, spawnParticles]);
  
  // Combined effect for node completion
  const showCompletionEffect = useCallback((x: number, y: number) => {
    // Flash the screen
    flashScreen('blue');
    
    // Play a sound
    playSound('challenge-complete');
    
    // Light screen shake for emphasis
    shakeScreen('light');
    
    // Spawn particles
    spawnParticles('completion', x, y, 10);
  }, [flashScreen, playSound, shakeScreen, spawnParticles]);
  
  // Provide context value
  const value = {
    shakeScreen,
    flashScreen,
    showDamageNumber,
    showRewardNumber,
    showRewardEffect,
    showDamageEffect,
    showHealEffect,
    showCompletionEffect,
    playSound
  };
  
  return (
    <GameEffectsContext.Provider value={value}>
      {/* Container for shake effect */}
      <div 
        className={`${isShaking ? shakeClass : ''}`}
        style={{ 
          height: '100%',
          width: '100%',
          position: 'relative'
        }}
      >
        {children}
        
        {/* Flash overlay */}
        {isFlashing && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: flashColor,
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'background-color 0.1s ease'
            }}
          />
        )}
        
        {/* Damage number display */}
        {damageNumber !== null && (
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-4xl animate-bounce font-bold z-50"
            style={{ textShadow: '0 0 3px black' }}
          >
            -{damageNumber}
          </div>
        )}
        
        {/* Reward number display */}
        {rewardNumber !== null && (
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-300 text-4xl animate-bounce font-bold z-50"
            style={{ textShadow: '0 0 3px black' }}
          >
            +{rewardNumber}
          </div>
        )}
        
        {/* Particle container */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10000 }}>
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute animate-float"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                fontSize: particle.type === 'damage' ? '24px' : 
                         particle.type === 'heal' ? '24px' : 
                         particle.type === 'reward' ? '24px' : '12px',
                color: particle.type === 'damage' ? 'red' : 
                       particle.type === 'heal' ? 'lightgreen' : 
                       particle.type === 'reward' ? 'gold' : 'white',
                opacity: 0.8,
                fontFamily: 'var(--font-pixel)'
              }}
            >
              {particle.text || '✨'}
            </div>
          ))}
        </div>
      </div>
      
      {/* CSS for shake effects and animations */}
      <style jsx global>{`
        @keyframes shake-light {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes shake-medium {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        @keyframes shake-heavy {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-20px); }
          75% { transform: translateX(20px); }
        }
        
        @keyframes float {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        
        .shake-light { animation: shake-light 0.3s 2; }
        .shake-medium { animation: shake-medium 0.3s 3; }
        .shake-heavy { animation: shake-heavy 0.4s 4; }
        .animate-float { animation: float 1.5s forwards; }
      `}</style>
    </GameEffectsContext.Provider>
  );
}

// Enhanced button with effects
export function EffectButton({
  children,
  onClick,
  className = '',
  disabled = false,
  sound = 'click' as SoundEffect,
  shakeIntensity = 'light' as ShakeIntensity
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  sound?: SoundEffect;
  shakeIntensity?: ShakeIntensity;
}) {
  const { playSound, shakeScreen } = useGameEffects();
  
  const handleClick = () => {
    if (disabled) return;
    
    // Play sound effect
    playSound(sound);
    
    // Light screen shake for feedback
    shakeScreen(shakeIntensity, 100);
    
    // Call original onClick handler
    if (onClick) onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        pixel-button
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}