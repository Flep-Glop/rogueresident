// app/data/items.ts
export interface Item {
    id: string;
    name: string;
    description: string;
    effects: {
      type: 'clinical' | 'qa' | 'educational' | 'general';
      value: number;
    }[];
    rarity: 'common' | 'uncommon' | 'rare';
    flavor?: string; // Optional flavor text for more immersion
  }
  
  export const itemsData: Item[] = [
    {
      id: 'dosimetry-handbook',
      name: 'Vintage Dosimetry Handbook',
      description: 'An old but valuable reference for radiation dosimetry calculations.',
      flavor: 'The margins are filled with handwritten notes from a physicist who worked here decades ago.',
      rarity: 'uncommon',
      effects: [
        { type: 'clinical', value: 25 },
        { type: 'general', value: 10 },
      ],
    },
    {
      id: 'calibration-phantom',
      name: 'Calibration Phantom Set',
      description: 'A complete set of phantoms for various calibration procedures.',
      flavor: 'Carefully machined to precise specifications, these phantoms ensure accurate measurements.',
      rarity: 'uncommon',
      effects: [
        { type: 'qa', value: 30 },
        { type: 'clinical', value: 10 },
      ],
    },
    {
      id: 'teaching-slides',
      name: 'Visual Learning Package',
      description: 'A collection of well-designed teaching slides for explaining complex concepts.',
      flavor: 'These slides have won teaching awards for their clarity and effectiveness.',
      rarity: 'common',
      effects: [
        { type: 'educational', value: 30 },
        { type: 'general', value: 5 },
      ],
    },
    {
      id: 'physicist-notebook',
      name: 'Retired Physicist\'s Notebook',
      description: 'Personal notes from a veteran physicist, filled with insights and practical tips.',
      flavor: 'Decades of experience distilled into concise, practical wisdom.',
      rarity: 'rare',
      effects: [
        { type: 'clinical', value: 15 },
        { type: 'qa', value: 15 },
        { type: 'educational', value: 15 },
        { type: 'general', value: 15 },
      ],
    },
    {
      id: 'analysis-algorithm',
      name: 'Experimental Analysis Algorithm',
      description: 'A cutting-edge algorithm that helps identify patterns in complex data.',
      flavor: 'Still in beta, but already showing remarkable results in finding subtle correlations.',
      rarity: 'rare',
      effects: [
        { type: 'clinical', value: 20 },
        { type: 'qa', value: 30 },
      ],
    },
    {
      id: 'dose-calculator',
      name: 'Pocket Dose Calculator',
      description: 'A handheld device for quick dose calculations in the field.',
      flavor: 'Small enough to fit in your lab coat pocket, yet powerful enough for most clinical needs.',
      rarity: 'common',
      effects: [
        { type: 'clinical', value: 20 },
      ],
    },
    {
      id: 'qa-toolkit',
      name: 'QA Specialist Toolkit',
      description: 'A compact kit with essential tools for quick equipment checks.',
      flavor: 'Every tool has its place in this meticulously organized case.',
      rarity: 'common',
      effects: [
        { type: 'qa', value: 20 },
      ],
    },
    {
      id: 'medical-physics-guide',
      name: 'Comprehensive Medical Physics Guide',
      description: 'A modern reference book covering all aspects of medical physics.',
      flavor: 'The gold standard reference text, updated annually with the latest research.',
      rarity: 'uncommon',
      effects: [
        { type: 'clinical', value: 15 },
        { type: 'qa', value: 15 },
        { type: 'educational', value: 15 },
      ],
    },
    // New items added for enhanced variety
    {
      id: 'radiation-detector',
      name: 'Advanced Radiation Detector',
      description: 'A highly sensitive detector capable of measuring even minimal radiation levels.',
      flavor: 'The precision engineering allows for measurements accurate to within 0.01% of actual values.',
      rarity: 'uncommon',
      effects: [
        { type: 'qa', value: 25 },
        { type: 'clinical', value: 10 },
      ],
    },
    {
      id: 'dwell-position-optimizer',
      name: 'Dwell Position Optimizer',
      description: 'Software that helps optimize dwell positions for brachytherapy treatments.',
      flavor: 'The elegant algorithms behind this software have revolutionized brachytherapy planning.',
      rarity: 'rare',
      effects: [
        { type: 'clinical', value: 35 },
      ],
    },
    {
      id: 'patient-immobilization-system',
      name: 'Precision Immobilization System',
      description: 'A customizable system for ensuring accurate patient positioning during treatment.',
      flavor: 'Millimeter precision makes all the difference in radiation therapy.',
      rarity: 'uncommon',
      effects: [
        { type: 'clinical', value: 20 },
        { type: 'qa', value: 10 },
      ],
    },
    {
      id: 'interactive-anatomy-model',
      name: 'Interactive Anatomy Model',
      description: 'A detailed digital model showing anatomical structures and their radiation sensitivity.',
      flavor: 'Students consistently rate this as their favorite teaching tool.',
      rarity: 'uncommon',
      effects: [
        { type: 'educational', value: 25 },
        { type: 'clinical', value: 10 },
      ],
    },
    {
      id: 'treatment-planning-software',
      name: 'Treatment Planning Software License',
      description: 'Access to advanced treatment planning capabilities with the latest algorithms.',
      flavor: 'The interface may be complex, but the results are worth the learning curve.',
      rarity: 'rare',
      effects: [
        { type: 'clinical', value: 30 },
        { type: 'educational', value: 10 },
      ],
    },
    {
      id: 'regulatory-compliance-guide',
      name: 'Regulatory Compliance Guide',
      description: 'A comprehensive manual detailing all current radiation safety regulations.',
      flavor: 'Boring but essential - knowing these regulations has saved many careers.',
      rarity: 'common',
      effects: [
        { type: 'qa', value: 15 },
        { type: 'general', value: 15 },
      ],
    },
    {
      id: 'physics-residency-handbook',
      name: 'Physics Residency Handbook',
      description: 'A guide covering all aspects of medical physics residency requirements.',
      flavor: 'Dog-eared and coffee-stained, this handbook has guided generations of residents.',
      rarity: 'common',
      effects: [
        { type: 'general', value: 20 },
        { type: 'educational', value: 10 },
      ],
    },
    {
      id: 'conference-proceedings',
      name: 'Recent Conference Proceedings',
      description: 'The latest research findings from the annual medical physics conference.',
      flavor: 'Cutting-edge research that hasn\'t even been published in journals yet.',
      rarity: 'uncommon',
      effects: [
        { type: 'clinical', value: 15 },
        { type: 'qa', value: 15 },
        { type: 'educational', value: 15 },
      ],
    },
    {
      id: 'premium-dosimeter',
      name: 'Premium Dosimeter Collection',
      description: 'A set of high-quality dosimeters for various radiation measurement needs.',
      flavor: 'The gold standard for dosimetry, used in leading research institutions worldwide.',
      rarity: 'rare',
      effects: [
        { type: 'qa', value: 35 },
        { type: 'clinical', value: 15 },
      ],
    },
    {
      id: 'mentor-contact',
      name: 'Senior Physicist Mentor Contact',
      description: 'Direct line to an experienced physicist who can offer guidance on difficult cases.',
      flavor: '"Call me anytime - I\'ve seen it all in my 30 years here." - Dr. Thompson',
      rarity: 'rare',
      effects: [
        { type: 'general', value: 25 },
        { type: 'clinical', value: 15 },
        { type: 'educational', value: 10 },
      ],
    },
  ];