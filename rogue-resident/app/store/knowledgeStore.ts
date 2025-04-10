// app/store/knowledgeStore.ts
/**
 * Knowledge Constellation System - Chamber Pattern Compliant
 * 
 * This store manages the player's evolving understanding of medical physics
 * represented as a personal constellation in the night sky. Stars (concepts)
 * illuminate as mastery increases, forming connections that represent
 * true expertise development.
 * 
 * Chamber Pattern enhancements:
 * - Primitive selectors for performance-optimized component binding
 * - Memoized calculations for domain mastery metrics
 * - Stable function references for callback consistency 
 * - Atomic state updates for visualization consistency
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer'; // Added immer for simpler updates
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

export interface KnowledgeState {
  // Core data structures
  nodes: ConceptNode[];
  connections: ConceptConnection[];
  journalEntries: JournalEntry[];
  
  // Ephemeral tracking
  pendingInsights: Array<{conceptId: string, amount: number}>;
  newlyDiscovered: string[]; // Concept IDs for animation
  activeInsight: string | null; // Currently focused insight
  
  // Derived metrics
  domainMastery: Record<KnowledgeDomain, number>; // 0-100%
  totalMastery: number; // 0-100% across all domains
  constellationVisible: boolean; // UI state tracking
  
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
  setActiveInsight: (conceptId: string | null) => void;
  setConstellationVisibility: (isVisible: boolean) => void;
  
  // Legacy compatibility
  unlockKnowledge: (knowledgeId: string) => void;
  addInsight: (insightId: string) => void; // Legacy method
  unlockTopic: (topicId: string) => void; // Legacy method
  
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

// Initial state preparation
const initialConnections = buildInitialConnections(medicalPhysicsConcepts);
const initialDomainMastery = calculateDomainMastery(medicalPhysicsConcepts);
const initialTotalMastery = calculateTotalMastery(initialDomainMastery, medicalPhysicsConcepts);

// Create the knowledge store with Zustand and Immer
export const useKnowledgeStore = create<KnowledgeState>()(
  immer((set, get) => ({
    // Initial state
    nodes: medicalPhysicsConcepts,
    connections: initialConnections,
    journalEntries: [],
    pendingInsights: [],
    domainMastery: initialDomainMastery,
    totalMastery: initialTotalMastery,
    newlyDiscovered: [],
    activeInsight: null,
    constellationVisible: false,
    
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
        
        state.nodes.push(newNode);
      });
      
      return id;
    },
    
    // Discover a previously unknown concept
    discoverConcept: (conceptId) => {
      const nodeAlreadyDiscovered = get().nodes.find(n => n.id === conceptId)?.discovered;
      
      // Skip if already discovered (avoid unnecessary state updates)
      if (nodeAlreadyDiscovered) return;
      
      set(state => {
        // Find the node index
        const nodeIndex = state.nodes.findIndex(n => n.id === conceptId);
        if (nodeIndex === -1) {
          console.warn(`Cannot discover unknown concept: ${conceptId}`);
          return;
        }
        
        // Mark node as discovered
        state.nodes[nodeIndex].discovered = true;
        state.nodes[nodeIndex].lastPracticed = Date.now();
        
        // Add to newly discovered list
        if (!state.newlyDiscovered.includes(conceptId)) {
          state.newlyDiscovered.push(conceptId);
        }
        
        // Recalculate domain mastery
        state.domainMastery = calculateDomainMastery(state.nodes);
        state.totalMastery = calculateTotalMastery(state.domainMastery, state.nodes);
      });
      
      // Emit knowledge discovery event
      try {
        safeDispatch(
          GameEventType.KNOWLEDGE_DISCOVERED,
          { conceptId },
          'knowledgeStore.discoverConcept'
        );
      } catch (e) {
        console.error('Error dispatching knowledge discovery event:', e);
      }
    },
    
    // Update mastery level for a concept
    updateMastery: (conceptId, amount) => {
      if (amount === 0) return; // Skip no-op updates
      
      set(state => {
        // Find the node
        const nodeIndex = state.nodes.findIndex(n => n.id === conceptId);
        if (nodeIndex === -1) {
          console.warn(`Concept not found: ${conceptId}`);
          return;
        }
        
        const node = state.nodes[nodeIndex];
        
        // Calculate new mastery (capped at 0-100%)
        const newMastery = Math.min(100, Math.max(0, node.mastery + amount));
        if (newMastery === node.mastery) return; // Skip if no change
        
        // Auto-discover node if gaining mastery for the first time
        const shouldDiscover = !node.discovered && amount > 0;
        
        // Update node mastery and timestamp
        state.nodes[nodeIndex].mastery = newMastery;
        state.nodes[nodeIndex].lastPracticed = Date.now();
        
        // Auto-discover if needed
        if (shouldDiscover) {
          state.nodes[nodeIndex].discovered = true;
          
          // Track newly discovered concepts for animation
          if (!state.newlyDiscovered.includes(conceptId)) {
            state.newlyDiscovered.push(conceptId);
          }
        }
        
        // Update connection strengths for all affected connections
        state.connections = state.connections.map(conn => {
          if (conn.source === conceptId || conn.target === conceptId) {
            // Get the other node in the connection
            const otherNodeId = conn.source === conceptId ? conn.target : conn.source;
            const otherNode = state.nodes.find(n => n.id === otherNodeId);
            
            // Recalculate connection strength based on both nodes' mastery
            return {
              ...conn,
              strength: (newMastery + (otherNode?.mastery || 0)) / 2
            };
          }
          return conn;
        });
        
        // Track pending insights for night phase transfer
        if (amount > 0) {
          state.pendingInsights.push({
            conceptId,
            amount
          });
        }
        
        // Recalculate domain mastery metrics
        state.domainMastery = calculateDomainMastery(state.nodes);
        state.totalMastery = calculateTotalMastery(state.domainMastery, state.nodes);
        
        console.log(`Updated mastery for ${conceptId}: ${node.mastery} -> ${newMastery}`);
      });
      
      // Emit mastery increased event
      try {
        safeDispatch(
          GameEventType.MASTERY_INCREASED,
          { 
            conceptId, 
            amount,
            domain: get().nodes.find(n => n.id === conceptId)?.domain || 'general'
          },
          'knowledgeStore.updateMastery'
        );
      } catch (e) {
        console.error('Error dispatching mastery event:', e);
      }
    },
    
    // Create a new connection between concepts
    createConnection: (sourceId, targetId) => {
      // Validate input
      if (sourceId === targetId) {
        console.warn('Cannot connect a concept to itself');
        return;
      }
      
      // Check for existing connection
      const connectionExists = get().connections.some(
        conn => (conn.source === sourceId && conn.target === targetId) ||
               (conn.source === targetId && conn.target === sourceId)
      );
      
      // Skip if connection already exists
      if (connectionExists) {
        console.warn('Connection already exists');
        return;
      }
      
      set(state => {
        // Validate nodes exist and are discovered
        const sourceNode = state.nodes.find(n => n.id === sourceId);
        const targetNode = state.nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode) {
          console.warn('Cannot create connection: nodes not found');
          return;
        }
        
        if (!sourceNode.discovered || !targetNode.discovered) {
          console.warn('Cannot create connection: nodes not discovered');
          return;
        }
        
        // Create new connection with strength based on node mastery
        const newConnection: ConceptConnection = {
          source: sourceId,
          target: targetId,
          strength: (sourceNode.mastery + targetNode.mastery) / 2,
          discovered: true
        };
        
        // Add connection to array
        state.connections.push(newConnection);
        
        // Update node connection references
        const sourceNodeIndex = state.nodes.findIndex(n => n.id === sourceId);
        if (sourceNodeIndex !== -1 && !state.nodes[sourceNodeIndex].connections.includes(targetId)) {
          state.nodes[sourceNodeIndex].connections.push(targetId);
          state.nodes[sourceNodeIndex].lastPracticed = Date.now();
        }
        
        const targetNodeIndex = state.nodes.findIndex(n => n.id === targetId);
        if (targetNodeIndex !== -1 && !state.nodes[targetNodeIndex].connections.includes(sourceId)) {
          state.nodes[targetNodeIndex].connections.push(sourceId);
          state.nodes[targetNodeIndex].lastPracticed = Date.now();
        }
      });
      
      // Emit connection created event
      try {
        safeDispatch(
          GameEventType.CONNECTION_CREATED,
          { 
            sourceId, 
            targetId,
            sourceDomain: get().nodes.find(n => n.id === sourceId)?.domain,
            targetDomain: get().nodes.find(n => n.id === targetId)?.domain
          },
          'knowledgeStore.createConnection'
        );
      } catch (e) {
        console.error('Error dispatching connection event:', e);
      }
    },
    
    // Discover an existing but previously hidden connection
    discoverConnection: (sourceId, targetId) => {
      set(state => {
        // Find the connection
        const connectionIndex = state.connections.findIndex(
          conn => (conn.source === sourceId && conn.target === targetId) ||
                 (conn.source === targetId && conn.target === sourceId)
        );
        
        if (connectionIndex === -1) {
          console.warn('Connection not found');
          return;
        }
        
        // Update connection visibility
        if (!state.connections[connectionIndex].discovered) {
          state.connections[connectionIndex].discovered = true;
          
          // Emit discovery event
          try {
            safeDispatch(
              GameEventType.CONNECTION_DISCOVERED,
              { sourceId, targetId },
              'knowledgeStore.discoverConnection'
            );
          } catch (e) {
            console.error('Error dispatching connection discovery event:', e);
          }
        }
      });
    },
    
    // Add a journal entry and apply its mastery gain
    addJournalEntry: (entry) => {
      if (!entry.conceptId || !entry.content) {
        console.warn('Invalid journal entry', entry);
        return;
      }
      
      const id = nanoid();
      
      set(state => {
        state.journalEntries.push({
          id,
          ...entry,
          timestamp: Date.now()
        });
      });
      
      // Also update concept mastery if specified
      if (entry.masteryGained > 0) {
        get().updateMastery(entry.conceptId, entry.masteryGained);
      }
      
      // Emit journal entry event
      try {
        safeDispatch(
          GameEventType.JOURNAL_ENTRY_ADDED,
          { 
            conceptId: entry.conceptId,
            source: entry.source,
            masteryGained: entry.masteryGained
          },
          'knowledgeStore.addJournalEntry'
        );
      } catch (e) {
        console.error('Error dispatching journal entry event:', e);
      }
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
        state.nodes.forEach((node, index) => {
          if (!node.discovered || !node.lastPracticed) return;
          
          // Calculate days since last practice
          const daysSinceLastPractice = (now - node.lastPracticed) / (1000 * 60 * 60 * 24);
          
          // Only decay after threshold
          if (daysSinceLastPractice <= decayThresholdDays) return;
          
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
            state.nodes[index].mastery = newMastery;
          }
        });
        
        // Exit early if no changes
        if (!needsMetricsUpdate) return;
        
        // Update connection strengths based on new mastery levels
        state.connections.forEach((conn, index) => {
          const sourceNode = state.nodes.find(n => n.id === conn.source);
          const targetNode = state.nodes.find(n => n.id === conn.target);
          
          if (!sourceNode || !targetNode) return;
          
          // Recalculate connection strength
          state.connections[index].strength = (sourceNode.mastery + targetNode.mastery) / 2;
        });
        
        // Recalculate domain mastery
        state.domainMastery = calculateDomainMastery(state.nodes);
        state.totalMastery = calculateTotalMastery(state.domainMastery, state.nodes);
      });
      
      // Emit decay event
      try {
        safeDispatch(
          GameEventType.KNOWLEDGE_DECAY_APPLIED,
          {},
          'knowledgeStore.applyKnowledgeDecay'
        );
      } catch (e) {
        console.error('Error dispatching decay event:', e);
      }
    },
    
    // Transfer pending insights to the constellation (night phase)
    transferInsights: () => {
      // Skip if no insights to transfer
      if (get().pendingInsights.length === 0) return;
      
      set(state => {
        // Clear pending insights
        state.pendingInsights = [];
      });
      
      // Emit transfer event
      try {
        safeDispatch(
          GameEventType.KNOWLEDGE_TRANSFERRED,
          {
            insightCount: get().pendingInsights.length
          },
          'knowledgeStore.transferInsights'
        );
      } catch (e) {
        console.error('Error dispatching transfer event:', e);
      }
    },
    
    // Reset newly discovered tracking after animations complete
    resetNewlyDiscovered: () => {
      // Only update state if there are actually newly discovered items
      if (get().newlyDiscovered.length === 0) return;
      
      set(state => {
        state.newlyDiscovered = [];
      });
    },
    
    // Set the actively selected insight
    setActiveInsight: (conceptId: string | null) => {
      set(state => {
        state.activeInsight = conceptId;
      });
      
      // Emit selection event if concept selected
      if (conceptId) {
        try {
          safeDispatch(
            GameEventType.CONCEPT_SELECTED,
            { conceptId },
            'knowledgeStore.setActiveInsight'
          );
        } catch (e) {
          console.error('Error dispatching concept selection event:', e);
        }
      }
    },
    
    // Set constellation visualization visibility
    setConstellationVisibility: (isVisible: boolean) => {
      set(state => {
        state.constellationVisible = isVisible;
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
    
    // Legacy method for backward compatibility
    addInsight: (insightId: string) => {
      // Simply forward to unlockKnowledge
      get().unlockKnowledge(insightId);
    },
    
    // Legacy method for unlocking topic domains
    unlockTopic: (topicId: string) => {
      // Check if topicId is a valid domain
      const isValidDomain = Object.keys(KNOWLEDGE_DOMAINS).includes(topicId);
      if (!isValidDomain) {
        console.warn(`Invalid domain: ${topicId}`);
        return;
      }
      
      // Simply emit an event for now - no state change needed
      try {
        safeDispatch(
          GameEventType.DOMAIN_UNLOCKED,
          { domainId: topicId },
          'knowledgeStore.unlockTopic'
        );
      } catch (e) {
        console.error('Error dispatching domain unlock event:', e);
      }
    },
    
    // Import knowledge data (for development/testing)
    importKnowledgeData: (data) => {
      if (!data) return;
      
      set(state => {
        // Import provided data with fallbacks to current state
        if (data.nodes) state.nodes = data.nodes;
        if (data.connections) {
          state.connections = data.connections;
        } else {
          state.connections = buildInitialConnections(state.nodes);
        }
        if (data.journalEntries) state.journalEntries = data.journalEntries;
        if (data.pendingInsights) state.pendingInsights = data.pendingInsights;
        
        // Clear newly discovered tracking
        state.newlyDiscovered = [];
        
        // Recalculate domain mastery
        state.domainMastery = calculateDomainMastery(state.nodes);
        state.totalMastery = calculateTotalMastery(state.domainMastery, state.nodes);
      });
    },
    
    // Reset knowledge to initial state
    resetKnowledge: () => {
      set(state => {
        state.nodes = medicalPhysicsConcepts;
        state.connections = buildInitialConnections(medicalPhysicsConcepts);
        state.journalEntries = [];
        state.pendingInsights = [];
        state.newlyDiscovered = [];
        state.activeInsight = null;
        state.constellationVisible = false;
        
        // Recalculate domain mastery
        state.domainMastery = calculateDomainMastery(state.nodes);
        state.totalMastery = calculateTotalMastery(state.domainMastery, state.nodes);
      });
    }
  }))
);

// ======== SELECTORS ========
// Chamber Pattern compliant primitive value selectors

/**
 * Selectors for primitive values and derived state
 * These provide performance optimized access to store values
 */
export const selectors = {
  // Simple primitive values
  getTotalMastery: (state: KnowledgeState) => state.totalMastery,
  getActiveInsightId: (state: KnowledgeState) => state.activeInsight,
  getNewlyDiscoveredCount: (state: KnowledgeState) => state.newlyDiscovered.length,
  getPendingInsightCount: (state: KnowledgeState) => state.pendingInsights.length,
  getIsConstellationVisible: (state: KnowledgeState) => state.constellationVisible,
  getJournalEntryCount: (state: KnowledgeState) => state.journalEntries.length,
  
  // Domain-specific mastery
  getDomainMastery: (domain: KnowledgeDomain) => (state: KnowledgeState) => 
    state.domainMastery[domain] || 0,
  
  // Node-specific mastery
  getConceptMastery: (conceptId: string) => (state: KnowledgeState) => 
    state.nodes.find(n => n.id === conceptId)?.mastery || 0,
  
  isConceptDiscovered: (conceptId: string) => (state: KnowledgeState) => 
    state.nodes.find(n => n.id === conceptId)?.discovered || false,
  
  isNewlyDiscovered: (conceptId: string) => (state: KnowledgeState) => 
    state.newlyDiscovered.includes(conceptId),
  
  // Array filters with stable references
  getDiscoveredNodes: (state: KnowledgeState) => 
    state.nodes.filter(node => node.discovered),
  
  getUndiscoveredNodes: (state: KnowledgeState) => 
    state.nodes.filter(node => !node.discovered),
  
  getDiscoveredConnections: (state: KnowledgeState) => 
    state.connections.filter(conn => conn.discovered),
  
  getNodesByDomain: (domain: KnowledgeDomain) => (state: KnowledgeState) => 
    state.nodes.filter(node => node.domain === domain),
  
  getDiscoveredNodesByDomain: (domain: KnowledgeDomain) => (state: KnowledgeState) => 
    state.nodes.filter(node => node.domain === domain && node.discovered),
  
  getActiveNode: (state: KnowledgeState) => 
    state.activeInsight ? state.nodes.find(n => n.id === state.activeInsight) : null,
  
  getNewlyDiscoveredNodes: (state: KnowledgeState) => 
    state.nodes.filter(node => state.newlyDiscovered.includes(node.id)),
  
  // Connection lookups
  getConnectionsForNode: (nodeId: string) => (state: KnowledgeState) => 
    state.connections.filter(conn => conn.source === nodeId || conn.target === nodeId),
  
  getDiscoveredConnectionsForNode: (nodeId: string) => (state: KnowledgeState) => 
    state.connections.filter(conn => 
      (conn.source === nodeId || conn.target === nodeId) && conn.discovered),
  
  areNodesConnected: (nodeId1: string, nodeId2: string) => (state: KnowledgeState) => 
    state.connections.some(conn => 
      (conn.source === nodeId1 && conn.target === nodeId2) || 
      (conn.source === nodeId2 && conn.target === nodeId1)),
  
  // Journal queries
  getJournalEntriesForConcept: (conceptId: string) => (state: KnowledgeState) => 
    state.journalEntries.filter(entry => entry.conceptId === conceptId),
  
  getRecentJournalEntries: (count: number = 5) => (state: KnowledgeState) => 
    [...state.journalEntries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count),
  
  // Computed values
  getDiscoveredNodesCount: (state: KnowledgeState) => 
    state.nodes.filter(node => node.discovered).length,
  
  getDiscoveredNodePercentage: (state: KnowledgeState) => 
    (state.nodes.filter(node => node.discovered).length / state.nodes.length) * 100,
  
  getDomainCompletionPercentages: (state: KnowledgeState) => {
    const domainCounts: Record<KnowledgeDomain, {discovered: number, total: number}> = 
      Object.keys(KNOWLEDGE_DOMAINS).reduce((acc, domain) => {
        acc[domain as KnowledgeDomain] = {discovered: 0, total: 0};
        return acc;
      }, {} as Record<KnowledgeDomain, {discovered: number, total: number}>);
    
    // Count nodes per domain
    state.nodes.forEach(node => {
      const domain = node.domain;
      if (domainCounts[domain]) {
        domainCounts[domain].total++;
        if (node.discovered) {
          domainCounts[domain].discovered++;
        }
      }
    });
    
    // Calculate percentages
    const percentages: Record<KnowledgeDomain, number> = 
      Object.keys(domainCounts).reduce((acc, domain) => {
        const counts = domainCounts[domain as KnowledgeDomain];
        acc[domain as KnowledgeDomain] = counts.total > 0
          ? Math.round((counts.discovered / counts.total) * 100)
          : 0;
        return acc;
      }, {} as Record<KnowledgeDomain, number>);
    
    return percentages;
  },
  
  // Node connection suggestions
  getPotentialConnections: (nodeId: string) => (state: KnowledgeState) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node || !node.discovered) return [];
    
    return state.nodes
      .filter(n => 
        // Must be discovered
        n.discovered && 
        // Not the same node
        n.id !== nodeId &&
        // Not already connected
        !state.connections.some(conn => 
          (conn.source === nodeId && conn.target === n.id) ||
          (conn.source === n.id && conn.target === nodeId)
        )
      )
      // Sort by relationship strength (same domain first, then by mastery)
      .sort((a, b) => {
        // Same domain bias
        if (a.domain === node.domain && b.domain !== node.domain) return -1;
        if (a.domain !== node.domain && b.domain === node.domain) return 1;
        // Then by mastery
        return b.mastery - a.mastery;
      })
      .slice(0, 5); // Limit to top 5
  }
};

// A wrapper hook to ease migration to the new pattern
export function useKnowledgeData() {
  const {
    totalMastery,
    domainMastery,
    nodes,
    connections,
    newlyDiscovered,
    pendingInsights
  } = useKnowledgeStore(state => ({
    totalMastery: state.totalMastery,
    domainMastery: state.domainMastery,
    nodes: state.nodes,
    connections: state.connections,
    newlyDiscovered: state.newlyDiscovered,
    pendingInsights: state.pendingInsights
  }));
  
  return {
    totalMastery,
    domainMastery,
    discoveredNodes: nodes.filter(n => n.discovered),
    totalNodes: nodes.length,
    discoveredNodeCount: nodes.filter(n => n.discovered).length,
    newlyDiscoveredCount: newlyDiscovered.length,
    hasPendingInsights: pendingInsights.length > 0,
    pendingInsightCount: pendingInsights.length
  };
}

export default useKnowledgeStore;