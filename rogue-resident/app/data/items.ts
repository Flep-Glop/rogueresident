// data/items.ts
export interface Item {
    id: string;
    name: string;
    description: string;
    effects: {
      type: 'clinical' | 'qa' | 'educational' | 'general';
      value: number;
    }[];
    rarity: 'common' | 'uncommon' | 'rare';
  }
  
  export const itemsData: Item[] = [
    {
      id: 'dosimetry-handbook',
      name: 'Vintage Dosimetry Handbook',
      description: 'An old but valuable reference for radiation dosimetry calculations.',
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
      rarity: 'common',
      effects: [
        { type: 'clinical', value: 20 },
      ],
    },
    {
      id: 'qa-toolkit',
      name: 'QA Specialist Toolkit',
      description: 'A compact kit with essential tools for quick equipment checks.',
      rarity: 'common',
      effects: [
        { type: 'qa', value: 20 },
      ],
    },
    {
      id: 'medical-physics-guide',
      name: 'Comprehensive Medical Physics Guide',
      description: 'A modern reference book covering all aspects of medical physics.',
      rarity: 'uncommon',
      effects: [
        { type: 'clinical', value: 15 },
        { type: 'qa', value: 15 },
        { type: 'educational', value: 15 },
      ],
    },
  ];