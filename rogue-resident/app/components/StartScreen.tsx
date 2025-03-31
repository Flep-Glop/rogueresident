// app/components/StartScreen.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelButton, PixelText } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import Image from 'next/image';

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
  
  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Background image that fills the screen */}
      <div className="absolute inset-0">
        <Image
          src="/home-background.jpg"
          alt="Rogue Resident - Medical Physics Roguelike Game"
          fill
          style={{ objectFit: 'cover' }}
          priority // Ensures image loads quickly
        />
        {/* Optional overlay to darken image slightly for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between items-center p-8">
        {/* Game title at the top */}
        <div className="mt-8 text-center">
          <PixelText className="text-6xl font-pixel-heading text-white drop-shadow-lg mb-4">
            Rogue Resident
          </PixelText>
          <PixelText className="text-2xl text-white drop-shadow-md font-pixel">
            Medical Physics Residency
          </PixelText>
        </div>
        
        {/* Buttons at the bottom */}
        <div className="mb-16 flex flex-col items-center">
          {/* Semi-transparent panel */}
          <div className="bg-surface/80 p-6 rounded-lg pixel-borders mb-8 max-w-md">
            <p className="mb-4 font-pixel text-text-primary text-center">
              Embark on your journey as a medical physics resident.
              Navigate challenges, master your skills, and discover the mysteries
              of the hospital from your peaceful hillside home.
            </p>
          </div>
          
          <div className="flex space-x-4">
            <PixelButton
              className="px-8 py-3 bg-clinical text-white hover:bg-clinical-light text-xl font-pixel"
              onClick={handleStartNewGame}
            >
              Start New Run
            </PixelButton>
            
            <PixelButton
              className="px-4 py-3 bg-surface/80 text-text-primary hover:bg-surface-dark text-lg font-pixel"
              onClick={() => setShowCredits(true)}
            >
              Credits
            </PixelButton>
          </div>
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
      
      {/* Subtle scanline effect - optional */}
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none"></div>
    </div>
  );
}