export type NodeType = 'clinical' | 'qa' | 'educational' | 'storage' | 'vendor' | 'boss';

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  connections: string[]; // IDs of connected nodes
  isLocked: boolean;
  content?: any; // Challenge data
}

export interface GameMap {
  nodes: Node[];
  startNodeId: string;
  bossNodeId: string;
}

export interface PlayerStats {
  health: number;
  insight: number;
}