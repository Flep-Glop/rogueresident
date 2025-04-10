// app/store/knowledgeStore.ts
/**
 * Knowledge Constellation System
 * 
 * This store manages the player's evolving understanding of medical physics
 * represented as a personal constellation in the night sky. Stars (concepts)
 * illuminate as mastery increases, forming connections that represent
 * true expertise development.
 * 
 * Design Philosophy:
 * - Knowledge acquisition mirrors authentic expertise development
 * - Visual metaphors reinforce abstract learning
 * - Systems reflect cognitive development patterns
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { medicalPhysicsConcepts } from '@/app/data/concepts/medicalPhysicsConcepts';

// Knowledge domains with visual styling properties
export const KNOWLEDGE_DOMAINS = {
  'radiation-physics': {
    name: 'Radiation Physics',
    color: '#3b82f6', // Blue
    textClass: 'text-clinical-light',
    bgClass: 'bg-clinical'
  },
  'quality-assurance': {
    name: 'Quality Assurance',
    color: '#10b981', // Green
    textClass: 'text-qa-light',
    bgClass: 'bg-qa'
  },
  'clinical-practice': {
    name: 'Clinical Practice',
    color: '#ec4899', // Pink
    textClass: 'text-clinical-light',
    bgClass: 'bg-clinical-dark'
  },
  'radiation-protection': {
    name: 'Radiation Protection',
    color: '#f59e0b', // Amber
    textClass: 'text-warning',
    bgClass: 'bg-warning'
  },
  'technical': {
    name: 'Technical Expertise',
    color: '#6366f1', // Indigo
    textClass: 'text-qa-light',
    bgClass: 'bg-qa'
  },
  'theoretical': {
    name: 'Theoretical Foundations',
    color: '#8b5cf6', // Violet
    textClass: 'text-educational-light',
    bgClass: 'bg-educational'
  },
  'general': {
    name: 'General Knowledge',
    color: '#6b7280', // Gray
    textClass: 'text-text-primary',
    bgClass: 'bg-surface-dark'
  }
};

// Type Definitions
export type KnowledgeDomain = keyof typeof KNOWLEDGE_DOMAINS;
export type MasteryLevel = 'undiscovered' | 'introduced' | 'practicing' | 'mastered';

// Core Interfaces
export interface ConceptNode {
  id: string;
  name: string;
  domain: KnowledgeDomain;
  description: string;
  mastery: number; // 0-100% mastery level
  connections: string[]; // IDs of connected concepts
  discovered: boolean;
  position?: { x: number; y: number }; // For visual layout
  lastPracticed?: number; // Timestamp for knowledge decay
}

export interface ConceptConnection {
  source: string;
  target: string;
  strength: number; // 0-100%
  discovered: boolean;
}

export interface JournalEntry {
  id: string;
  conceptId: string;
  timestamp: number;
  content: string;
  masteryGained: number;
  source: 'challenge' | 'dialogue' | 'item' | 'observation';
}

interface KnowledgeState {
  // Core data structures
  nodes: ConceptNode[];
  connections: ConceptConnection[];
  journalEntries: JournalEntry[];
  
  // Ephemeral tracking
  pendingInsights: Array<{conceptId: string, amount: number}>;
  newlyDiscovered: string[]; // Concept IDs for animation
  
  // Derived metrics
  domainMastery: Record<KnowledgeDomain, number>; // 0-100%
  totalMastery: number; // 0-100% across all domains
  
  // Actions
  addConcept: (concept: Omit<ConceptNode, 'id' | 'discovered' | 'connections' | 'lastPracticed'>) => string;
  discoverConcept: (conceptId: string) => void;
  updateMastery: (conceptId: string, amount: number) => void;
  createConnection: (sourceId: string, targetId: string) => void;
  discoverConnection: (sourceId: string, targetId: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => void;
  applyKnowledgeDecay: () => void;
  transferInsights: () => void;
  resetNewlyDiscovered: () => void;
  unlockKnowledge: (knowledgeId: string) => void; // Added for SimplifiedKapoorMap
  
  // Development helpers
  importKnowledgeData: (data: Partial<KnowledgeState>) => void;
  resetKnowledge: () => void;
}

/**
 * Builds visual constellation connections from node data
 * Only creates connections between discovered nodes
 */
const buildInitialConnections = (nodes: ConceptNode[]): ConceptConnection[] => {
  const connections: ConceptConnection[] = [];
  const processedPairs = new Set<string>();
  
  nodes.forEach(node => {
    if (!node.discovered) return;
    
    node.connections.forEach(targetId => {
      // Prevent duplicate connections
      const pairKey = [node.id, targetId].sort().join('-');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      
      // Only create connection if target node exists and is discovered
      const targetNode = nodes.find(n => n.id === targetId);
      if (targetNode?.discovered) {
        connections.push({
          source: node.id,
          target: targetId,
          strength: (node.mastery + (targetNode?.mastery || 0)) / 2,
          discovered: true
        });
      }
    });
  });
  
  return connections;
};

/**
 * Calculates mastery level for each knowledge domain
 * with safety checks for domain validity
 */
const calculateDomainMastery = (nodes: ConceptNode[]): Record<KnowledgeDomain, number> => {
  // Initialize accumulator for each domain
  const domainTotals: Record<string, {sum: number, count: number}> = {};
  
  // Ensure all domains are initialized
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    domainTotals[domain] = {sum: 0, count: 0};
  });
  
  // Only consider discovered nodes
  nodes.filter(node => node.discovered).forEach(node => {
    // Safely access the domain or fall back to 'general'
    const domain = domainTotals[node.domain] ? node.domain : 'general';
    
    if (domain !== node.domain) {
      console.warn(`Unknown domain "${node.domain}" for node "${node.id}", using "general" instead`);
    }
    
    domainTotals[domain].sum += node.mastery;
    domainTotals[domain].count += 1;
  });
  
  // Calculate average mastery for each domain
  const result = {} as Record<KnowledgeDomain, number>;
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    result[domain] = domainTotals[domain].count > 0 
      ? Math.round(domainTotals[domain].sum / domainTotals[domain].count) 
      : 0;
  });
  
  return result;
};

/**
 * Calculates overall mastery across all domains
 * Weighted by number of concepts in each domain
 */
const calculateTotalMastery = (domainMastery: Record<KnowledgeDomain, number>, nodes: ConceptNode[]): number => {
  // Count discovered nodes per domain for weighting
  const domainCounts: Record<KnowledgeDomain, number> = {} as Record<KnowledgeDomain, number>;
  let totalNodes = 0;
  
  // Initialize all domains with 0
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    domainCounts[domain] = 0;
  });
  
  // Count discovered nodes in each domain
  nodes.filter(node => node.discovered).forEach(node => {
    if (domainCounts[node.domain] !== undefined) {
      domainCounts[node.domain]++;
      totalNodes++;
    }
  });
  
  // If no nodes discovered yet, return 0
  if (totalNodes === 0) return 0;
  
  // Calculate weighted average
  let weightedSum = 0;
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    weightedSum += domainMastery[domain] * (domainCounts[domain] / totalNodes);
  });
  
  return Math.round(weightedSum);
};

/**
 * Determines mastery level category based on numeric value
 */
export const getMasteryLevel = (mastery: number): MasteryLevel => {
  if (mastery < 10) return 'undiscovered';
  if (mastery < 40) return 'introduced';
  if (mastery < 80) return 'practicing';
  return 'mastered';
};

// Create the knowledge store with Zustand
export const useKnowledgeStore = create<KnowledgeState>((set, get) => {
  // Build initial state
  const initialConnections = buildInitialConnections(medicalPhysicsConcepts);
  const initialDomainMastery = calculateDomainMastery(medicalPhysicsConcepts);
  const initialTotalMastery = calculateTotalMastery(initialDomainMastery, medicalPhysicsConcepts);
  
  return {
    // Initial state
    nodes: medicalPhysicsConcepts,
    connections: initialConnections,
    journalEntries: [],
    pendingInsights: [],
    domainMastery: initialDomainMastery,
    totalMastery: initialTotalMastery,
    newlyDiscovered: [],
    
    // Add a new concept to the constellation
    addConcept: (concept) => {
      const id = nanoid();
      
      // Validate domain before adding
      const validDomain = Object.keys(KNOWLEDGE_DOMAINS).includes(concept.domain as string) 
        ? concept.domain 
        : 'general' as KnowledgeDomain;
      
      if (validDomain !== concept.domain) {
        console.warn(`Invalid domain "${concept.domain}" changed to "general" for concept: ${concept.name}`);
      }
      
      set(state => {
        const newNode: ConceptNode = {
          id,
          ...concept,
          domain: validDomain,
          connections: [],
          discovered: false,
          lastPracticed: Date.now()
        };
        
        const updatedNodes = [...state.nodes, newNode];
        
        return { nodes: updatedNodes };
      });
      
      return id;
    },
    
    // Discover a previously unknown concept
    discoverConcept: (conceptId) => {
      set(state => {
        // Skip if already discovered
        if (state.nodes.find(n => n.id === conceptId)?.discovered) {
          return state;
        }
        
        // Mark node as discovered
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { ...node, discovered: true, lastPracticed: Date.now() } 
            : node
        );
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        return {
          nodes: updatedNodes,
          domainMastery,
          totalMastery,
          newlyDiscovered: [...state.newlyDiscovered, conceptId]
        };
      });
    },
    
    // Update mastery level for a concept
    updateMastery: (conceptId, amount) => {
      set(state => {
        // Find the node
        const node = state.nodes.find(n => n.id === conceptId);
        if (!node) {
          console.warn(`Concept not found: ${conceptId}`);
          return state;
        }
        
        // Calculate new mastery (capped at 0-100%)
        const newMastery = Math.min(100, Math.max(0, node.mastery + amount));
        
        // Auto-discover node if gaining mastery for the first time
        const shouldDiscover = !node.discovered && amount > 0;
        
        // Update node mastery and timestamp
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { 
                ...node, 
                mastery: newMastery,
                discovered: node.discovered || shouldDiscover,
                lastPracticed: Date.now()
              } 
            : node
        );
        
        // Update connection strengths for all affected connections
        const updatedConnections = state.connections.map(conn => {
          if (conn.source === conceptId || conn.target === conceptId) {
            // Get the other node in the connection
            const otherNodeId = conn.source === conceptId ? conn.target : conn.source;
            const otherNode = updatedNodes.find(n => n.id === otherNodeId);
            
            // Recalculate connection strength based on both nodes' mastery
            return {
              ...conn,
              strength: (newMastery + (otherNode?.mastery || 0)) / 2
            };
          }
          return conn;
        });
        
        // Track pending insights for night phase transfer
        let pendingInsights = [...state.pendingInsights];
        if (amount > 0) {
          pendingInsights.push({
            conceptId,
            amount
          });
        }
        
        // Track newly discovered concepts for animation
        const newlyDiscovered = shouldDiscover
          ? [...state.newlyDiscovered, conceptId]
          : state.newlyDiscovered;
        
        // Recalculate domain mastery metrics
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        console.log(`Updated mastery for ${conceptId}: ${node.mastery} -> ${newMastery}`);
        
        return {
          nodes: updatedNodes,
          connections: updatedConnections,
          pendingInsights,
          domainMastery,
          totalMastery,
          newlyDiscovered
        };
      });
    },
    
    // Create a new connection between concepts
    createConnection: (sourceId, targetId) => {
      set(state => {
        // Validate nodes exist and are discovered
        const sourceNode = state.nodes.find(n => n.id === sourceId);
        const targetNode = state.nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode || !sourceNode.discovered || !targetNode.discovered) {
          console.warn('Cannot create connection: nodes not found or not discovered');
          return state;
        }
        
        // Check if connection already exists
        const existingConnection = state.connections.find(
          conn => (conn.source === sourceId && conn.target === targetId) ||
                 (conn.source === targetId && conn.target === sourceId)
        );
        
        if (existingConnection) {
          console.warn('Connection already exists');
          return state;
        }
        
        // Create new connection with strength based on node mastery
        const newConnection: ConceptConnection = {
          source: sourceId,
          target: targetId,
          strength: (sourceNode.mastery + targetNode.mastery) / 2,
          discovered: true
        };
        
        // Update nodes to include connection references
        const updatedNodes = state.nodes.map(node => {
          if (node.id === sourceId && !node.connections.includes(targetId)) {
            return {
              ...node,
              connections: [...node.connections, targetId],
              lastPracticed: Date.now() // Forming connections refreshes concepts
            };
          }
          if (node.id === targetId && !node.connections.includes(sourceId)) {
            return {
              ...node,
              connections: [...node.connections, sourceId],
              lastPracticed: Date.now()
            };
          }
          return node;
        });
        
        return {
          nodes: updatedNodes,
          connections: [...state.connections, newConnection]
        };
      });
    },
    
    // Discover an existing but previously hidden connection
    discoverConnection: (sourceId, targetId) => {
      set(state => {
        // Find the connection
        const connection = state.connections.find(
          conn => (conn.source === sourceId && conn.target === targetId) ||
                 (conn.source === targetId && conn.target === sourceId)
        );
        
        if (!connection) {
          console.warn('Connection not found');
          return state;
        }
        
        // Update connection visibility
        const updatedConnections = state.connections.map(conn => 
          (conn.source === sourceId && conn.target === targetId) ||
          (conn.source === targetId && conn.target === sourceId)
            ? { ...conn, discovered: true }
            : conn
        );
        
        return {
          connections: updatedConnections
        };
      });
    },
    
    // Add a journal entry and apply its mastery gain
    addJournalEntry: (entry) => {
      const id = nanoid();
      
      set(state => ({
        journalEntries: [
          ...state.journalEntries,
          {
            id,
            ...entry,
            timestamp: Date.now()
          }
        ]
      }));
      
      // Also update concept mastery
      get().updateMastery(entry.conceptId, entry.masteryGained);
    },
    
    // Apply knowledge decay based on time since last practice
    // This models how human memory fades without reinforcement
    applyKnowledgeDecay: () => {
      const now = Date.now();
      const decayThresholdDays = 3; // Days before decay begins
      const decayRatePerDay = 0.7; // % mastery lost per day after threshold
      
      set(state => {
        let needsMetricsUpdate = false;
        
        // Apply decay to each node
        const updatedNodes = state.nodes.map(node => {
          if (!node.discovered || !node.lastPracticed) return node;
          
          // Calculate days since last practice
          const daysSinceLastPractice = (now - node.lastPracticed) / (1000 * 60 * 60 * 24);
          
          // Only decay after threshold
          if (daysSinceLastPractice <= decayThresholdDays) return node;
          
          // Calculate decay amount
          const decayDays = daysSinceLastPractice - decayThresholdDays;
          const decayAmount = decayDays * decayRatePerDay;
          
          // Apply decay with diminishing returns (harder to forget mastered concepts)
          const masteryRetention = 0.75 + (0.25 * (node.mastery / 100)); // 75-100% retention rate
          const adjustedDecay = decayAmount * (1 - masteryRetention);
          
          // Don't decay below 10% (core understanding remains)
          const newMastery = Math.max(10, node.mastery - adjustedDecay);
          
          // Only update if there's a meaningful change
          if (Math.abs(newMastery - node.mastery) >= 0.5) {
            needsMetricsUpdate = true;
            return { ...node, mastery: newMastery };
          }
          
          return node;
        });
        
        // Recalculate metrics only if needed
        if (!needsMetricsUpdate) return { nodes: updatedNodes };
        
        // Update connection strengths based on new mastery levels
        const updatedConnections = state.connections.map(conn => {
          const sourceNode = updatedNodes.find(n => n.id === conn.source);
          const targetNode = updatedNodes.find(n => n.id === conn.target);
          
          if (!sourceNode || !targetNode) return conn;
          
          return {
            ...conn,
            strength: (sourceNode.mastery + targetNode.mastery) / 2
          };
        });
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        return {
          nodes: updatedNodes,
          connections: updatedConnections,
          domainMastery,
          totalMastery
        };
      });
    },
    
    // Transfer pending insights to the constellation (night phase)
    transferInsights: () => {
      set({ pendingInsights: [] });
    },
    
    // Reset newly discovered tracking after animations complete
    resetNewlyDiscovered: () => {
      // Only update state if there are actually newly discovered items
      set(state => {
        // If array is already empty, don't trigger a state update
        if (state.newlyDiscovered.length === 0) {
          return state; // Return the current state unchanged
        }
        return { newlyDiscovered: [] };
      });
    },
    
    // Implementation for SimplifiedKapoorMap compatibility
    unlockKnowledge: (knowledgeId: string) => {
      // Extract the concept ID from the knowledge ID if needed
      const conceptId = knowledgeId.startsWith('knowledge-') 
        ? knowledgeId.replace('knowledge-', '') 
        : knowledgeId;
        
      console.log(`Unlocking knowledge: ${knowledgeId} (Concept ID: ${conceptId})`);
      
      // First try to discover the concept
      get().discoverConcept(conceptId);
      
      // If the concept doesn't exist yet, it may need to be created
      if (!get().nodes.find(n => n.id === conceptId)) {
        console.warn(`Concept ${conceptId} not found. Creating placeholder.`);
        // Create a placeholder concept
        const newConceptId = get().addConcept({
          name: `Unknown (${conceptId})`,
          domain: 'general',
          description: 'A newly discovered concept.',
          mastery: 25
        });
        
        // Then discover it
        get().discoverConcept(newConceptId);
        
        // Dispatch knowledge event
        try {
          safeDispatch(GameEventType.KNOWLEDGE_GAINED, {
            conceptId: newConceptId,
            amount: 25,
            source: 'map_discovery'
          }, 'knowledgeStore');
        } catch (e) {
          console.error('Error dispatching knowledge gained event:', e);
        }
      } else {
        // Update existing concept's mastery
        get().updateMastery(conceptId, 10);
        
        // Dispatch knowledge event
        try {
          safeDispatch(GameEventType.KNOWLEDGE_GAINED, {
            conceptId,
            amount: 10,
            source: 'map_discovery'
          }, 'knowledgeStore');
        } catch (e) {
          console.error('Error dispatching knowledge gained event:', e);
        }
      }
    },
    
    // Import knowledge data (for development/testing)
    importKnowledgeData: (data) => {
      if (!data) return;
      
      set(state => {
        // Import provided data with fallbacks to current state
        const nodes = data.nodes || state.nodes;
        const connections = data.connections || buildInitialConnections(nodes);
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(nodes);
        const totalMastery = calculateTotalMastery(domainMastery, nodes);
        
        return {
          nodes,
          connections,
          journalEntries: data.journalEntries || state.journalEntries,
          pendingInsights: data.pendingInsights || state.pendingInsights,
          domainMastery,
          totalMastery,
          newlyDiscovered: []
        };
      });
    },
    
    // Reset knowledge to initial state
    resetKnowledge: () => {
      const domainMastery = calculateDomainMastery(medicalPhysicsConcepts);
      const totalMastery = calculateTotalMastery(domainMastery, medicalPhysicsConcepts);
      
      set({
        nodes: medicalPhysicsConcepts,
        connections: buildInitialConnections(medicalPhysicsConcepts),
        journalEntries: [],
        pendingInsights: [],
        domainMastery,
        totalMastery,
        newlyDiscovered: []
      });
    }
  };
});