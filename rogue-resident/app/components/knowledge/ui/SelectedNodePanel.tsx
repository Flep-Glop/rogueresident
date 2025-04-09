// app/components/knowledge/ui/SelectedNodePanel.tsx
import React from 'react';
import { PixelText, PixelButton } from '../../PixelThemeProvider';
import { ConceptNode, KnowledgeDomain, KNOWLEDGE_DOMAINS } from '../../../store/knowledgeStore';
import { DOMAIN_COLORS } from '../../../core/themeConstants';

interface SelectedNodePanelProps {
  selectedNode: ConceptNode | null;
  discoveredNodes: ConceptNode[]; // Needed to count connections
  pendingConnection: string | null;
  setPendingConnection: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Displays details for the currently selected concept node.
 */
export const SelectedNodePanel: React.FC<SelectedNodePanelProps> = ({
  selectedNode,
  discoveredNodes,
  pendingConnection,
  setPendingConnection,
}) => {
  if (!selectedNode) return null;

  const domainInfo = KNOWLEDGE_DOMAINS[selectedNode.domain];
  const domainColor = DOMAIN_COLORS[selectedNode.domain];

  // Calculate number of *discovered* connections for the selected node
  const connectionCount = selectedNode.connections.filter(targetId =>
    discoveredNodes.some(node => node.id === targetId && node.discovered)
  ).length;

  return (
    <div className="absolute top-1/2 right-4 transform -translate-y-1/2 max-w-xs bg-surface-dark/90 p-3 pixel-borders z-10">
      {/* Header section with node name, domain, and mastery */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center mb-1">
            {/* Domain color indicator */}
            <div
              className="w-3 h-3 mr-2 flex-shrink-0"
              style={{ backgroundColor: domainColor }}
            ></div>
            {/* Node Name */}
            <PixelText className="text-lg font-medium text-white">
              {selectedNode.name}
            </PixelText>
          </div>
          {/* Domain Name */}
          <PixelText className="text-sm text-text-secondary">
            {domainInfo?.name || 'Unknown Domain'}
          </PixelText>
        </div>
        {/* Mastery Display */}
        <div className="bg-surface px-2 py-1 text-sm ml-2 flex-shrink-0">
          <PixelText className="text-text-secondary">Mastery:</PixelText>
          <PixelText className="text-white">{selectedNode.mastery}%</PixelText>
        </div>
      </div>

      {/* Node Description */}
      <PixelText className="text-sm mb-3 text-text-primary">{selectedNode.description}</PixelText>

      {/* Connection Info and Button */}
      <div className="flex justify-between items-center mt-2">
        {/* Connection Status Text */}
        <PixelText className="text-text-secondary text-xs">
          {pendingConnection === selectedNode.id
            ? 'Click another node to connect'
            : `Connections: ${connectionCount}`}
        </PixelText>

        {/* Connect Button (shown only if not currently starting a connection from this node) */}
        {!pendingConnection && (
          <PixelButton
            size="sm" // Smaller button for this context
            className="text-xs py-1 bg-blue-600 text-white"
            onClick={() => setPendingConnection(selectedNode.id)}
          >
            Connect
          </PixelButton>
        )}
        {/* Cancel Button (shown only if starting a connection from this node) */}
         {pendingConnection === selectedNode.id && (
           <PixelButton
             size="sm"
             className="text-xs py-1 bg-red-700 text-white"
             onClick={() => setPendingConnection(null)}
           >
             Cancel
           </PixelButton>
         )}
      </div>
    </div>
  );
};

export default SelectedNodePanel;
