// app/components/knowledge/ui/ConstellationControls.tsx
import React from 'react';
import { PixelButton } from '../../PixelThemeProvider';

interface ConstellationControlsProps {
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  setCameraPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

/**
 * Provides zoom and reset controls for the constellation view.
 */
export const ConstellationControls: React.FC<ConstellationControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  setCameraPosition,
}) => {
  return (
    <div className="absolute bottom-20 right-4 flex flex-col space-y-2 z-10">
      {/* Zoom In Button */}
      <PixelButton
        className="w-8 h-8 flex items-center justify-center bg-surface-dark"
        onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
        aria-label="Zoom In"
      >
        +
      </PixelButton>
      {/* Zoom Out Button */}
      <PixelButton
        className="w-8 h-8 flex items-center justify-center bg-surface-dark"
        onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
        aria-label="Zoom Out"
      >
        -
      </PixelButton>
      {/* Reset View Button */}
      <PixelButton
        className="w-8 h-8 flex items-center justify-center bg-surface-dark"
        onClick={() => {
          setZoomLevel(0.8); // Reset to initial zoom
          setCameraPosition({ x: 0, y: 0 }); // Reset camera position
        }}
        aria-label="Reset View"
      >
        ↺
      </PixelButton>
    </div>
  );
};

export default ConstellationControls;
