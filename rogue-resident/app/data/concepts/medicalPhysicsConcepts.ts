// app/data/concepts/medicalPhysicsConcepts.ts
/**
 * Medical Physics Concepts Data
 * 
 * This file contains definitions for all concept nodes in the knowledge system.
 * Extracted from knowledgeStore for maintainability.
 */

import { ConceptNode, KnowledgeDomain } from '@/app/store/knowledgeStore';

// Medical physics concepts for the game
export const medicalPhysicsConcepts: ConceptNode[] = [
  // Node IDs from SimplifiedKapoorMap for prototype testing
  // These node IDs must match what's used in SimplifiedKapoorMap.tsx
  {
    id: 'node-1',
    name: 'Calibration Basics',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Fundamental principles of calibrating radiation equipment for accuracy and safety.',
    mastery: 0,
    connections: ['node-2', 'output-calibration'],
    discovered: false,
    position: { x: 100, y: 100 },
    lastPracticed: Date.now()
  },
  {
    id: 'node-2',
    name: 'Dosimetry Principles',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'Methods and concepts for accurately measuring radiation dose in various contexts.',
    mastery: 0,
    connections: ['node-1', 'node-3', 'radiation-dosimetry'],
    discovered: false,
    position: { x: 300, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'node-3',
    name: 'Radiation Safety',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'Protocols and principles that ensure radiation is used safely in medical contexts.',
    mastery: 0,
    connections: ['node-2', 'radiation-safety'],
    discovered: false,
    position: { x: 500, y: 100 },
    lastPracticed: Date.now()
  },
  
  // Radiation Physics Domain
  {
    id: 'electron-equilibrium',
    name: 'Electron Equilibrium',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The condition where the number of electrons entering a volume equals the number leaving it.',
    mastery: 0,
    connections: ['output-calibration', 'dosimetry-principles'],
    discovered: false,
    position: { x: 250, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'inverse-square-law',
    name: 'Inverse Square Law',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The principle that the intensity of radiation is inversely proportional to the square of the distance from the source.',
    mastery: 0,
    connections: ['radiation-safety'],
    discovered: false,
    position: { x: 300, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'attenuation',
    name: 'Attenuation',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The reduction in intensity of a radiation beam as it passes through matter.',
    mastery: 0,
    connections: ['half-value-layer', 'shielding'],
    discovered: false,
    position: { x: 350, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'half-value-layer',
    name: 'Half-Value Layer',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The thickness of a specified material that reduces the intensity of radiation to one-half its original value.',
    mastery: 0,
    connections: ['attenuation', 'shielding'],
    discovered: false,
    position: { x: 400, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'linear-energy-transfer',
    name: 'Linear Energy Transfer',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The amount of energy that an ionizing particle transfers to the material traversed per unit distance.',
    mastery: 0,
    connections: ['radiation-dosimetry'],
    discovered: false,
    position: { x: 450, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Quality Assurance Domain
  {
    id: 'output-calibration',
    name: 'Output Calibration',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'The process of measuring and adjusting the radiation output from treatment machines.',
    mastery: 0,
    connections: ['electron-equilibrium', 'tolerance-limits', 'dosimetry-principles'],
    discovered: false,
    position: { x: 200, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'tolerance-limits',
    name: 'Tolerance Limits',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Acceptable levels of variation in radiation therapy parameters.',
    mastery: 0,
    connections: ['output-calibration', 'linac-qa'],
    discovered: false,
    position: { x: 150, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'dosimetry-principles',
    name: 'Dosimetry Principles',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Fundamental concepts and techniques for measuring radiation dose.',
    mastery: 0,
    connections: ['electron-equilibrium', 'output-calibration', 'radiation-dosimetry'],
    discovered: false,
    position: { x: 250, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'linac-qa',
    name: 'LINAC Quality Assurance',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Procedures for verifying the performance of linear accelerators.',
    mastery: 0,
    connections: ['tolerance-limits', 'output-calibration'],
    discovered: false,
    position: { x: 100, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'gamma-analysis',
    name: 'Gamma Analysis',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'A method for comparing measured dose distributions to calculated ones, often used in IMRT QA.',
    mastery: 0,
    connections: ['imrt'],
    discovered: false,
    position: { x: 150, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Clinical Practice Domain
  {
    id: 'treatment-planning',
    name: 'Treatment Planning',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'The process of determining the appropriate radiation dose distribution for tumor treatment.',
    mastery: 0,
    connections: ['dose-prescription', 'target-volumes', 'organs-at-risk'],
    discovered: false,
    position: { x: 500, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'dose-prescription',
    name: 'Dose Prescription',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'The radiation oncologist\'s specification of the radiation dose to be delivered.',
    mastery: 0,
    connections: ['treatment-planning', 'fractionation'],
    discovered: false,
    position: { x: 550, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'fractionation',
    name: 'Fractionation',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'The practice of dividing the total radiation dose into multiple smaller doses over time.',
    mastery: 0,
    connections: ['dose-prescription'],
    discovered: false,
    position: { x: 600, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'target-volumes',
    name: 'Target Volumes',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'Defined volumes for radiation planning including GTV, CTV, and PTV.',
    mastery: 0,
    connections: ['treatment-planning', 'organs-at-risk'],
    discovered: false,
    position: { x: 550, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'organs-at-risk',
    name: 'Organs at Risk',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'Normal tissues whose radiation sensitivity may influence treatment planning.',
    mastery: 0,
    connections: ['treatment-planning', 'target-volumes'],
    discovered: false,
    position: { x: 600, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Radiation Protection Domain
  {
    id: 'radiation-safety',
    name: 'Radiation Safety',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'Principles and practices for minimizing radiation exposure to patients, staff, and the public.',
    mastery: 0,
    connections: ['inverse-square-law', 'alara-principle'],
    discovered: false,
    position: { x: 400, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'alara-principle',
    name: 'ALARA Principle',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'The principle that radiation exposure should be kept "As Low As Reasonably Achievable".',
    mastery: 0,
    connections: ['radiation-safety', 'dose-limits', 'personal-dosimetry'],
    discovered: false,
    position: { x: 450, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'dose-limits',
    name: 'Dose Limits',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'Regulatory restrictions on radiation dose for workers and the public.',
    mastery: 0,
    connections: ['alara-principle'],
    discovered: false,
    position: { x: 500, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'shielding',
    name: 'Shielding',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'Materials used to reduce radiation exposure.',
    mastery: 0,
    connections: ['attenuation', 'half-value-layer', 'alara-principle'],
    discovered: false,
    position: { x: 450, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'personal-dosimetry',
    name: 'Personal Dosimetry',
    domain: 'radiation-protection' as KnowledgeDomain,
    description: 'Monitoring of radiation dose received by individuals.',
    mastery: 0,
    connections: ['alara-principle', 'radiation-survey'],
    discovered: false,
    position: { x: 500, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Kapoor calibration node specific concepts (initially discovered)
  {
    id: 'radiation-dosimetry',
    name: 'Radiation Dosimetry',
    domain: 'radiation-physics' as KnowledgeDomain,
    description: 'The measurement of absorbed dose delivered by ionizing radiation.',
    mastery: 25,
    connections: ['dosimetry-principles', 'linear-energy-transfer'],
    discovered: true,
    position: { x: 300, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'ptp-correction',
    name: 'Temperature and Pressure Correction',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Correction factors applied to ionization chamber measurements to account for atmospheric conditions.',
    mastery: 0,
    connections: ['output-calibration', 'calibration-factors'],
    discovered: false,
    position: { x: 200, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'calibration-factors',
    name: 'Calibration Factors',
    domain: 'quality-assurance' as KnowledgeDomain,
    description: 'Factors applied to convert measured ionization to absorbed dose.',
    mastery: 0,
    connections: ['ptp-correction', 'output-calibration'],
    discovered: false,
    position: { x: 250, y: 275 },
    lastPracticed: Date.now()
  },
  {
    id: 'clinical-dose-significance',
    name: 'Clinical Dose Significance',
    domain: 'clinical-practice' as KnowledgeDomain,
    description: 'The impact of dose variations on clinical outcomes and patient treatment.',
    mastery: 0,
    connections: ['dose-prescription', 'output-calibration'],
    discovered: false,
    position: { x: 535, y: 225 },
    lastPracticed: Date.now()
  },
  
  // Boss-related concepts
  {
    id: 'ionix-anomaly',
    name: 'Ionix Anomaly',
    domain: 'theoretical' as KnowledgeDomain,
    description: 'Unusual quantum behavior observed in experimental ion chambers.',
    mastery: 0,
    connections: ['quantum-effects'],
    discovered: false,
    position: { x: 350, y: 400 },
    lastPracticed: Date.now()
  },
  {
    id: 'quantum-effects',
    name: 'Quantum Effects',
    domain: 'theoretical' as KnowledgeDomain,
    description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
    mastery: 0,
    connections: ['ionix-anomaly'],
    discovered: false,
    position: { x: 400, y: 450 },
    lastPracticed: Date.now()
  }
];