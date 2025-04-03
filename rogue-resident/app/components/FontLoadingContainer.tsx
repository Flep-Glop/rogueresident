'use client';
// app/components/FontLoadingContainer.tsx

import { useState, useEffect } from 'react';

/**
 * A client component that handles font loading state management
 * Ensures content is only shown when custom fonts are loaded
 * 
 * Using a separate file with 'use client' directive rather than
 * cluttering the layout with client component logic
 */
export default function FontLoadingContainer({ children }: { children: React.ReactNode }) {
  // Flag to track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Use the Font Loading API to check when our custom fonts are ready
    if ('fonts' in document) {
      // Wait for the relevant fonts to load
      Promise.all([
        (document as any).fonts.load('1em "VT323"'),
        (document as any).fonts.load('1em "Press Start 2P"')
      ]).then(() => {
        // Short delay to ensure all font rendering is complete
        setTimeout(() => {
          setFontsLoaded(true);
        }, 50);
      }).catch(err => {
        // If there's an error, still show content after a timeout
        console.error('Font loading error:', err);
        setTimeout(() => {
          setFontsLoaded(true);
        }, 500);
      });
    } else {
      // Fallback for browsers without Font Loading API
      setTimeout(() => {
        setFontsLoaded(true);
      }, 500);
    }
  }, []);

  // Show loading indicator until fonts are ready
  if (!fontsLoaded) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-clinical border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="font-sans text-text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  // Once fonts are loaded, render children
  return <>{children}</>;
}