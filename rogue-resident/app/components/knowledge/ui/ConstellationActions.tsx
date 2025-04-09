// app/components/knowledge/ui/ConstellationActions.tsx
import React from 'react';
import { PixelButton } from '../../PixelThemeProvider';

interface ConstellationActionsProps {
  enableJournal: boolean;
  setJournalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
}

/**
 * Provides main action buttons like Journal, Help, and Close.
 */
export const ConstellationActions: React.FC<ConstellationActionsProps> = ({
  enableJournal,
  setJournalVisible,
  setShowHelp,
  onClose,
}) => {
  return (
    <div className="absolute bottom-4 right-4 flex space-x-3 z-10">
      {/* Journal Button (conditional) */}
      {enableJournal && (
        <PixelButton
          className="bg-surface hover:bg-surface-dark text-text-primary"
          onClick={() => setJournalVisible(true)}
        >
          Journal
        </PixelButton>
      )}
      {/* Help Button */}
      <PixelButton
        className="bg-surface hover:bg-surface-dark text-text-primary"
        onClick={() => setShowHelp(true)}
      >
        Help
      </PixelButton>
      {/* Close Button (conditional) */}
      {onClose && (
        <PixelButton
          className="bg-surface hover:bg-danger text-text-primary"
          onClick={onClose}
        >
          Close
        </PixelButton>
      )}
    </div>
  );
};

export default ConstellationActions;
