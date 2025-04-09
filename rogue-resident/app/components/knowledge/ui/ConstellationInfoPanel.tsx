// app/components/knowledge/ui/ConstellationInfoPanel.tsx
import React from 'react';
import { PixelText } from '../../PixelThemeProvider';
import { ConceptNode, ConceptConnection } from '../../../store/knowledgeStore';

interface ConstellationInfoPanelProps {
  discoveredNodes: ConceptNode[];
  totalNodes: number;
  discoveredConnections: ConceptConnection[];
  totalMastery: number;
}

/**
 * Displays overview information about the constellation.
 */
export const ConstellationInfoPanel: React.FC<ConstellationInfoPanelProps> = ({
  discoveredNodes,
  totalNodes,
  discoveredConnections,
  totalMastery,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-surface-dark/80 p-3 pixel-borders-thin text-sm">
        <PixelText className="text-text-primary mb-1">Knowledge Constellation</PixelText>
        <div className="text-text-secondary">
          {/* Display count of discovered nodes vs total nodes */}
          <div>Discovered: {discoveredNodes.length}/{totalNodes}</div>
          {/* Display count of discovered connections */}
          <div>Connections: {discoveredConnections.length}</div>
          {/* Display total mastery percentage */}
          <div>Mastery: {totalMastery}%</div>
        </div>
      </div>
    </div>
  );
};

export default ConstellationInfoPanel;
