'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelBorder, PixelText } from './PixelThemeProvider';
import { PixelProgressBar } from './PixelHealthBar';
import Image from 'next/image';
import Inventory from './Inventory';

export default function PlayerStats() {
  const { health, insight } = useGameStore((state) => state.player);
  const { gamePhase } = useGameStore();
  
  // Character progression state tracking based on insight for prototype
  // This will later be connected to the knowledge constellation system
  const knowledgeLevel = useGameStore((state) => {
    // For prototype, derive knowledge level from player insight instead
    return Math.min(Math.floor(state.player.insight / 40), 4); // 0-4 based on insight
  });
  
  const [characterState, setCharacterState] = useState('default');
  const [equipmentLevel, setEquipmentLevel] = useState(0);
  
  // Update character state based on knowledge progression
  useEffect(() => {
    // Character confidence evolves with knowledge
    if (knowledgeLevel >= 4) {
      setCharacterState('expert');
      setEquipmentLevel(3);
    } else if (knowledgeLevel >= 2) {
      setCharacterState('confident');
      setEquipmentLevel(2);
    } else if (knowledgeLevel >= 1) {
      setCharacterState('default');
      setEquipmentLevel(1);
    } else {
      setCharacterState('default');
      setEquipmentLevel(0);
    }
  }, [knowledgeLevel]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header with character identity */}
      <div className="p-4 border-b border-gray-800">
        <PixelText className="text-lg font-pixel">The Resident</PixelText>
        <div className="text-xs font-pixel text-educational-light">
          {characterState === 'default' ? 'Novice' : 
           characterState === 'confident' ? 'Practitioner' : 'Expert'}
        </div>
      </div>
    
      {/* Enhanced Character Container */}
      <div className="character-container relative p-4 min-h-[320px] flex justify-center">
        {/* Day/Night state-aware backdrop */}
        <div className={`absolute inset-0 ${gamePhase === 'night' ? 'bg-gradient-to-b from-indigo-900/30 to-surface-dark' : 'bg-surface-dark'}`}>
          {/* Environmental elements that reflect progression */}
          {knowledgeLevel > 2 && (
            <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-educational/10 to-transparent"></div>
          )}
        </div>
        
        {/* Ambient character presence */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-educational/5 animate-pulse-slow opacity-25 blur-md"></div>
        </div>
        
        {/* Full body character visualization with proper framing */}
        <div className="relative h-full w-full flex justify-center items-center">
          <div className="relative h-[240px] w-[160px]">
            <Image
              src="/images/resident-full.png" // In production: resident-${characterState}.png
              alt="The Resident"
              fill
              className="pixel-art object-contain scale-150"
              priority
              sizes="160px"
            />
            
            {/* Equipment progression visualization */}
            {equipmentLevel > 0 && (
              <div className="absolute top-0 left-0 w-full h-full">
                <div className={`absolute inset-0 bg-educational/5 transition-opacity duration-500 ${equipmentLevel > 0 ? 'opacity-100' : 'opacity-0'}`}></div>
                {/* This would be replaced with actual equipment overlay sprites */}
                {equipmentLevel >= 2 && (
                  <div className="absolute top-[40px] left-[30px] w-6 h-6 bg-educational/30 rounded-full"></div>
                )}
                {equipmentLevel >= 3 && (
                  <div className="absolute top-[70px] right-[20px] w-8 h-3 bg-educational/40"></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Player vitals section */}
      <div className="flex-shrink-0 p-4 border-t border-b border-gray-800">
        <h2 className="pixel-heading text-lg mb-3">Vitals</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <PixelText className="text-text-primary">Health</PixelText>
              <PixelText className="text-text-secondary">{health}/4</PixelText>
            </div>
            <div className="flex">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-12 h-12 mx-1 ${i < health ? 'bg-danger' : 'bg-dark-gray opacity-30'} pixel-borders-thin`}>
                  <div className="w-full h-full shadow-[inset_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_0_rgba(0,0,0,0.3)]"></div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <PixelText className="text-text-primary">Insight</PixelText>
              <PixelText className="text-text-secondary">{insight}</PixelText>
            </div>
            <PixelProgressBar 
              value={insight} 
              maxValue={200} 
              barColor="var(--educational)" 
            />
          </div>
        </div>
      </div>
      
      {/* Inventory section */}
      <div className="flex-grow p-4 overflow-auto">
        <div className="mb-2">
          <PixelText className="font-pixel">Inventory</PixelText>
        </div>
        <Inventory compact={true} />
      </div>
    </div>
  );
}