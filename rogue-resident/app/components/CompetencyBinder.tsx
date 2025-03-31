// app/components/CompetencyBinder.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { Node, NodeType } from '../types/map';
import Image from 'next/image';

// Tabs in the binder
type BinderTab = 'progress' | 'skills' | 'relationships' | 'knowledge';

export default function CompetencyBinder() {
  const [activeTab, setActiveTab] = useState<BinderTab>('progress');
  const [isOpen, setIsOpen] = useState(false);
  const [animatingOpen, setAnimatingOpen] = useState(false);
  const { player, completedNodeIds, map, inventory } = useGameStore();
  
  // Toggle the binder open/closed with animation
  const toggleBinder = () => {
    if (isOpen) {
      setAnimatingOpen(false);
      setTimeout(() => setIsOpen(false), 300); // Animation duration
    } else {
      setIsOpen(true);
      setTimeout(() => setAnimatingOpen(true), 50); // Slight delay before animation
    }
  };
  
  // Calculate progress percentages
  const calculateProgress = () => {
    if (!map) return { overall: 0, clinical: 0, qa: 0, educational: 0, boss: 0 };
    
    const totalNodes = map.nodes.length;
    const totalByType: Record<NodeType, number> = {
      clinical: 0,
      qa: 0, 
      educational: 0,
      storage: 0,
      vendor: 0,
      boss: 0
    };
    
    const completedByType: Record<NodeType, number> = {
      clinical: 0,
      qa: 0, 
      educational: 0,
      storage: 0,
      vendor: 0,
      boss: 0
    };
    
    // Count total nodes by type
    map.nodes.forEach(node => {
      totalByType[node.type]++;
    });
    
    // Count completed nodes by type
    completedNodeIds.forEach(nodeId => {
      const node = map.nodes.find(n => n.id === nodeId);
      if (node) {
        completedByType[node.type]++;
      }
    });
    
    return {
      overall: Math.round((completedNodeIds.length / totalNodes) * 100),
      clinical: totalByType.clinical ? Math.round((completedByType.clinical / totalByType.clinical) * 100) : 0,
      qa: totalByType.qa ? Math.round((completedByType.qa / totalByType.qa) * 100) : 0,
      educational: totalByType.educational ? Math.round((completedByType.educational / totalByType.educational) * 100) : 0,
      boss: totalByType.boss ? Math.round((completedByType.boss / totalByType.boss) * 100) : 0
    };
  };
  
  const progress = calculateProgress();
  
  // Current run stats
  const stats = {
    daysPassed: 1, // Placeholder - would be tracked in gameStore
    challengesCompleted: completedNodeIds.length,
    itemsCollected: inventory.length,
    insight: player.insight,
    unspentSkillPoints: 3 // Placeholder - would be tracked in gameStore
  };
  
  // Data for skill tree (placeholder)
  const skillTreeData = [
    {
      id: 'clinical-expertise',
      name: 'Clinical Expertise',
      description: 'Improves performance in clinical challenges',
      level: 0,
      maxLevel: 3,
      cost: 1,
      effect: 'Clinical challenge bonus: +15% per level'
    },
    {
      id: 'qa-proficiency',
      name: 'QA Proficiency',
      description: 'Improves performance in quality assurance tasks',
      level: 0,
      maxLevel: 3,
      cost: 1,
      effect: 'QA challenge bonus: +15% per level'
    },
    {
      id: 'educational-insight',
      name: 'Educational Insight',
      description: 'Improves ability to explain complex concepts',
      level: 0,
      maxLevel: 3,
      cost: 1,
      effect: 'Educational challenge bonus: +15% per level'
    },
    {
      id: 'extra-health',
      name: 'Resilience Training',
      description: 'Increases maximum health',
      level: 0,
      maxLevel: 2,
      cost: 2,
      effect: '+1 maximum health per level'
    },
    {
      id: 'resource-efficiency',
      name: 'Resource Efficiency',
      description: 'Start each run with bonus insight',
      level: 0,
      maxLevel: 3,
      cost: 1,
      effect: '+25 starting insight per level'
    },
    {
      id: 'node-visibility',
      name: 'Map Awareness',
      description: 'Reveals additional nodes on the map',
      level: 0,
      maxLevel: 1,
      cost: 2,
      effect: 'Reveals one additional node type on the map'
    }
  ];
  
  // Placeholder relationship data
  const relationships = [
    {
      id: 'dr-kapoor',
      name: 'Dr. Kapoor',
      level: 2,
      maxLevel: 5,
      description: 'Chief Medical Physicist',
      notes: 'Values methodical approaches and thorough documentation.'
    },
    {
      id: 'technician-jesse',
      name: 'Technician Jesse',
      level: 1, 
      maxLevel: 5,
      description: 'Equipment Specialist',
      notes: 'Appreciates practical solutions and hands-on approaches.'
    },
    {
      id: 'dr-quinn',
      name: 'Dr. Zephyr Quinn',
      level: 3,
      maxLevel: 5,
      description: 'Experimental Researcher',
      notes: 'Responds well to creative thinking and theoretical discussions.'
    }
  ];
  
  // Knowledge categories (with placeholder entries)
  const knowledgeBase = [
    {
      category: 'Clinical Practice',
      entries: [
        {
          id: 'breast-cancer-plan',
          title: 'Breast Cancer Treatment Planning',
          content: 'Standard dose: 50 Gy in 25 fractions. Key OARs: ipsilateral lung, heart, contralateral breast.',
          discovered: true
        },
        {
          id: 'prostate-imrt',
          title: 'Prostate IMRT Planning',
          content: 'Typical prescription: 78 Gy in 39 fractions. Critical structures: rectum, bladder, femoral heads.',
          discovered: true
        },
        {
          id: 'sbrt-protocols',
          title: 'SBRT Protocols',
          content: 'Common fractionation schemes and dose constraints for stereotactic treatments.',
          discovered: false
        }
      ]
    },
    {
      category: 'Equipment QA',
      entries: [
        {
          id: 'linac-qa',
          title: 'Linear Accelerator QA',
          content: 'Daily, monthly, and annual QA procedures for linear accelerators.',
          discovered: false
        },
        {
          id: 'ionization-chambers',
          title: 'Ionization Chamber Theory',
          content: 'Principles of operation for various ionization chamber designs.',
          discovered: true
        }
      ]
    },
    {
      category: 'Radiation Safety',
      entries: [
        {
          id: 'alara-principle',
          title: 'ALARA Principle',
          content: 'Keep radiation exposure "As Low As Reasonably Achievable" through time, distance, and shielding.',
          discovered: true
        }
      ]
    }
  ];
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'progress':
        return (
          <div className="p-4">
            <div className="mb-6">
              <PixelText className="text-2xl mb-4">Residency Progress</PixelText>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-surface-dark p-3 pixel-borders-thin">
                  <PixelText className="mb-1">Day in Residency</PixelText>
                  <PixelText className="text-2xl text-clinical-light">{stats.daysPassed}</PixelText>
                </div>
                
                <div className="bg-surface-dark p-3 pixel-borders-thin">
                  <PixelText className="mb-1">Overall Completion</PixelText>
                  <PixelText className="text-2xl text-clinical-light">{progress.overall}%</PixelText>
                </div>
                
                <div className="bg-surface-dark p-3 pixel-borders-thin">
                  <PixelText className="mb-1">Challenges Completed</PixelText>
                  <PixelText className="text-2xl text-clinical-light">{stats.challengesCompleted}</PixelText>
                </div>
                
                <div className="bg-surface-dark p-3 pixel-borders-thin">
                  <PixelText className="mb-1">Items Collected</PixelText>
                  <PixelText className="text-2xl text-clinical-light">{stats.itemsCollected}</PixelText>
                </div>
              </div>
              
              <PixelText className="mb-2">Domain Competency</PixelText>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <PixelText>Clinical Expertise</PixelText>
                    <PixelText>{progress.clinical}%</PixelText>
                  </div>
                  <div className="pixel-progress-bg h-4">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${progress.clinical}%`,
                        backgroundColor: 'var(--clinical-color)' 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <PixelText>QA Proficiency</PixelText>
                    <PixelText>{progress.qa}%</PixelText>
                  </div>
                  <div className="pixel-progress-bg h-4">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${progress.qa}%`,
                        backgroundColor: 'var(--qa-color)' 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <PixelText>Educational Ability</PixelText>
                    <PixelText>{progress.educational}%</PixelText>
                  </div>
                  <div className="pixel-progress-bg h-4">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${progress.educational}%`,
                        backgroundColor: 'var(--educational-color)' 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <PixelText>Critical Challenges</PixelText>
                    <PixelText>{progress.boss}%</PixelText>
                  </div>
                  <div className="pixel-progress-bg h-4">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${progress.boss}%`,
                        backgroundColor: 'var(--boss-color)' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <PixelText className="text-xl mb-3">Current Run Status</PixelText>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-dark p-2 pixel-borders-thin">
                  <div className="flex items-center">
                    <div className="bg-clinical w-3 h-3 mr-2"></div>
                    <PixelText>Insight Points</PixelText>
                  </div>
                  <PixelText className="text-xl text-clinical-light mt-1">{stats.insight}</PixelText>
                </div>
                
                <div className="bg-surface-dark p-2 pixel-borders-thin">
                  <div className="flex items-center">
                    <div className="bg-educational w-3 h-3 mr-2"></div>
                    <PixelText>Unspent Skill Points</PixelText>
                  </div>
                  <PixelText className="text-xl text-educational-light mt-1">{stats.unspentSkillPoints}</PixelText>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'skills':
        return (
          <div className="p-4">
            <div className="mb-4 flex justify-between items-center">
              <PixelText className="text-2xl">Skill Tree</PixelText>
              <div className="bg-surface-dark px-3 py-1 flex items-center pixel-borders-thin">
                <div className="w-3 h-3 bg-educational mr-2"></div>
                <PixelText>Skill Points: {stats.unspentSkillPoints}</PixelText>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {skillTreeData.map(skill => (
                <div 
                  key={skill.id}
                  className={`
                    p-3 pixel-borders
                    ${skill.level === skill.maxLevel 
                      ? 'bg-success/30 border-success' 
                      : skill.level > 0 
                        ? 'bg-educational/30 border-educational' 
                        : 'bg-surface-dark border-border'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <PixelText className="font-bold">{skill.name}</PixelText>
                    <div className="flex items-center">
                      <PixelText className="mr-1">Lv. {skill.level}/{skill.maxLevel}</PixelText>
                      {skill.level < skill.maxLevel && (
                        <PixelButton
                          className={`px-2 py-0.5 text-xs ml-2
                            ${stats.unspentSkillPoints >= skill.cost 
                              ? 'bg-educational text-white' 
                              : 'bg-dark-gray text-text-secondary cursor-not-allowed'}`}
                          onClick={() => {/* Would update skill level */}}
                          disabled={stats.unspentSkillPoints < skill.cost}
                        >
                          Upgrade ({skill.cost})
                        </PixelButton>
                      )}
                    </div>
                  </div>
                  
                  <PixelText className="text-sm text-text-secondary mb-2">{skill.description}</PixelText>
                  
                  <div className="text-sm">
                    <PixelText className={skill.level > 0 ? 'text-educational-light' : 'text-text-secondary'}>
                      {skill.effect}
                    </PixelText>
                  </div>
                  
                  {/* Skill level indicators */}
                  <div className="flex mt-2">
                    {[...Array(skill.maxLevel)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-6 h-2 mr-1 ${i < skill.level ? 'bg-educational' : 'bg-dark-gray'}`}
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'relationships':
        return (
          <div className="p-4">
            <PixelText className="text-2xl mb-4">Character Relationships</PixelText>
            
            <div className="space-y-4">
              {relationships.map(char => (
                <div key={char.id} className="pixel-borders bg-surface-dark p-3">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-dark-gray mr-3 flex items-center justify-center text-2xl">
                      {char.id === 'dr-kapoor' ? '👨‍⚕️' : 
                       char.id === 'technician-jesse' ? '🔧' : 
                       char.id === 'dr-quinn' ? '🔬' : '👤'}
                    </div>
                    <div>
                      <PixelText className="text-lg">{char.name}</PixelText>
                      <PixelText className="text-sm text-text-secondary">{char.description}</PixelText>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <PixelText>Relationship Level</PixelText>
                      <PixelText>{char.level}/{char.maxLevel}</PixelText>
                    </div>
                    <div className="pixel-progress-bg h-4">
                      <div 
                        className="h-full" 
                        style={{ 
                          width: `${(char.level / char.maxLevel) * 100}%`,
                          backgroundColor: char.id === 'dr-kapoor' ? 'var(--clinical-color)' : 
                                          char.id === 'technician-jesse' ? 'var(--qa-color)' : 
                                          'var(--educational-color)' 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <PixelText className="text-sm">{char.notes}</PixelText>
                  
                  {char.level >= 3 && (
                    <div className="mt-3 pixel-borders-thin p-2 bg-surface">
                      <PixelText className="text-sm font-bold">Unlocked Benefit</PixelText>
                      <PixelText className="text-sm text-success">
                        {char.id === 'dr-kapoor' ? '+15% to Clinical Challenges' : 
                         char.id === 'technician-jesse' ? 'Better items in Storage Closets' : 
                         'Occasional hints during difficult challenges'}
                      </PixelText>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'knowledge':
        return (
          <div className="p-4">
            <PixelText className="text-2xl mb-4">Knowledge Repository</PixelText>
            
            <div className="space-y-6">
              {knowledgeBase.map(category => (
                <div key={category.category}>
                  <PixelText className="text-xl mb-2">{category.category}</PixelText>
                  
                  <div className="space-y-3">
                    {category.entries.map(entry => (
                      <div 
                        key={entry.id}
                        className={`
                          p-3 pixel-borders-thin
                          ${entry.discovered ? 'bg-surface-dark' : 'bg-dark-gray'}
                        `}
                      >
                        {entry.discovered ? (
                          <>
                            <PixelText className="font-bold mb-1">{entry.title}</PixelText>
                            <PixelText className="text-sm">{entry.content}</PixelText>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <PixelText className="text-text-secondary">
                              [Entry not yet discovered]
                            </PixelText>
                            <div className="w-5 h-5 flex items-center justify-center bg-medium-gray text-sm">
                              ?
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };
  
  if (!isOpen) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-surface pixel-borders p-2 z-50 hover:bg-clinical transition-colors"
        onClick={toggleBinder}
      >
        <div className="flex items-center">
          <Image src="/file.svg" width={24} height={24} alt="Competency Binder" className="mr-2" />
          <PixelText>Competency Binder</PixelText>
        </div>
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div 
        className={`
          w-[800px] h-[600px] bg-surface pixel-borders relative
          transform transition-all duration-300
          ${animatingOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Close button */}
        <button 
          className="absolute top-2 right-2 z-50 w-8 h-8 flex items-center justify-center hover:bg-danger/30 transition-colors"
          onClick={toggleBinder}
        >
          <PixelText>✕</PixelText>
        </button>
        
        {/* Binder header */}
        <div className="bg-clinical-dark text-white p-3 flex items-center shadow-md">
          <Image src="/file.svg" width={24} height={24} alt="Competency Binder" className="mr-2" />
          <PixelText className="text-xl">Medical Physics Competency Binder</PixelText>
        </div>
        
        {/* Binder tabs */}
        <div className="flex pt-2 px-3 bg-surface-dark border-b border-border">
          <button 
            className={`py-2 px-4 ${activeTab === 'progress' ? 'bg-surface border-t border-l border-r border-border' : 'bg-surface-dark text-text-secondary'}`}
            onClick={() => setActiveTab('progress')}
          >
            <PixelText>Progress</PixelText>
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'skills' ? 'bg-surface border-t border-l border-r border-border' : 'bg-surface-dark text-text-secondary'}`}
            onClick={() => setActiveTab('skills')}
          >
            <PixelText>Skills</PixelText>
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'relationships' ? 'bg-surface border-t border-l border-r border-border' : 'bg-surface-dark text-text-secondary'}`}
            onClick={() => setActiveTab('relationships')}
          >
            <PixelText>Relationships</PixelText>
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'knowledge' ? 'bg-surface border-t border-l border-r border-border' : 'bg-surface-dark text-text-secondary'}`}
            onClick={() => setActiveTab('knowledge')}
          >
            <PixelText>Knowledge</PixelText>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="overflow-y-auto h-[calc(100%-90px)]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}