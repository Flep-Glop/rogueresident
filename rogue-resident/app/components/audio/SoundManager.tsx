// app/components/audio/SoundManager.tsx
'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Sound categories
export type SoundCategory = 'ui' | 'gameplay' | 'ambient' | 'character' | 'music';

// Sound effect types
export type SoundEffect = 
  // UI sounds
  | 'ui-click' 
  | 'ui-hover'
  | 'ui-open'
  | 'ui-close'
  | 'ui-error'
  | 'ui-success'
  | 'ui-toggle'
  
  // Gameplay sounds
  | 'node-select'
  | 'node-complete'
  | 'node-unavailable'
  | 'challenge-start'
  | 'challenge-success'
  | 'challenge-failure'
  | 'item-acquire'
  | 'health-damage'
  | 'health-heal'
  | 'insight-gain'
  | 'boss-encounter'
  | 'boss-attack'
  | 'boss-defeat'
  
  // Character-specific sounds
  | 'kapoor-speak'
  | 'jesse-speak'
  | 'quinn-speak'
  
  // Ambient loops
  | 'ambient-hill-day'
  | 'ambient-hill-night'
  | 'ambient-hospital'
  | 'ambient-storage'
  
  // Music tracks
  | 'music-title'
  | 'music-hill'
  | 'music-hospital'
  | 'music-boss';

// Music fade options
export interface MusicFadeOptions {
  duration?: number; // in milliseconds
  targetVolume?: number; // 0 to 1
}

// Sound manager context
interface SoundManagerContextType {
  // Sound playback functions
  play: (sound: SoundEffect, options?: PlayOptions) => void;
  stop: (sound: SoundEffect) => void;
  stopAll: (category?: SoundCategory) => void;
  
  // Music control
  playMusic: (track: SoundEffect, options?: PlayOptions) => void;
  stopMusic: (fadeOut?: boolean | MusicFadeOptions) => void;
  fadeMusic: (options: MusicFadeOptions) => void;
  
  // Ambient sound control
  playAmbient: (sound: SoundEffect, options?: PlayOptions) => void;
  stopAmbient: (fadeOut?: boolean | MusicFadeOptions) => void;
  
  // Volume control
  setMasterVolume: (volume: number) => void;
  setCategoryVolume: (category: SoundCategory, volume: number) => void;
  getMasterVolume: () => number;
  getCategoryVolume: (category: SoundCategory) => number;
  
  // Settings
  isMuted: boolean;
  toggleMute: () => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// Play options for sounds
export interface PlayOptions {
  volume?: number; // 0 to 1
  loop?: boolean;
  playbackRate?: number; // 0.5 to 2.0
  delay?: number; // milliseconds
  onEnd?: () => void;
}

// Sound state tracking
interface SoundState {
  isPlaying: boolean;
  audio: HTMLAudioElement | null;
  category: SoundCategory;
}

// Create context
const SoundManagerContext = createContext<SoundManagerContextType>({
  play: () => {},
  stop: () => {},
  stopAll: () => {},
  playMusic: () => {},
  stopMusic: () => {},
  fadeMusic: () => {},
  playAmbient: () => {},
  stopAmbient: () => {},
  setMasterVolume: () => {},
  setCategoryVolume: () => {},
  getMasterVolume: () => 0,
  getCategoryVolume: () => 0,
  isMuted: false,
  toggleMute: () => {},
  isEnabled: true,
  setEnabled: () => {}
});

// Custom hook to use sound manager
export const useSoundManager = () => useContext(SoundManagerContext);

// Sound file mapping
const soundFiles: Record<SoundEffect, { src: string; category: SoundCategory }> = {
  // UI sounds
  'ui-click': { src: '/sounds/ui/click.mp3', category: 'ui' },
  'ui-hover': { src: '/sounds/ui/hover.mp3', category: 'ui' },
  'ui-open': { src: '/sounds/ui/open.mp3', category: 'ui' },
  'ui-close': { src: '/sounds/ui/close.mp3', category: 'ui' },
  'ui-error': { src: '/sounds/ui/error.mp3', category: 'ui' },
  'ui-success': { src: '/sounds/ui/success.mp3', category: 'ui' },
  'ui-toggle': { src: '/sounds/ui/toggle.mp3', category: 'ui' },
  
  // Gameplay sounds
  'node-select': { src: '/sounds/gameplay/node-select.mp3', category: 'gameplay' },
  'node-complete': { src: '/sounds/gameplay/node-complete.mp3', category: 'gameplay' },
  'node-unavailable': { src: '/sounds/gameplay/node-unavailable.mp3', category: 'gameplay' },
  'challenge-start': { src: '/sounds/gameplay/challenge-start.mp3', category: 'gameplay' },
  'challenge-success': { src: '/sounds/gameplay/challenge-success.mp3', category: 'gameplay' },
  'challenge-failure': { src: '/sounds/gameplay/challenge-failure.mp3', category: 'gameplay' },
  'item-acquire': { src: '/sounds/gameplay/item-acquire.mp3', category: 'gameplay' },
  'health-damage': { src: '/sounds/gameplay/health-damage.mp3', category: 'gameplay' },
  'health-heal': { src: '/sounds/gameplay/health-heal.mp3', category: 'gameplay' },
  'insight-gain': { src: '/sounds/gameplay/insight-gain.mp3', category: 'gameplay' },
  'boss-encounter': { src: '/sounds/gameplay/boss-encounter.mp3', category: 'gameplay' },
  'boss-attack': { src: '/sounds/gameplay/boss-attack.mp3', category: 'gameplay' },
  'boss-defeat': { src: '/sounds/gameplay/boss-defeat.mp3', category: 'gameplay' },
  
  // Character-specific sounds
  'kapoor-speak': { src: '/sounds/character/kapoor-speak.mp3', category: 'character' },
  'jesse-speak': { src: '/sounds/character/jesse-speak.mp3', category: 'character' },
  'quinn-speak': { src: '/sounds/character/quinn-speak.mp3', category: 'character' },
  
  // Ambient loops
  'ambient-hill-day': { src: '/sounds/ambient/hill-day.mp3', category: 'ambient' },
  'ambient-hill-night': { src: '/sounds/ambient/hill-night.mp3', category: 'ambient' },
  'ambient-hospital': { src: '/sounds/ambient/hospital.mp3', category: 'ambient' },
  'ambient-storage': { src: '/sounds/ambient/storage.mp3', category: 'ambient' },
  
  // Music tracks
  'music-title': { src: '/sounds/music/title-theme.mp3', category: 'music' },
  'music-hill': { src: '/sounds/music/hill-theme.mp3', category: 'music' },
  'music-hospital': { src: '/sounds/music/hospital-theme.mp3', category: 'music' },
  'music-boss': { src: '/sounds/music/boss-theme.mp3', category: 'music' }
};

// Provider component
export function SoundManagerProvider({ children }: { children: ReactNode }) {
  // Track active sounds
  const [activeSounds, setActiveSounds] = useState<Map<SoundEffect, SoundState>>(new Map());
  
  // Current music and ambient tracks
  const [currentMusic, setCurrentMusic] = useState<SoundEffect | null>(null);
  const [currentAmbient, setCurrentAmbient] = useState<SoundEffect | null>(null);
  
  // Volume settings
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [categoryVolumes, setCategoryVolumes] = useState<Record<SoundCategory, number>>({
    ui: 0.8,
    gameplay: 0.9,
    ambient: 0.6,
    character: 0.9,
    music: 0.5
  });
  
  // Mute state
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(masterVolume);
  
  // Sound enabled setting
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Load settings from local storage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('soundSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setMasterVolume(parsed.masterVolume || 0.7);
        setCategoryVolumes(parsed.categoryVolumes || {
          ui: 0.8,
          gameplay: 0.9,
          ambient: 0.6,
          character: 0.9,
          music: 0.5
        });
        setIsMuted(parsed.isMuted || false);
        setIsEnabled(parsed.isEnabled !== undefined ? parsed.isEnabled : true);
      }
    } catch (e) {
      console.error('Error loading sound settings:', e);
    }
  }, []);
  
  // Save settings to local storage when changed
  useEffect(() => {
    try {
      localStorage.setItem('soundSettings', JSON.stringify({
        masterVolume,
        categoryVolumes,
        isMuted,
        isEnabled
      }));
    } catch (e) {
      console.error('Error saving sound settings:', e);
    }
  }, [masterVolume, categoryVolumes, isMuted, isEnabled]);
  
  // Calculate effective volume for a sound
  const getEffectiveVolume = useCallback((category: SoundCategory, specificVolume?: number): number => {
    if (isMuted || !isEnabled) return 0;
    
    const categoryVolume = categoryVolumes[category] || 1;
    const effectiveVolume = masterVolume * categoryVolume * (specificVolume !== undefined ? specificVolume : 1);
    
    return Math.min(Math.max(effectiveVolume, 0), 1); // Clamp between 0 and 1
  }, [masterVolume, categoryVolumes, isMuted, isEnabled]);
  
  // Play a sound
  const play = useCallback((sound: SoundEffect, options: PlayOptions = {}): void => {
    if (!isEnabled) return;
    
    // Get sound file info
    const soundInfo = soundFiles[sound];
    if (!soundInfo) {
      console.warn(`Sound not found: ${sound}`);
      return;
    }
    
    // Create audio element
    const audio = new Audio(soundInfo.src);
    
    // Set options
    audio.volume = getEffectiveVolume(soundInfo.category, options.volume);
    audio.loop = options.loop || false;
    if (options.playbackRate) audio.playbackRate = options.playbackRate;
    
    // Add end callback if provided
    if (options.onEnd) {
      audio.addEventListener('ended', options.onEnd, { once: true });
    }
    
    // Handle delay
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        audio.play().catch(e => console.error(`Error playing sound: ${sound}`, e));
      }, options.delay);
    } else {
      // Play immediately
      audio.play().catch(e => console.error(`Error playing sound: ${sound}`, e));
    }
    
    // Store sound state
    setActiveSounds(prev => {
      const newMap = new Map(prev);
      newMap.set(sound, {
        isPlaying: true,
        audio: audio,
        category: soundInfo.category
      });
      return newMap;
    });
    
    // Handle non-looping sounds cleanup
    if (!options.loop) {
      audio.addEventListener('ended', () => {
        setActiveSounds(prev => {
          const newMap = new Map(prev);
          newMap.delete(sound);
          return newMap;
        });
      }, { once: true });
    }
  }, [getEffectiveVolume, isEnabled]);
  
  // Stop a specific sound
  const stop = useCallback((sound: SoundEffect): void => {
    setActiveSounds(prev => {
      const newMap = new Map(prev);
      const soundState = newMap.get(sound);
      
      if (soundState && soundState.audio) {
        soundState.audio.pause();
        soundState.audio.currentTime = 0;
      }
      
      newMap.delete(sound);
      return newMap;
    });
  }, []);
  
  // Stop all sounds in a category (or all sounds if no category specified)
  const stopAll = useCallback((category?: SoundCategory): void => {
    setActiveSounds(prev => {
      const newMap = new Map(prev);
      
      newMap.forEach((state, sound) => {
        if (!category || state.category === category) {
          if (state.audio) {
            state.audio.pause();
            state.audio.currentTime = 0;
          }
          newMap.delete(sound);
        }
      });
      
      return newMap;
    });
    
    // Update current music/ambient tracking if those categories are stopped
    if (!category || category === 'music') {
      setCurrentMusic(null);
    }
    
    if (!category || category === 'ambient') {
      setCurrentAmbient(null);
    }
  }, []);
  
  // Play music track
  const playMusic = useCallback((track: SoundEffect, options: PlayOptions = {}): void => {
    // Stop any currently playing music
    if (currentMusic) {
      stop(currentMusic);
    }
    
    // Set as current music track
    setCurrentMusic(track);
    
    // Play with loop enabled by default
    play(track, { loop: true, ...options });
  }, [currentMusic, play, stop]);
  
  // Stop music with optional fade out
  const stopMusic = useCallback((fadeOut: boolean | MusicFadeOptions = false): void => {
    if (!currentMusic) return;
    
    if (fadeOut) {
      const fadeOptions: MusicFadeOptions = typeof fadeOut === 'boolean' 
        ? { duration: 1000, targetVolume: 0 } 
        : { duration: 1000, targetVolume: 0, ...fadeOut };
      
      fadeMusic(fadeOptions);
      
      // After fade completes, stop the music
      setTimeout(() => {
        stop(currentMusic);
        setCurrentMusic(null);
      }, fadeOptions.duration);
    } else {
      // Stop immediately
      stop(currentMusic);
      setCurrentMusic(null);
    }
  }, [currentMusic, stop, fadeMusic]);
  
  // Fade music volume
  const fadeMusic = useCallback((options: MusicFadeOptions): void => {
    if (!currentMusic) return;
    
    const soundState = activeSounds.get(currentMusic);
    if (!soundState || !soundState.audio) return;
    
    const audio = soundState.audio;
    const startVolume = audio.volume;
    const endVolume = options.targetVolume !== undefined ? options.targetVolume : 0;
    const duration = options.duration || 1000;
    const startTime = Date.now();
    
    // Perform gradual volume change
    const fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Linear interpolation between volumes
      audio.volume = startVolume + (endVolume - startVolume) * progress;
      
      if (progress >= 1) {
        clearInterval(fadeInterval);
      }
    }, 16); // ~60fps
    
    return () => clearInterval(fadeInterval);
  }, [currentMusic, activeSounds]);
  
  // Play ambient sound
  const playAmbient = useCallback((sound: SoundEffect, options: PlayOptions = {}): void => {
    // Stop any currently playing ambient sound
    if (currentAmbient) {
      stop(currentAmbient);
    }
    
    // Set as current ambient track
    setCurrentAmbient(sound);
    
    // Play with loop enabled by default
    play(sound, { loop: true, ...options });
  }, [currentAmbient, play, stop]);
  
  // Stop ambient sound with optional fade out
  const stopAmbient = useCallback((fadeOut: boolean | MusicFadeOptions = false): void => {
    if (!currentAmbient) return;
    
    if (fadeOut) {
      const fadeOptions: MusicFadeOptions = typeof fadeOut === 'boolean' 
        ? { duration: 1000, targetVolume: 0 } 
        : { duration: 1000, targetVolume: 0, ...fadeOut };
      
      // Manually fade the ambient sound
      const soundState = activeSounds.get(currentAmbient);
      if (soundState && soundState.audio) {
        const audio = soundState.audio;
        const startVolume = audio.volume;
        const endVolume = fadeOptions.targetVolume;
        const duration = fadeOptions.duration;
        const startTime = Date.now();
        
        const fadeInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          audio.volume = startVolume + (endVolume - startVolume) * progress;
          
          if (progress >= 1) {
            clearInterval(fadeInterval);
            stop(currentAmbient);
            setCurrentAmbient(null);
          }
        }, 16); // ~60fps
      }
    } else {
      // Stop immediately
      stop(currentAmbient);
      setCurrentAmbient(null);
    }
  }, [currentAmbient, activeSounds, stop]);
  
  // Update volume for all active sounds when master or category volumes change
  useEffect(() => {
    activeSounds.forEach((state, sound) => {
      if (state.audio) {
        state.audio.volume = getEffectiveVolume(state.category);
      }
    });
  }, [masterVolume, categoryVolumes, isMuted, isEnabled, getEffectiveVolume]);
  
  // Set volume for a specific category
  const setCategoryVolume = useCallback((category: SoundCategory, volume: number): void => {
    setCategoryVolumes(prev => ({
      ...prev,
      [category]: Math.min(Math.max(volume, 0), 1) // Clamp between 0 and 1
    }));
  }, []);
  
  // Get current master volume
  const getMasterVolume = useCallback((): number => {
    return isMuted ? 0 : masterVolume;
  }, [masterVolume, isMuted]);
  
  // Get current category volume
  const getCategoryVolume = useCallback((category: SoundCategory): number => {
    return isMuted ? 0 : categoryVolumes[category] || 0;
  }, [categoryVolumes, isMuted]);
  
  // Toggle mute state
  const toggleMute = useCallback((): void => {
    setIsMuted(prev => {
      if (!prev) {
        // Muting, save current volume
        setPreviousVolume(masterVolume);
      }
      return !prev;
    });
  }, [masterVolume]);
  
  // Handle sound system enabled/disabled
  useEffect(() => {
    if (!isEnabled) {
      // Stop all sounds when system is disabled
      activeSounds.forEach((state, sound) => {
        if (state.audio) {
          state.audio.pause();
          state.audio.currentTime = 0;
        }
      });
      setActiveSounds(new Map());
      setCurrentMusic(null);
      setCurrentAmbient(null);
    }
  }, [isEnabled, activeSounds]);
  
  // Provide context value
  const value: SoundManagerContextType = {
    play,
    stop,
    stopAll,
    playMusic,
    stopMusic,
    fadeMusic,
    playAmbient,
    stopAmbient,
    setMasterVolume,
    setCategoryVolume,
    getMasterVolume,
    getCategoryVolume,
    isMuted,
    toggleMute,
    isEnabled,
    setEnabled: setIsEnabled
  };
  
  return (
    <SoundManagerContext.Provider value={value}>
      {children}
    </SoundManagerContext.Provider>
  );
}

// UI component with sound effects
type PixelButtonWithSoundProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  sound?: SoundEffect;
  hoverSound?: SoundEffect;
};

export function PixelButtonWithSound({
  children,
  onClick,
  className = '',
  disabled = false,
  sound = 'ui-click',
  hoverSound = 'ui-hover'
}: PixelButtonWithSoundProps) {
  const { play, isEnabled } = useSoundManager();
  
  const handleClick = () => {
    if (disabled) return;
    
    // Play click sound
    if (isEnabled) {
      play(sound);
    }
    
    // Call original onClick handler
    if (onClick) onClick();
  };
  
  const handleMouseEnter = () => {
    if (disabled || !isEnabled) return;
    
    // Play hover sound
    play(hoverSound, { volume: 0.5 });
  };
  
  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
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

// Sound settings component
export function SoundSettings() {
  const { 
    getMasterVolume, 
    getCategoryVolume, 
    setMasterVolume, 
    setCategoryVolume, 
    isMuted, 
    toggleMute,
    isEnabled,
    setEnabled
  } = useSoundManager();
  
  return (
    <div className="p-4 bg-surface pixel-borders-thin">
      <h3 className="text-xl font-pixel-heading mb-4">Sound Settings</h3>
      
      <div className="space-y-4">
        {/* Master volume control */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-pixel">Master Volume</span>
            <span className="font-pixel">{Math.round(getMasterVolume() * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={getMasterVolume()}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        {/* Category volume controls */}
        {(['music', 'gameplay', 'ui', 'ambient', 'character'] as SoundCategory[]).map((category) => (
          <div key={category}>
            <div className="flex justify-between mb-1">
              <span className="font-pixel capitalize">{category}</span>
              <span className="font-pixel">{Math.round(getCategoryVolume(category) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={getCategoryVolume(category)}
              onChange={(e) => setCategoryVolume(category, parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
        
        {/* Mute toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="mute-toggle"
            checked={isMuted}
            onChange={toggleMute}
          />
          <label htmlFor="mute-toggle" className="font-pixel cursor-pointer">Mute All Sounds</label>
        </div>
        
        {/* Sound enabled toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="sound-enabled"
            checked={isEnabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <label htmlFor="sound-enabled" className="font-pixel cursor-pointer">Enable Sound System</label>
        </div>
      </div>
    </div>
  );
}