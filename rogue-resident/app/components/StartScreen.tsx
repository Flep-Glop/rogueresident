// app/components/StartScreen.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelButton, PixelText } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';

export default function StartScreen() {
  const { resetGame, startGame } = useGameStore();
  const { flashScreen, playSound } = useGameEffects();
  const [showCredits, setShowCredits] = useState(false);
  
  const handleStartNewGame = () => {
    // Reset to initial state
    resetGame();
    
    // Play sound effect
    if (playSound) playSound('click');
    
    // Apply screen transition effect
    if (flashScreen) flashScreen('white');
    
    // Short delay for transition effect
    setTimeout(() => {
      // Update gameState to 'in_progress'
      startGame();
    }, 500);
  };
  
  // Starfield animation effect
  useEffect(() => {
    const stars = document.querySelector('.animated-stars');
    if (!stars) return;
    
    const moveStars = () => {
      const y = Math.random() * 0.5;
      stars.animate(
        [
          { transform: 'translateY(0)' },
          { transform: `translateY(${y}px)` }
        ],
        {
          duration: 1000,
          easing: 'ease-in-out',
          fill: 'forwards'
        }
      );
    };
    
    const interval = setInterval(moveStars, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-text-primary p-4 relative overflow-hidden">
      {/* Animated starfield background */}
      <div className="absolute inset-0 starfield-bg animated-stars"></div>
      
      <div className="relative z-10">
        {/* Title with pulse animation */}
        <div className="animate-pulse mb-2 text-center">
          <PixelText className="text-6xl font-pixel-heading text-blue-400 mb-4">Rogue Resident</PixelText>
        </div>
        <PixelText className="text-2xl mb-12 text-blue-300 font-pixel text-center">Medical Physics Residency</PixelText>
        
        <div className="max-w-2xl bg-surface p-6 pixel-borders mb-12">
          <p className="mb-4 font-pixel text-text-primary">
            You are a new medical physics resident navigating through the challenges of your training.
            Explore different areas of the department, face clinical situations, discover useful equipment,
            and confront the mysterious Ionix anomaly.
          </p>
          
          <h3 className="text-xl font-pixel text-blue-300 mb-2">How to Play:</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1 font-pixel text-text-secondary">
            <li>During the day, navigate through the hospital map by selecting connected nodes</li>
            <li>Complete challenges to earn insight and unlock new paths</li>
            <li>Find useful items in storage closets to help with your challenges</li>
            <li>At night, return to your hillside home to study and upgrade your skills</li>
            <li>Reach and defeat the boss to complete your residency</li>
          </ul>
          
          <p className="italic text-text-secondary text-sm font-pixel">
            This prototype demonstrates the core gameplay loop with basic features.
            The full game would include more diverse challenges, items, and progression.
          </p>
        </div>
        
        <div className="flex justify-center space-x-4">
          <PixelButton
            className="px-8 py-3 bg-clinical text-white hover:bg-clinical-light text-xl font-pixel"
            onClick={handleStartNewGame}
          >
            Start New Run
          </PixelButton>
          
          <PixelButton
            className="px-4 py-3 bg-surface text-text-primary hover:bg-surface-dark text-lg font-pixel"
            onClick={() => setShowCredits(true)}
          >
            Credits
          </PixelButton>
        </div>
      </div>
      
      {/* Credits modal */}
      {showCredits && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Credits</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowCredits(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <div className="space-y-4">
              <div>
                <PixelText className="text-lg text-blue-300 mb-1">Game Design & Development</PixelText>
                <PixelText>Rogue Resident Team</PixelText>
              </div>
              
              <div>
                <PixelText className="text-lg text-blue-300 mb-1">Educational Content</PixelText>
                <PixelText>Medical Physics Department</PixelText>
              </div>
              
              <div>
                <PixelText className="text-lg text-blue-300 mb-1">Special Thanks</PixelText>
                <PixelText>All the testers and contributors</PixelText>
              </div>
              
              <div className="pt-4 border-t border-border">
                <PixelText className="text-sm text-text-secondary text-center">
                  This is a prototype build for educational purposes.
                </PixelText>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CRT scanline effect */}
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
    </div>
  );
}