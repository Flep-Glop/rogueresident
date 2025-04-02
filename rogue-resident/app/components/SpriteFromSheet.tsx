// components/SpriteFromSheet.tsx
'use client';
import React from 'react';
import { SPRITE_SHEETS } from '../data/spriteMapping';

interface SpritePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpriteFromSheetProps {
  sheet: string; // The path to the spritesheet
  position: SpritePosition;
  scale?: number; // Integer scaling
  className?: string;
  onClick?: () => void;
  totalWidth?: number; // Optional total sheet width
  totalHeight?: number; // Optional total sheet height
}

export function SpriteFromSheet({
  sheet,
  position,
  scale = 1,
  className = "",
  onClick,
  totalWidth,
  totalHeight,
}: SpriteFromSheetProps) {
  const { x, y, width, height } = position;
  
  // Extract sheet path and determine if it's one of our known sheets
  const sheetPath = sheet.startsWith('/') ? sheet : `/${sheet}`;
  const knownSheet = Object.values(SPRITE_SHEETS).find(s => s.src === sheetPath);
  
  // Use provided dimensions, or try to get them from our known sheets
  const sheetWidth = totalWidth || knownSheet?.width || 384; // Default fallback
  const sheetHeight = totalHeight || knownSheet?.height || 320; // Default fallback
  
  return (
    <div className="inline-block overflow-hidden" style={{ width: width * scale, height: height * scale }}>
      <div 
        className={`pixel-art-sprite ${className}`}
        style={{
          width: width * scale,
          height: height * scale,
          backgroundImage: `url(${sheet})`,
          backgroundPosition: `-${x}px -${y}px`,
          backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
          imageRendering: 'pixelated', // Modern browsers
          transform: 'translateZ(0)', // Force GPU acceleration for smoother scaling
        }}
        onClick={onClick}
      />
    </div>
  );
}