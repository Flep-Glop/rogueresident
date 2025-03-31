// app/components/GameEffects.tsx
'use client';
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

// Types for different effect categories
type ShakeIntensity = 'light' | 'medium' | 'heavy';
type FlashColor = 'white' | 'red' | 'green' | 'blue' | 'yellow';
type ParticleType = 'sparkle' | 'confetti' | 'damage' | 'healing' | 'insight';
type SoundEffect = 'click' | 'success' | 'failure' | 'reward' | 'damage' | 'heal' | 'challenge-complete' | 'node-select' | 'menu-open';

// Interface for GameEffects context
interface GameEffectsContextType {
  // Screen effects
  shakeScreen: (intensity: ShakeIntensity, duration?: number) => void;
  flashScreen: (color: FlashColor, duration?: number) => void;
  
  // Particle effects
  spawnParticles: (
    type: ParticleType, 
    x: number, 
    y: number, 
    count?: number
  ) => void;
  
  // Sound effects
  playSound: (sound: SoundEffect) => void;
  
  // Combined effects for common game events
  showRewardEffect: (amount: number, x: number, y: number) => void;
  showDamageEffect: (amount: number, x: number, y: number) => void;
  showHealEffect: (amount: number, x: number, y: number) => void;
  showCompletionEffect: (x: number, y: number) => void;
  
  // Effect states
  isShaking: boolean;
  isFlashing: boolean;
  flashColor: string;
  particles: Particle[];
  
  // Settings
  effectsEnabled: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
}

// Interface for particle objects
interface Particle {
  id: string;
  x: number;
  y: number;
  type: ParticleType;
  velocityX: number;
  velocityY: number;
  size: number;
  opacity: number;
  rotation: number;
  lifespan: number;
  text?: string;
}

// Create context with default values
const GameEffectsContext = createContext<GameEffectsContextType>({
  shakeScreen: () => {},
  flashScreen: () => {},
  spawnParticles: () => {},
  playSound: () => {},
  showRewardEffect: () => {},
  showDamageEffect: () => {},
  showHealEffect: () => {},
  showCompletionEffect: () => {},
  isShaking: false,
  isFlashing: false,
  flashColor: 'rgba(255, 255, 255, 0)',
  particles: [],
  effectsEnabled: true,
  setEffectsEnabled: () => {}
});

// Hook to use game effects
export const useGameEffects = () => useContext(GameEffectsContext);

// Provider component
export function GameEffectsProvider({ children }: { children: ReactNode }) {
  // Previous game state tracking for automatic effects
  const previousStateRef = useRef({
    health: 0,
    insight: 0,
    completedNodeIds: [] as string[]
  });
  
  // State for effect status
  const [isShaking, setIsShaking] = useState(false);
  const [shakeValues, setShakeValues] = useState({ x: 0, y: 0 });
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState('rgba(255, 255, 255, 0)');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  
  // Get game state for automatic effects
  const { player, completedNodeIds } = useGameStore();
  
  // Auto-detect changes that should trigger effects
  useEffect(() => {
    if (!previousStateRef.current) return;
    
    const prevState = previousStateRef.current;
    
    // Health change detection
    if (player.health < prevState.health) {
      // Player took damage
      const amount = prevState.health - player.health;
      showDamageEffect(amount, window.innerWidth / 2, window.innerHeight / 2);
    } else if (player.health > prevState.health) {
      // Player healed
      const amount = player.health - prevState.health;
      showHealEffect(amount, window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Insight gain detection
    if (player.insight > prevState.insight) {
      const amount = player.insight - prevState.insight;
      showRewardEffect(amount, window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Node completion detection
    if (completedNodeIds.length > prevState.completedNodeIds.length) {
      showCompletionEffect(window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Update previous state reference
    previousStateRef.current = {
      health: player.health,
      insight: player.insight,
      completedNodeIds: [...completedNodeIds]
    };
  }, [player.health, player.insight, completedNodeIds]);
  
  // Initialize previous state on mount
  useEffect(() => {
    previousStateRef.current = {
      health: player.health,
      insight: player.insight,
      completedNodeIds: [...completedNodeIds]
    };
  }, []);
  
  // Screen shake effect
  const shakeScreen = useCallback((intensity: ShakeIntensity, duration = 500) => {
    if (!effectsEnabled) return;
    
    setIsShaking(true);
    
    let maxOffset: number;
    switch (intensity) {
      case 'light':
        maxOffset = 3;
        break;
      case 'medium':
        maxOffset = 8;
        break;
      case 'heavy':
        maxOffset = 15;
        break;
      default:
        maxOffset = 5;
    }
    
    // Create shake animation
    let startTime = Date.now();
    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        clearInterval(shakeInterval);
        setIsShaking(false);
        setShakeValues({ x: 0, y: 0 });
        return;
      }
      
      // Decrease intensity over time
      const currentOffset = maxOffset * (1 - progress);
      
      // Random shake position
      setShakeValues({
        x: Math.random() * currentOffset * 2 - currentOffset,
        y: Math.random() * currentOffset * 2 - currentOffset
      });
    }, 16); // ~60fps
    
    return () => clearInterval(shakeInterval);
  }, [effectsEnabled]);
  
  // Screen flash effect
  const flashScreen = useCallback((color: FlashColor, duration = 300) => {
    if (!effectsEnabled) return;
    
    // Set flash color based on type
    let flashRGBA: string;
    switch (color) {
      case 'white':
        flashRGBA = 'rgba(255, 255, 255, 0.7)';
        break;
      case 'red':
        flashRGBA = 'rgba(255, 0, 0, 0.5)';
        break;
      case 'green':
        flashRGBA = 'rgba(0, 255, 0, 0.5)';
        break;
      case 'blue':
        flashRGBA = 'rgba(0, 120, 255, 0.5)';
        break;
      case 'yellow':
        flashRGBA = 'rgba(255, 255, 0, 0.5)';
        break;
      default:
        flashRGBA = 'rgba(255, 255, 255, 0.7)';
    }
    
    setFlashColor(flashRGBA);
    setIsFlashing(true);
    
    // Clear flash after duration
    setTimeout(() => {
      setIsFlashing(false);
      setFlashColor('rgba(255, 255, 255, 0)');
    }, duration);
  }, [effectsEnabled]);
  
  // Particle system
  const spawnParticles = useCallback((
    type: ParticleType, 
    x: number, 
    y: number, 
    count = 10,
    text?: string
  ) => {
    if (!effectsEnabled) return;
    
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: `${type}-${Date.now()}-${i}`,
        x,
        y,
        type,
        velocityX: (Math.random() - 0.5) * 10,
        velocityY: (Math.random() - 0.5) * 10 - 2, // Slight upward bias
        size: Math.random() * 10 + 5,
        opacity: 1,
        rotation: Math.random() * 360,
        lifespan: Math.random() * 1000 + 500, // 0.5-1.5 seconds
        text: text
      };
      
      // Customize particle properties based on type
      switch (type) {
        case 'sparkle':
          particle.size = Math.random() * 5 + 3;
          break;
        case 'confetti':
          particle.size = Math.random() * 8 + 4;
          particle.rotation = Math.random() * 360;
          break;
        case 'damage':
          particle.velocityY = -Math.random() * 5 - 2; // Always upward
          particle.size = 16;
          break;
        case 'healing':
          particle.velocityY = -Math.random() * 5 - 1; // Always upward
          particle.size = 16;
          break;
        case 'insight':
          particle.velocityY = -Math.random() * 5 - 1; // Always upward
          particle.size = 16;
          break;
      }
      
      newParticles.push(particle);
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  }, [effectsEnabled]);
  
  // Play sound effect
  const playSound = useCallback((sound: SoundEffect) => {
    if (!effectsEnabled) return;
    
    // In full implementation, would play actual sounds
    console.log(`Playing sound: ${sound}`);
    
    // Example of how sound implementation might work
    // const audio = new Audio(`/sounds/${sound}.mp3`);
    // audio.volume = 0.5; // Adjust volume as needed
    // audio.play();
  }, [effectsEnabled]);
  
  // Combined effect for rewards
  const showRewardEffect = useCallback((amount: number, x: number, y: number) => {
    if (!effectsEnabled) return;
    
    // Flash the screen
    flashScreen('yellow', 300);
    
    // Play a sound
    playSound('reward');
    
    // Spawn particles
    spawnParticles('insight', x, y, 5, `+${amount}`);
  }, [effectsEnabled, flashScreen, playSound, spawnParticles]);
  
  // Combined effect for damage
  const showDamageEffect = useCallback((amount: number, x: number, y: number) => {
    if (!effectsEnabled) return;
    
    // Shake and flash the screen
    shakeScreen('medium', 300);
    flashScreen('red', 300);
    
    // Play a sound
    playSound('damage');
    
    // Spawn particles
    spawnParticles('damage', x, y, amount, `-${amount}`);
  }, [effectsEnabled, shakeScreen, flashScreen, playSound, spawnParticles]);
  
  // Combined effect for healing
  const showHealEffect = useCallback((amount: number, x: number, y: number) => {
    if (!effectsEnabled) return;
    
    // Flash the screen
    flashScreen('green', 300);
    
    // Play a sound
    playSound('heal');
    
    // Spawn particles
    spawnParticles('healing', x, y, amount, `+${amount}`);
  }, [effectsEnabled, flashScreen, playSound, spawnParticles]);
  
  // Combined effect for node completion
  const showCompletionEffect = useCallback((x: number, y: number) => {
    if (!effectsEnabled) return;
    
    // Flash the screen
    flashScreen('blue', 300);
    
    // Play a sound
    playSound('challenge-complete');
    
    // Spawn particles
    spawnParticles('confetti', x, y, 20);
    
    // Light screen shake for emphasis
    shakeScreen('light', 300);
  }, [effectsEnabled, flashScreen, playSound, spawnParticles, shakeScreen]);
  
  // Update and animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const animationFrame = requestAnimationFrame(() => {
      const now = Date.now();
      
      setParticles(currentParticles => 
        currentParticles
          // Update particle properties
          .map(p => {
            // Skip frozen particles
            if (p.velocityX === 0 && p.velocityY === 0) return p;
            
            // Calculate new position
            const newX = p.x + p.velocityX;
            const newY = p.y + p.velocityY;
            
            // Apply "gravity" to velocity
            const newVelocityY = p.velocityY + 0.1;
            
            // Reduce opacity based on lifespan
            const newOpacity = p.opacity - (1 / p.lifespan * 16); // 16ms per frame
            
            // Update rotation for certain particle types
            const newRotation = p.type === 'confetti' ? p.rotation + 2 : p.rotation;
            
            return {
              ...p,
              x: newX,
              y: newY,
              velocityY: newVelocityY,
              opacity: Math.max(0, newOpacity),
              rotation: newRotation
            };
          })
          // Remove dead particles
          .filter(p => p.opacity > 0)
      );
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [particles]);
  
  // Provide context value
  const value: GameEffectsContextType = {
    shakeScreen,
    flashScreen,
    spawnParticles,
    playSound,
    showRewardEffect,
    showDamageEffect,
    showHealEffect,
    showCompletionEffect,
    isShaking,
    isFlashing,
    flashColor,
    particles,
    effectsEnabled,
    setEffectsEnabled
  };
  
  // Missing import reference
  import { useRef } from 'react';
  
  return (
    <GameEffectsContext.Provider value={value}>
      {/* Container for shake effect */}
      <div 
        style={{ 
          transform: isShaking ? `translate(${shakeValues.x}px, ${shakeValues.y}px)` : 'none',
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
        
        {/* Particle container */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10000 }}>
          {particles.map(particle => (
            <Particle key={particle.id} particle={particle} />
          ))}
        </div>
      </div>
    </GameEffectsContext.Provider>
  );
}

// Particle component
function Particle({ particle }: { particle: Particle }) {
  const { type, x, y, size, opacity, rotation, text } = particle;
  
  // Determine particle appearance based on type
  const getParticleStyle = () => {
    switch (type) {
      case 'sparkle':
        return {
          backgroundColor: 'transparent',
          boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.8)',
          borderRadius: '50%'
        };
      case 'confetti':
        // Random confetti colors
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return {
          backgroundColor: color,
          borderRadius: '2px'
        };
      case 'damage':
        return {
          backgroundColor: 'transparent',
          color: '#ff0000',
          fontSize: `${size}px`,
          fontFamily: 'var(--font-pixel)',
          textShadow: '0 0 3px rgba(0, 0, 0, 0.5)'
        };
      case 'healing':
        return {
          backgroundColor: 'transparent',
          color: '#00ff00',
          fontSize: `${size}px`,
          fontFamily: 'var(--font-pixel)',
          textShadow: '0 0 3px rgba(0, 0, 0, 0.5)'
        };
      case 'insight':
        return {
          backgroundColor: 'transparent',
          color: '#ffff00',
          fontSize: `${size}px`,
          fontFamily: 'var(--font-pixel)',
          textShadow: '0 0 3px rgba(0, 0, 0, 0.5)'
        };
      default:
        return {
          backgroundColor: 'white',
          borderRadius: '50%'
        };
    }
  };
  
  const style = getParticleStyle();
  
  // Text-based particles (damage, healing, insight)
  if (text && (type === 'damage' || type === 'healing' || type === 'insight')) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          opacity,
          ...style,
          zIndex: 10001,
          fontWeight: 'bold'
        }}
      >
        {text}
      </div>
    );
  }
  
  // Visual particles (sparkle, confetti)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity,
        ...style,
        zIndex: 10001
      }}
    />
  );
}

// Button component with game effects
export function PixelButtonWithEffects({
  children,
  onClick,
  className = '',
  disabled = false,
  soundEffect = 'click',
  clickEffect = 'light'
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  soundEffect?: SoundEffect;
  clickEffect?: ShakeIntensity;
}) {
  const { playSound, shakeScreen } = useGameEffects();
  
  const handleClick = () => {
    if (disabled) return;
    
    // Play sound effect
    playSound(soundEffect);
    
    // Light screen shake for feedback
    shakeScreen(clickEffect, 100);
    
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

// Node component with game effects
export function PixelNodeWithEffects({
  node,
  isAvailable,
  isCompleted,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  node: any;
  isAvailable: boolean;
  isCompleted: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { playSound, spawnParticles } = useGameEffects();
  
  const handleClick = () => {
    if (!isAvailable) return;
    
    // Play sound effect
    playSound('node-select');
    
    // Spawn particles at node position
    // In a full implementation, would get actual DOM position
    const nodeElement = document.getElementById(`node-${node.id}`);
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      spawnParticles('sparkle', x, y, 5);
    }
    
    // Call original onClick handler
    onClick();
  };
  
  const handleMouseEnter = () => {
    if (!isAvailable) return;
    
    // Play hover sound
    // playSound('hover'); // Could be enabled if desired
    
    // Call original onMouseEnter handler
    onMouseEnter();
  };
  
  // Forward to the original NodeComponent with enhanced click handlers
  return (
    <div
      id={`node-${node.id}`}
      className={`
        w-12 h-12 rounded-full relative overflow-hidden
        ${isCompleted ? 'bg-success' : node.type === 'clinical' ? 'bg-clinical' : 
          node.type === 'qa' ? 'bg-qa' : 
          node.type === 'educational' ? 'bg-educational' : 
          node.type === 'storage' ? 'bg-storage' : 
          node.type === 'vendor' ? 'bg-vendor' : 
          node.type === 'boss' ? 'bg-boss' : ''}
        ${isAvailable && !isCompleted ? 'cursor-pointer' : 'cursor-default'}
        ${isAvailable && !isCompleted ? 'border-2 border-yellow-300' : 'border border-gray-700'}
        ${isSelected ? 'border-2 border-white' : ''}
        ${!isAvailable && !isCompleted ? 'opacity-50 grayscale' : ''}
        box-content
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node pixel overlay effect */}
      <div className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
          backgroundSize: '4px 4px',
          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0'
        }}
      ></div>
      
      {/* Node inner shadow for 3D effect */}
      <div className={`
        absolute inset-2 rounded-full 
        ${isCompleted ? 'bg-success-dark' : 
          node.type === 'clinical' ? 'bg-clinical-dark' : 
          node.type === 'qa' ? 'bg-qa-dark' : 
          node.type === 'educational' ? 'bg-educational-dark' : 
          node.type === 'storage' ? 'bg-storage-dark' : 
          node.type === 'vendor' ? 'bg-vendor-dark' : 
          node.type === 'boss' ? 'bg-boss-dark' : ''}
      `}></div>
      
      {/* Node icon and label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl text-white drop-shadow-md">
          {isCompleted ? '✓' : 
          node.type === 'clinical' ? '🏥' : 
          node.type === 'qa' ? '🔍' : 
          node.type === 'educational' ? '📚' : 
          node.type === 'storage' ? '📦' : 
          node.type === 'vendor' ? '🛒' : 
          node.type === 'boss' ? '⚠️' : ''}
        </div>
        {node.type === 'boss' && (
          <div className="text-xs text-white font-bold mt-1 font-pixel">IONIX</div>
        )}
      </div>
      
      {/* Completion checkmark */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 bg-success w-5 h-5 flex items-center justify-center rounded-full border border-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}