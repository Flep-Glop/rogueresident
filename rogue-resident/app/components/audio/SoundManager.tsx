// app/components/audio/SoundManager.tsx
'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Sound types - only the essential ones
export type SoundType = 'click' | 'success' | 'failure' | 'music' | 'ambient';

// Sound manager context
interface SoundManagerContextType {
  play: (sound: SoundType) => void;
  toggleMute: () => void;
  isMuted: boolean;
}

// Create context
const SoundManagerContext = createContext<SoundManagerContextType>({
  play: () => {},
  toggleMute: () => {},
  isMuted: false
});

// Custom hook to use sound manager
export const useSoundManager = () => useContext(SoundManagerContext);

// Sound file mapping
const soundFiles: Record<SoundType, string> = {
  'click': '/sounds/ui/click.mp3',
  'success': '/sounds/ui/success.mp3',
  'failure': '/sounds/ui/error.mp3',
  'music': '/sounds/music/main-theme.mp3',
  'ambient': '/sounds/ambient/ambient.mp3'
};

// Provider component
export function SoundManagerProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  
  // Play a sound
  const play = useCallback((sound: SoundType): void => {
    if (isMuted) return;
    
    try {
      // For prototype, just log the sound instead of playing it
      console.log(`Playing sound: ${sound}`);
      
      // In a full implementation:
      // const audio = new Audio(soundFiles[sound]);
      // audio.volume = 0.5;
      // audio.play();
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }, [isMuted]);
  
  // Toggle mute state
  const toggleMute = useCallback((): void => {
    setIsMuted(prev => !prev);
  }, []);
  
  // Provide context value
  const value = {
    play,
    toggleMute,
    isMuted
  };
  
  return (
    <SoundManagerContext.Provider value={value}>
      {children}
    </SoundManagerContext.Provider>
  );
}

// Simple sound button component
export function SoundButton({
  children,
  onClick,
  sound = 'click'
}: {
  children: ReactNode;
  onClick?: () => void;
  sound?: SoundType;
}) {
  const { play } = useSoundManager();
  
  const handleClick = () => {
    play(sound);
    if (onClick) onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      className="pixel-button"
    >
      {children}
    </button>
  );
}