'use client';
import React from 'react';

interface PixelHealthBarProps {
  currentHealth: number;
  maxHealth: number;
  className?: string;
}

export default function PixelHealthBar({
  currentHealth,
  maxHealth,
  className = '',
}: PixelHealthBarProps) {
  return (
    <div className={`flex ${className}`}>
      {[...Array(maxHealth)].map((_, i) => (
        <div
          key={i}
          className={`health-pixel mx-pixel-2 ${
            i < currentHealth
              ? 'bg-danger animate-pulse'
              : 'bg-dark-gray'
          }`}
        >
          {/* Add small inner shadow for 3D effect */}
          <div className={`
            w-full h-full
            ${i < currentHealth 
              ? 'shadow-[inset_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_0_rgba(0,0,0,0.3)]' 
              : 'shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.2)]'}
          `}></div>
        </div>
      ))}
    </div>
  );
}

// Pixel progress bar component
interface PixelProgressBarProps {
  value: number;
  maxValue: number;
  className?: string;
  barColor?: string;
}

export function PixelProgressBar({
  value,
  maxValue,
  className = '',
  barColor = 'var(--accent-primary)',
}: PixelProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  return (
    <div className={`pixel-progress-bg ${className}`}>
      <div 
        className="pixel-progress-fill h-full transition-all duration-300"
        style={{ 
          width: `${percentage}%`,
          background: `repeating-linear-gradient(
            to right,
            ${barColor},
            ${barColor} 8px,
            ${barColor}cc 8px,
            ${barColor}cc 16px
          )`
        }}
      />
    </div>
  );
}