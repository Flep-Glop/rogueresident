'use client';
import { useGameStore } from '../store/gameStore';
import { generateMap } from '../utils/mapGenerator';
import NodeComponent from './NodeComponent';
import { useState, useEffect } from 'react';
import { GameMap as GameMapType } from '../types/map';

export default function GameMap() {
  const { currentNodeId, completedNodeIds, setCurrentNode } = useGameStore();
  const [map, setMap] = useState<GameMapType | null>(null);
  
  // Generate map only on client side
  useEffect(() => {
    setMap(generateMap());
  }, []);
  
  if (!map) {
    return <div className="flex items-center justify-center h-full">Loading map...</div>;
  }
  
  // Determine which nodes are available (connected to completed nodes or start)
  const availableNodeIds = new Set<string>();
  
  // Start node is always available
  availableNodeIds.add(map.startNodeId);
  
  // Add nodes connected to completed nodes
  completedNodeIds.forEach(nodeId => {
    const node = map.nodes.find(n => n.id === nodeId);
    if (node) {
      node.connections.forEach(connId => availableNodeIds.add(connId));
    }
  });
  
  return (
    <div className="relative w-full h-full bg-gray-200 overflow-hidden">
      {/* Draw connections between nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {map.nodes.map(node => 
          node.connections.map(connId => {
            const targetNode = map.nodes.find(n => n.id === connId);
            if (!targetNode) return null;
            
            return (
              <line
                key={`${node.id}-${connId}`}
                x1={node.position.x * 150 + 50}
                y1={node.position.y * 100 + 50}
                x2={targetNode.position.x * 150 + 50}
                y2={targetNode.position.y * 100 + 50}
                stroke="#666"
                strokeWidth={2}
              />
            );
          })
        )}
      </svg>
      
      {/* Render nodes */}
      {map.nodes.map(node => {
        const isAvailable = availableNodeIds.has(node.id);
        const isCompleted = completedNodeIds.includes(node.id);
        const isSelected = node.id === currentNodeId;
        
        return (
          <NodeComponent
            key={node.id}
            node={node}
            isAvailable={isAvailable}
            isCompleted={isCompleted}
            isSelected={isSelected}
            onClick={() => {
              if (isAvailable) setCurrentNode(node.id);
            }}
          />
        );
      })}
    </div>
  );
}