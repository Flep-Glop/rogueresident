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

// Import domain definitions to ensure consistency across components
import { KNOWLEDGE_DOMAINS } from '../components/knowledge/ConstellationView';

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
  
  // Development helpers
  importKnowledgeData: (data: Partial<KnowledgeState>) => void;
  resetKnowledge: () => void;
}

// Initial constellation data
const initialConcepts: ConceptNode[] = [
  {
    id: 'radiation-basics',
    name: 'Radiation Fundamentals',
    domain: 'theoretical',
    description: 'Core principles of ionizing radiation including types, energy transfer, and interactions with matter.',
    mastery: 75,
    connections: ['dosimetry-principles', 'radiation-safety'],
    discovered: true,
    position: { x: 400, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'dosimetry-principles',
    name: 'Dosimetry Principles',
    domain: 'technical',
    description: 'Methods and instruments for measuring radiation dose and its distribution.',
    mastery: 60,
    connections: ['radiation-basics', 'radiation-detectors'],
    discovered: true,
    position: { x: 250, y: 280 },
    lastPracticed: Date.now()
  },
  {
    id: 'radiation-detectors',
    name: 'Radiation Detectors',
    domain: 'technical',
    description: 'Various technologies used for detection and measurement of radiation.',
    mastery: 50,
    connections: ['dosimetry-principles', 'ionization-chambers'],
    discovered: true,
    position: { x: 320, y: 370 },
    lastPracticed: Date.now()
  },
  {
    id: 'ionization-chambers',
    name: 'Ionization Chambers',
    domain: 'technical',
    description: 'Gas-filled detectors that measure ionizing radiation by collecting ions.',
    mastery: 40,
    connections: ['radiation-detectors', 'quantum-effects'],
    discovered: true,
    position: { x: 470, y: 350 },
    lastPracticed: Date.now()
  },
  {
    id: 'quantum-effects',
    name: 'Quantum Effects',
    domain: 'theoretical',
    description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
    mastery: 30,
    connections: ['ionization-chambers', 'ionix-anomaly'],
    discovered: true,
    position: { x: 550, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'radiation-safety',
    name: 'Radiation Safety',
    domain: 'clinical',
    description: 'Protocols and principles for ensuring safe use of radiation in medical settings.',
    mastery: 65,
    connections: ['radiation-basics', 'alara-principle'],
    discovered: true,
    position: { x: 320, y: 120 },
    lastPracticed: Date.now()
  },
  {
    id: 'alara-principle',
    name: 'ALARA Principle',
    domain: 'clinical',
    description: 'As Low As Reasonably Achievable - framework for minimizing radiation exposure.',
    mastery: 80,
    connections: ['radiation-safety'],
    discovered: true,
    position: { x: 180, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'ionix-anomaly',
    name: 'Ionix Anomaly',
    domain: 'theoretical',
    description: 'Unusual quantum behavior observed in experimental ion chambers.',
    mastery: 15,
    connections: ['quantum-effects'],
    discovered: true,
    position: { x: 620, y: 150 },
    lastPracticed: Date.now()
  },
  // Undiscovered nodes
  {
    id: 'detector-calibration',
    name: 'Detector Calibration',
    domain: 'technical',
    description: 'Procedures to ensure accurate readings from radiation detectors.',
    mastery: 0,
    connections: ['radiation-detectors', 'quality-assurance'],
    discovered: false,
    position: { x: 200, y: 420 },
    lastPracticed: Date.now()
  },
  {
    id: 'quality-assurance',
    name: 'Quality Assurance',
    domain: 'clinical',
    description: 'Procedures to ensure reliability and consistency of medical equipment.',
    mastery: 0,
    connections: ['detector-calibration'],
    discovered: false,
    position: { x: 150, y: 350 },
    lastPracticed: Date.now()
  }
];

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
  const initialConnections = buildInitialConnections(initialConcepts);
  const initialDomainMastery = calculateDomainMastery(initialConcepts);
  const initialTotalMastery = calculateTotalMastery(initialDomainMastery, initialConcepts);
  
  return {
    // Initial state
    nodes: initialConcepts,
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
        if (!node) return state;
        
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
      set({ newlyDiscovered: [] });
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
      const domainMastery = calculateDomainMastery(initialConcepts);
      const totalMastery = calculateTotalMastery(domainMastery, initialConcepts);
      
      set({
        nodes: initialConcepts,
        connections: buildInitialConnections(initialConcepts),
        journalEntries: [],
        pendingInsights: [],
        domainMastery,
        totalMastery,
        newlyDiscovered: []
      });
    }
  };
});

// Add middleware for development debugging
if (process.env.NODE_ENV !== 'production') {
  const originalSet = useKnowledgeStore.setState;
  useKnowledgeStore.setState = (stateOrFn, replace) => {
    console.log('Knowledge store updated:', 
      typeof stateOrFn === 'function' 
        ? 'Function update' 
        : stateOrFn
    );
    return originalSet(stateOrFn as any, replace as any);
  };
}