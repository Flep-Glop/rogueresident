// app/types/map.ts
import { ChallengeContent, ChallengeFormat, CharacterId, EquipmentType, ProcedureType } from './challenge';

/**
 * Node position in percentage units for responsive layouts
 */
export interface NodePosition {
  x: number; // percentage from left
  y: number; // percentage from top
}

/**
 * Expanded node types to support richer gameplay patterns
 */
export type NodeType = 
  | 'kapoorCalibration' // Primary calibration node - direct to specialized experience
  | 'clinical'     // Patient-focused challenges
  | 'qa'           // Equipment QA challenges
  | 'educational'  // Learning-focused nodes
  | 'experimental' // High-risk, high-reward challenges
  | 'storage'      // Item acquisition nodes
  | 'vendor'       // Shop/upgrade nodes
  | 'entrance'     // Starting point
  | 'qualification' // Required for boss access
  | 'boss'         // Generic boss encounter
  | 'boss-ionix';  // Specific boss type
  
/**
 * Node state for visual treatment and interaction rules
 * - 'active': Currently selected node
 * - 'completed': Successfully finished node
 * - 'accessible': Available for selection
 * - 'future': Visible but not yet accessible
 * - 'locked': Hidden/unknown node
 */
export type NodeState = 'active' | 'completed' | 'accessible' | 'future' | 'locked';

/**
 * Runtime type guard for NodeState checking
 * This pattern resolves the TypeScript comparison errors with string literal types
 */
export function isNodeState(value: string, state: NodeState): boolean {
  // Runtime check that bypasses TypeScript's compile-time type checking
  return value === state;
}

/**
 * Connection between nodes with visual state
 */
export interface NodeConnection {
  source: string;
  target: string;
  completed: boolean;
  available: boolean;
}

/**
 * Unified Node definition with all properties
 * Maintains backward compatibility with existing code while
 * adding support for new challenge system integration
 */
export interface Node {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  position: NodePosition;
  connections: string[]; // IDs of connected nodes
  isLocked: boolean;     // Legacy property, will be phased out in favor of visualState
  insightReward?: number;
  visualState?: NodeState; // Computed field for rendering
  
  // Challenge system integration
  challengeContent?: ChallengeContent; // Renamed from 'content' to avoid duplication
  format?: ChallengeFormat;
  character?: CharacterId;
  equipmentType?: EquipmentType;
  procedureType?: ProcedureType;
  caseId?: string;
  
  // Requirements for node access
  requirements?: {
    items?: string[];
    knowledge?: string[];
    nodesCompleted?: string[];
    insight?: number;
  };
}

// Maintain backward compatibility with existing code
export type MapNode = Node;

/**
 * Game map structure
 */
export interface GameMap {
  nodes: Node[];
  startNodeId: string;
  bossNodeId: string;
  dimensions?: {
    width: number;  // Logical width of map (percentage units)
    height: number; // Logical height of map (percentage units)
  };
}

/**
 * Player statistics
 */
export interface PlayerStats {
  health: number;
  maxHealth: number;
  insight: number;
}

/**
 * Map view state to handle scrolling and zooming
 */
export interface MapViewState {
  offsetX: number;
  offsetY: number;
  zoom: number;
  isDragging: boolean;
}

/**
 * Type bridge for utility functions to convert between types
 */
export const mapUtils = {
  // Convert from ChallengeNode to map.Node
  convertChallengeNode: (challengeNode: any): Node => {
    return {
      id: challengeNode.id,
      title: challengeNode.title || challengeNode.id || 'Unknown',
      description: challengeNode.description || '',
      type: mapChallengeTypeToNodeType(challengeNode.content),
      position: challengeNode.position || { x: 50, y: 50 },
      connections: challengeNode.connections || [],
      isLocked: false,
      insightReward: challengeNode.insightReward,
      challengeContent: challengeNode.content,
      format: challengeNode.format,
      character: challengeNode.character,
      equipmentType: challengeNode.equipmentType,
      procedureType: challengeNode.procedureType,
    };
  },
  
  // Convert legacy map to updated map format
  convertLegacyMap: (legacyMap: any): GameMap => {
    return {
      nodes: legacyMap.nodes.map((n: any) => mapUtils.convertChallengeNode(n)),
      startNodeId: legacyMap.startNodeId,
      bossNodeId: legacyMap.bossNodeId,
      dimensions: legacyMap.dimensions || {
        width: 100,
        height: 100
      },
    };
  },
};

// Helper function to map challenge content to node type
function mapChallengeTypeToNodeType(content: ChallengeContent): NodeType {
  switch(content) {
    case 'calibration': return 'clinical';
    case 'patient_case': return 'clinical';
    case 'equipment_qa': return 'qa';
    case 'lecture': return 'educational';
    case 'storage': return 'storage';
    default: return 'clinical';
  }
}