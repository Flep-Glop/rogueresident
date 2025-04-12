// app/components/PixelThemeProvider.tsx
'use client';
import React from 'react';
import { motion } from 'framer-motion';

// Interface definitions remain the same...
interface PixelTextProps {
  children: React.ReactNode;
  className?: string;
  pixelated?: boolean;
}

interface PixelButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'clinical' | 'qa' | 'educational' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

interface PixelBoxProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'light' | 'clinical' | 'qa' | 'educational';
  bordered?: boolean;
}


/**
 * PixelText - Typography component with pixel-perfect rendering
 * (This is the definitive version to be imported by other components)
 */
export function PixelText({
  children,
  className = '',
  pixelated = false
}: PixelTextProps) {
  return (
    <div
      className={`font-pixel ${pixelated ? 'text-rendering-pixelated' : ''} ${className}`}
      style={pixelated ? { imageRendering: 'pixelated' } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * PixelButton - Interactive component with consistent tactile feedback
 */
export function PixelButton({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md',
  icon
}: PixelButtonProps) {
  const variantClasses = {
    default: "bg-gray-800 border-gray-900 hover:bg-gray-700 text-white",
    primary: "bg-blue-700 border-blue-900 hover:bg-blue-600 text-white",
    clinical: "bg-clinical border-clinical-dark hover:bg-clinical-light text-white",
    qa: "bg-qa border-qa-dark hover:bg-qa-light text-white",
    educational: "bg-educational border-educational-dark hover:bg-educational-light text-white",
    success: "bg-green-700 border-green-900 hover:bg-green-600 text-white",
    danger: "bg-red-700 border-red-900 hover:bg-red-600 text-white"
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <motion.button
      className={`
        font-pixel border-2 pixel-borders
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { y: 1 }}
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-center">
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </div>
    </motion.button>
  );
}

/**
 * PixelBox - Container with pixel-perfect borders
 */
export function PixelBox({
  children,
  className = '',
  variant = 'default',
  bordered = true
}: PixelBoxProps) {
  const variantClasses = {
    default: "bg-surface",
    dark: "bg-surface-dark",
    light: "bg-surface-light",
    clinical: "bg-clinical bg-opacity-10",
    qa: "bg-qa bg-opacity-10",
    educational: "bg-educational bg-opacity-10"
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${bordered ? 'pixel-borders' : ''}
        ${className}
      `}
      style={bordered ? { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * PixelThemeProvider - Context provider for consistent theming
 */
export default function PixelThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      {/* Global pixel styles */}
      <style jsx global>{`
        /* Pixel rendering quality */
        .text-rendering-pixelated {
          text-rendering: optimizeSpeed;
          -webkit-font-smoothing: none;
        }

        /* Custom pixel borders with inset highlight */
        .pixel-borders {
          position: relative;
          border: 2px solid #0f172a;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
        }

        .pixel-borders::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 1px;
          height: 1px;
          background-color: rgba(255,255,255,0.2);
        }

        .pixel-borders-thin {
          position: relative;
          border: 1px solid #0f172a;
        }

        /* Thicker borders for emphasis */
        .pixel-borders-lg {
          position: relative;
          border: 3px solid #0f172a;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
        }

        .pixel-borders-lg::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 2px;
          background-color: rgba(255,255,255,0.2);
        }

        /* Glow effects */
        .pixel-glow {
          text-shadow: 0 0 4px currentColor;
        }

        /* Font size for tiny text */
        .text-2xs {
          font-size: 0.625rem;
          line-height: 0.75rem;
        }
      `}</style>
    </>
  );
}