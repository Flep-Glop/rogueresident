// ==== START: app/components/map/SimplifiedKapoorMap.tsx ====
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Circle, Line, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node'; // Type import from konva

import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { Button } from '@/components/ui/button'; // Assuming shadcn Button is setup in [project_root]/components/ui

// NOTE: If you still get errors below about MapNode or GameEvent not being exported,
// ensure the corresponding files (app/types/game.ts, app/core/events/EventTypes.ts)
// are saved correctly and try restarting your dev server and/or IDE.
import { MapNode, JournalEntry } from '@/app/types/game'; // Import JournalEntry type too
import CentralEventBus from '@/app/core/events/CentralEventBus';
import { GameEvent } from '@/app/core/events/EventTypes';

/**
 * SimplifiedKapoorMap Component
 *
 * Renders a simplified version of the Kapoor Map for calibration/testing.
 * Allows node interaction and potentially triggering events.
 */
const SimplifiedKapoorMap: React.FC = () => {
  // State for map nodes - simplified structure for testing
  const [nodes, setNodes] = useState<MapNode[]>([
    // Example nodes - replace with actual data loading/generation
    { id: 'node-1', x: 100, y: 100, label: 'Start', type: 'system', connections: ['node-2'], data: {} },
    { id: 'node-2', x: 300, y: 150, label: 'Midpoint', type: 'system', connections: ['node-3'], data: {} },
    { id: 'node-3', x: 500, y: 100, label: 'End', type: 'system', connections: [], data: {} },
  ]);

  // Access relevant stores (example)
  // NOTE: If you get TS errors on the lines below (e.g., property does not exist),
  // ensure the store definitions (gameStore.ts, knowledgeStore.ts) are correct and saved,
  // then try restarting your dev server / IDE, as it might be a caching issue.
  const currentSystem = useGameStore((state) => state.currentSystem);
  const addJournalEntry = useJournalStore((state) => state.addEntry);
  const unlockKnowledge = useKnowledgeStore((state) => state.unlockKnowledge);

  // --- Event Handling ---

  // Handle clicking on a map node
  const handleNodeClick = useCallback((nodeId: string) => {
    console.log(`Node clicked: ${nodeId}`);
    const clickedNode = nodes.find(n => n.id === nodeId);

    // Example interactions:
    // 1. Update game state (if needed)
    // useGameStore.setState({ currentNode: nodeId });

    // 2. Add journal entry
    const newEntry: Omit<JournalEntry, 'isNew'> = { // Use Omit if isNew is optional and handled by the store
      id: `journal-${nodeId}-${Date.now()}`,
      title: `Visited ${clickedNode?.label || nodeId}`,
      content: `Successfully navigated to ${clickedNode?.label || nodeId}.`,
      // timestamp: Date.now(), // Removed: timestamp is not part of JournalEntry type in game.ts
      tags: ['map', 'navigation', nodeId],
    };
    addJournalEntry(newEntry);

    // 3. Unlock knowledge
    unlockKnowledge(`knowledge-${nodeId}`); // Assumes knowledge ID follows this pattern

    // 4. Emit a central event
    // NOTE: If you get TS errors here (emit does not exist), ensure CentralEventBus.ts
    // exports the singleton instance correctly and try restarting dev server / IDE.
    CentralEventBus.emit(GameEvent.NODE_INTERACTION, { nodeId, interactionType: 'click' });

    // Potentially trigger dialogue or other game events based on the node
    // Example: if (nodeId === 'node-3') CentralEventBus.emit(GameEvent.START_DIALOGUE, { dialogueId: 'kapoor-calibration-end' });

  }, [nodes, addJournalEntry, unlockKnowledge]); // Dependencies for useCallback

  // Handle hovering over a node
  const handleNodeHover = (nodeId: string, isHovering: boolean) => {
    // Could be used for tooltips or visual feedback
    // console.log(`Node ${nodeId} hover state: ${isHovering}`);
    // Example: Update cursor style - ensure this runs client-side
    if (typeof window !== 'undefined') {
      document.body.style.cursor = isHovering ? 'pointer' : 'default';
    }
  };

  // --- Rendering ---

  // Find node coordinates for drawing lines
  const getNodeCoords = (nodeId: string): { x: number; y: number } | null => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : null;
  };

  // Effect to handle dynamic sizing (optional but good practice)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 }); // Default size

  useEffect(() => {
    const handleResize = () => {
      // Example: Adjust stage size based on parent container or window
      // You might need a reference to the container div for more accurate sizing
      setStageSize({
          width: window.innerWidth * 0.8, // Adjust multiplier as needed
          height: window.innerHeight * 0.6 // Adjust multiplier as needed
      });
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="w-full h-full border border-gray-700 rounded-lg overflow-hidden relative bg-gray-900 flex items-center justify-center">
      {/* Konva Stage for drawing the map */}
      {/* Wrap Stage in a div if more complex layout/sizing is needed */}
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {/* Draw connection lines */}
          {nodes.map(node =>
            // Add explicit type for targetId to satisfy noImplicitAny
            node.connections.map((targetId: string) => {
              const startCoords = getNodeCoords(node.id);
              const endCoords = getNodeCoords(targetId);
              if (startCoords && endCoords) {
                return (
                  <Line
                    key={`${node.id}-${targetId}`}
                    points={[startCoords.x, startCoords.y, endCoords.x, endCoords.y]}
                    stroke="rgba(100, 100, 255, 0.5)" // Use theme color later
                    strokeWidth={2}
                    listening={false} // Lines don't need interaction
                  />
                );
              }
              return null;
            })
          )}

          {/* Draw nodes */}
          {nodes.map(node => (
            <Circle
              key={node.id}
              x={node.x}
              y={node.y}
              radius={15} // Adjust size
              fill={node.id === useGameStore.getState().currentNode ? "rgba(255, 200, 0, 0.9)" : "rgba(0, 150, 255, 0.8)"} // Example: Highlight current node
              stroke="white"
              strokeWidth={1}
              onClick={(e: KonvaEventObject<MouseEvent>) => {
                  e.evt.preventDefault(); // Prevent default browser actions if any
                  handleNodeClick(node.id)
              }}
              onTap={(e: KonvaEventObject<TouchEvent>) => { // For touch devices
                  e.evt.preventDefault();
                  handleNodeClick(node.id)
              }}
              onMouseEnter={() => handleNodeHover(node.id, true)}
              onMouseLeave={() => handleNodeHover(node.id, false)}
              hitStrokeWidth={20} // Increases clickable area without changing visual size
            />
          ))}

          {/* Draw node labels */}
          {nodes.map(node => (
            <Text
              key={`${node.id}-label`}
              x={node.x + 20} // Position label next to node
              y={node.y - 5}
              text={node.label}
              fontSize={12}
              fill="white"
              listening={false} // Labels don't need interaction
            />
          ))}
        </Layer>
      </Stage>

      {/* Example UI Element - Button using shadcn */}
      <div className="absolute bottom-4 right-4 z-10"> {/* Ensure button is above canvas */}
        <Button
          variant="outline" // Example variant
          onClick={() => {
            console.log("Map action button clicked!");
            // NOTE: Check CentralEventBus note above if TS errors occur here
            CentralEventBus.emit(GameEvent.DEBUG_COMMAND, { command: 'reset-map-view' });
          }}
        >
          Map Action
        </Button>
      </div>

      {/* Display current system (example) */}
      <div className="absolute top-4 left-4 text-xs text-gray-400 z-10"> {/* Ensure text is above canvas */}
        Current System: {currentSystem || 'None'}
      </div>
    </div>
  );
};

export default SimplifiedKapoorMap;
// ==== END: app/components/map/SimplifiedKapoorMap.tsx ====