'use client';
import React from 'react';

interface PixelTextProps {
  children: React.ReactNode;
  className?: string;
}

interface PixelButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * A simplified text component with pixel font styling
 */
export function PixelText({ children, className = '' }: PixelTextProps) {
  return (
    <div className={`font-pixel ${className}`}>
      {children}
    </div>
  );
}

/**
 * A simplified button component with pixel styling
 */
export function PixelButton({ 
  children, 
  className = '', 
  onClick,
  disabled = false
}: PixelButtonProps) {
  return (
    <button
      className={`px-4 py-2 font-pixel pixel-borders-thin transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * A theme provider component that can be expanded later
 * but currently just exports the components directly
 */
export default function PixelThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}