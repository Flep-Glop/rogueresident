// tests/testKnowledgeSystem.js
const { assert, assertEqual, assertIncludes } = require('./assert');
const { createEventRecorder } = require('./eventRecorder');

/**
 * Tests the knowledge system with concept acquisition, mastery,
 * constellation visualization, and connections
 */
function testKnowledgeSystem() {
  const events = createEventRecorder();
  
  // ---- Test Double: Knowledge Store ----
  const knowledgeStore = {
    concepts: [],
    connections: [],
    domains: [
      { id: 'radiation-physics', name: 'Radiation Physics', color: '#3498db' },
      { id: 'treatment-planning', name: 'Treatment Planning', color: '#2ecc71' },
      { id: 'protection', name: 'Radiation Protection', color: '#e74c3c' }
    ],
    
    // Add new concept
    discoverConcept(conceptId, domainId, initialMastery = 0) {
      if (this.concepts.some(c => c.id === conceptId)) {
        return false; // Already exists
      }
      
      const concept = {
        id: conceptId,
        discovered: true,
        mastery: initialMastery,
        domainId: domainId,
        visible: true
      };
      
      this.concepts.push(concept);
      
      events.record('knowledge-concept-discovered', {
        conceptId,
        domainId,
        initialMastery
      });
      
      return true;
    },
    
    // Update mastery level
    updateMastery(conceptId, amount) {
      const concept = this.concepts.find(c => c.id === conceptId);
      if (!concept) return false;
      
      const oldMastery = concept.mastery;
      concept.mastery += amount;
      
      events.record('knowledge-mastery-updated', {
        conceptId,
        oldMastery,
        newMastery: concept.mastery,
        change: amount
      });
      
      return true;
    },
    
    // Connect two concepts
    createConnection(fromConceptId, toConceptId, strength = 1) {
      // Check if concepts exist
      const fromConcept = this.concepts.find(c => c.id === fromConceptId);
      const toConcept = this.concepts.find(c => c.id === toConceptId);
      
      if (!fromConcept || !toConcept) return false;
      
      // Check if connection already exists
      const existingConnection = this.connections.find(
        c => (c.fromId === fromConceptId && c.toId === toConceptId) || 
             (c.fromId === toConceptId && c.toId === fromConceptId)
      );
      
      if (existingConnection) {
        // Update strength if connection exists
        existingConnection.strength = strength;
        
        events.record('knowledge-connection-updated', {
          fromId: fromConceptId,
          toId: toConceptId,
          strength
        });
      } else {
        // Create new connection
        this.connections.push({
          fromId: fromConceptId,
          toId: toConceptId,
          strength,
          visible: true
        });
        
        events.record('knowledge-connection-created', {
          fromId: fromConceptId,
          toId: toConceptId,
          strength
        });
      }
      
      return true;
    },
    
    // Get all concepts for a domain
    getConceptsByDomain(domainId) {
      return this.concepts.filter(c => c.domainId === domainId);
    },
    
    // Get all connections for a concept
    getConnectionsForConcept(conceptId) {
      return this.connections.filter(
        c => c.fromId === conceptId || c.toId === conceptId
      );
    },
    
    // Check if a pattern is complete
    checkPattern(patternName) {
      // Simple patterns for testing
      if (patternName === 'dosimetry-triangle') {
        // Check if all three concepts exist and are connected
        const requiredConcepts = [
          'absorbed-dose', 
          'dose-measurement', 
          'dose-calculation'
        ];
        
        // Check concepts exist
        const hasAllConcepts = requiredConcepts.every(
          id => this.concepts.some(c => c.id === id)
        );
        
        if (!hasAllConcepts) return false;
        
        // Check all connections exist
        const requiredConnections = [
          ['absorbed-dose', 'dose-measurement'],
          ['dose-measurement', 'dose-calculation'],
          ['dose-calculation', 'absorbed-dose']
        ];
        
        const hasAllConnections = requiredConnections.every(
          ([from, to]) => this.connections.some(
            c => (c.fromId === from && c.toId === to) || 
                 (c.fromId === to && c.toId === from)
          )
        );
        
        return hasAllConnections;
      }
      
      return false;
    },
    
    // Get visualization data for constellation
    getConstellationData() {
      return {
        nodes: this.concepts.filter(c => c.visible).map(c => ({
          id: c.id,
          domainId: c.domainId,
          mastery: c.mastery
        })),
        edges: this.connections.filter(c => c.visible).map(c => ({
          fromId: c.fromId,
          toId: c.toId,
          strength: c.strength
        }))
      };
    }
  };
  
  // ---- Test Double: Constellation UI ----
  const constellationUI = {
    isVisible: false,
    selectedConceptId: null,
    highlightedDomainId: null,
    
    showConstellation() {
      this.isVisible = true;
      events.record('constellation-view-opened', {});
    },
    
    hideConstellation() {
      this.isVisible = false;
      this.selectedConceptId = null;
      events.record('constellation-view-closed', {});
    },
    
    selectConcept(conceptId) {
      this.selectedConceptId = conceptId;
      events.record('constellation-concept-selected', { conceptId });
    },
    
    highlightDomain(domainId) {
      this.highlightedDomainId = domainId;
      events.record('constellation-domain-highlighted', { domainId });
    },
    
    resetHighlights() {
      this.highlightedDomainId = null;
      events.record('constellation-highlights-reset', {});
    }
  };
  
  // ---- TEST 1: Knowledge Acquisition ----
  console.log("Testing knowledge acquisition...");
  
  // Discover concepts across multiple domains
  knowledgeStore.discoverConcept('absorbed-dose', 'radiation-physics', 10);
  knowledgeStore.discoverConcept('linear-accelerator', 'radiation-physics', 5);
  knowledgeStore.discoverConcept('treatment-planning', 'treatment-planning', 8);
  
  // Verify concepts were added
  assertEqual(knowledgeStore.concepts.length, 3, "Should have 3 concepts");
  assert(events.hasEventType('knowledge-concept-discovered'), "Concept discovery event should fire");
  
  // Verify concept properties
  const absorbedDose = knowledgeStore.concepts.find(c => c.id === 'absorbed-dose');
  assertEqual(absorbedDose.mastery, 10, "Concept should have correct mastery");
  assertEqual(absorbedDose.domainId, 'radiation-physics', "Concept should have correct domain");
  
  // Update mastery
  knowledgeStore.updateMastery('absorbed-dose', 15);
  assertEqual(absorbedDose.mastery, 25, "Mastery should increase correctly");
  assert(events.hasEventType('knowledge-mastery-updated'), "Mastery update event should fire");
  
  console.log("✅ Knowledge acquisition tests passed");
  
  // ---- TEST 2: Knowledge Connections ----
  console.log("Testing knowledge connections...");
  
  // Add more concepts for connections
  knowledgeStore.discoverConcept('dose-measurement', 'radiation-physics', 8);
  knowledgeStore.discoverConcept('dose-calculation', 'treatment-planning', 12);
  
  // Create connections
  knowledgeStore.createConnection('absorbed-dose', 'dose-measurement', 2);
  knowledgeStore.createConnection('dose-measurement', 'dose-calculation', 1);
  knowledgeStore.createConnection('dose-calculation', 'absorbed-dose', 3);
  
  // Verify connections
  assertEqual(knowledgeStore.connections.length, 3, "Should have 3 connections");
  assert(events.hasEventType('knowledge-connection-created'), "Connection created event should fire");
  
  // Update connection strength
  const connection = knowledgeStore.connections.find(
    c => c.fromId === 'absorbed-dose' && c.toId === 'dose-measurement'
  );
  knowledgeStore.createConnection('absorbed-dose', 'dose-measurement', 5);
  assertEqual(connection.strength, 5, "Connection strength should update");
  
  // Get connections for a concept
  const doseConnections = knowledgeStore.getConnectionsForConcept('absorbed-dose');
  assertEqual(doseConnections.length, 2, "Absorbed dose should have 2 connections");
  
  console.log("✅ Knowledge connection tests passed");
  
  // ---- TEST 3: Knowledge Domain Organization ----
  console.log("Testing knowledge domain organization...");
  
  // Get concepts by domain
  const physicsConceptsCount = knowledgeStore.getConceptsByDomain('radiation-physics').length;
  assertEqual(physicsConceptsCount, 3, "Radiation physics should have 3 concepts");
  
  const planningConceptsCount = knowledgeStore.getConceptsByDomain('treatment-planning').length;
  assertEqual(planningConceptsCount, 2, "Treatment planning should have 2 concepts");
  
  console.log("✅ Knowledge domain tests passed");
  
  // ---- TEST 4: Constellation Visualization ----
  console.log("Testing constellation visualization...");
  
  // Open constellation view
  constellationUI.showConstellation();
  assert(constellationUI.isVisible, "Constellation should be visible");
  assert(events.hasEventType('constellation-view-opened'), "Constellation open event should fire");
  
  // Get visualization data
  const constellationData = knowledgeStore.getConstellationData();
  assertEqual(constellationData.nodes.length, 5, "Constellation should show 5 nodes");
  assertEqual(constellationData.edges.length, 3, "Constellation should show 3 edges");
  
  // Test concept selection
  constellationUI.selectConcept('absorbed-dose');
  assertEqual(constellationUI.selectedConceptId, 'absorbed-dose', "Should select concept");
  assert(events.hasEventType('constellation-concept-selected'), "Concept selection event should fire");
  
  // Test domain highlighting
  constellationUI.highlightDomain('radiation-physics');
  assertEqual(constellationUI.highlightedDomainId, 'radiation-physics', "Should highlight domain");
  assert(events.hasEventType('constellation-domain-highlighted'), "Domain highlight event should fire");
  
  // Reset highlights and close
  constellationUI.resetHighlights();
  constellationUI.hideConstellation();
  assert(!constellationUI.isVisible, "Constellation should be hidden");
  assert(events.hasEventType('constellation-view-closed'), "Constellation close event should fire");
  
  console.log("✅ Constellation visualization tests passed");
  
  // ---- TEST 5: Knowledge Patterns ----
  console.log("Testing knowledge patterns...");
  
  // Check pattern (all concepts and connections exist)
  const patternComplete = knowledgeStore.checkPattern('dosimetry-triangle');
  assert(patternComplete, "Pattern should be complete");
  
  // Test incomplete pattern
  // Remove one connection
  knowledgeStore.connections.pop();
  const patternIncomplete = knowledgeStore.checkPattern('dosimetry-triangle');
  assert(!patternIncomplete, "Pattern should be incomplete after removing connection");
  
  console.log("✅ Knowledge pattern tests passed");
  
  return true;
}

// Export the test
module.exports = testKnowledgeSystem;

// Run test directly when executed as a standalone file
if (require.main === module) {
  console.log("🧪 Running Knowledge System Test");
  try {
    testKnowledgeSystem();
    console.log("✅ PASSED: Knowledge System Test");
  } catch (error) {
    console.error(`❌ FAILED: Knowledge System Test`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}