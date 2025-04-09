// app/components/knowledge/ui/HelpOverlay.tsx
import React from 'react';
import { PixelText, PixelButton } from '../../PixelThemeProvider';
import { DOMAIN_COLORS } from '../../../core/themeConstants'; // Import colors for themed text

interface HelpOverlayProps {
  showHelp: boolean;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Displays the Help overlay for the constellation view.
 */
export const HelpOverlay: React.FC<HelpOverlayProps> = ({ showHelp, setShowHelp }) => {
  if (!showHelp) return null;

  return (
    <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
      <div className="bg-surface p-6 max-w-lg w-full pixel-borders max-h-[90vh] overflow-y-auto">
        {/* Overlay Header */}
        <div className="flex justify-between items-center mb-4">
          <PixelText className="text-2xl text-white">Constellation Help</PixelText>
          <PixelButton
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={() => setShowHelp(false)}
            size="sm"
          >
            Close
          </PixelButton>
        </div>

        {/* Help Content Sections */}
        <div className="space-y-4 mb-4">
          {/* Viewing Knowledge Section */}
          <div>
            <PixelText className="mb-1 font-medium" style={{ color: DOMAIN_COLORS.theoretical }}>Viewing Knowledge</PixelText>
            <PixelText className="text-sm text-text-secondary">
              Your constellation represents your knowledge in different domains of medical physics.
              Each star is a concept you've learned, with brighter stars indicating higher mastery. Connections show relationships between concepts.
            </PixelText>
          </div>

          {/* Creating Connections Section */}
          <div>
            <PixelText className="mb-1 font-medium" style={{ color: DOMAIN_COLORS.theoretical }}>Creating Connections</PixelText>
            <PixelText className="text-sm text-text-secondary">
              1. Click on a concept star to select it.
            </PixelText>
            <PixelText className="text-sm text-text-secondary">
              2. Click the "Connect" button in the details panel (or click the selected star again).
            </PixelText>
            <PixelText className="text-sm text-text-secondary">
              3. Click another concept star to form the connection.
            </PixelText>
            <PixelText className="text-sm text-text-secondary mt-1">
              Connecting related concepts deepens your understanding and grants additional insight points.
            </PixelText>
          </div>

          {/* Knowledge Application Section */}
          <div>
            <PixelText className="mb-1 font-medium" style={{ color: DOMAIN_COLORS.theoretical }}>Knowledge Application</PixelText>
            <PixelText className="text-sm text-text-secondary">
              Your knowledge constellation unlocks new dialogue options and challenge approaches during gameplay.
              Higher mastery in relevant domains improves your performance in challenges and interactions.
            </PixelText>
          </div>

          {/* Navigation Controls Section */}
          <div>
            <PixelText className="mb-1 font-medium" style={{ color: DOMAIN_COLORS.theoretical }}>Navigation Controls</PixelText>
            <PixelText className="text-sm text-text-secondary">
              • Click and drag anywhere on the background to pan the view.
            </PixelText>
             <PixelText className="text-sm text-text-secondary">
              • Use the mouse wheel to zoom in and out.
            </PixelText>
             <PixelText className="text-sm text-text-secondary">
              • Right-click and drag also works for panning.
            </PixelText>
             <PixelText className="text-sm text-text-secondary">
              • Use the +/- buttons (bottom right) to adjust zoom level.
            </PixelText>
             <PixelText className="text-sm text-text-secondary">
              • Click the ↺ button to reset zoom and position.
            </PixelText>
          </div>
        </div>

        {/* Pro Tip Section */}
        <div className="p-3 bg-surface-dark pixel-borders-thin">
          <PixelText className="mb-1 font-medium" style={{ color: DOMAIN_COLORS['clinical-practice'] }}>Pro Tip</PixelText>
          <PixelText className="text-sm text-text-secondary">
            The most powerful insights often come from connecting concepts across different knowledge domains.
            Try linking clinical knowledge with radiation physics principles!
          </PixelText>
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
