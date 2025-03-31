// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';

// Interactive element positions
type InteractiveElement = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  action: () => void;
};

export default function HillHomeScene() {
  const { player, completedNodeIds, map, inventory, startGame } = useGameStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [activateTransition, setActivateTransition] = useState(false);
  const [showMetaProgressPanel, setShowMetaProgressPanel] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [gameProgress, setGameProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('18:45');
  const [isDawnTransition, setIsDawnTransition] = useState(false);
  const [ambientSound, setAmbientSound] = useState('evening-crickets');
  
  // Update day/night cycle
  useEffect(() => {
    // In full implementation, would use actual time tracking
    const timeInterval = setInterval(() => {
      // Simulate time passing (in real game this would be linked to in-game time)
      const hours = parseInt(currentTime.split(':')[0]);
      let minutes = parseInt(currentTime.split(':')[1]);
      
      minutes += 5; // Advance 5 minutes each tick
      
      if (minutes >= 60) {
        minutes = 0;
        let newHours = hours + 1;
        if (newHours >= 24) {
          newHours = 0;
        }
        
        // Change ambient environment based on time
        if (newHours === 5) {
          setAmbientSound('early-morning-birds');
        } else if (newHours === 8) {
          setAmbientSound('daytime-ambient');
        } else if (newHours === 19) {
          setAmbientSound('evening-crickets');
        } else if (newHours === 22) {
          setAmbientSound('night-ambient');
        }
        
        setCurrentTime(`${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      } else {
        setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }, 2000);
    
    return () => clearInterval(timeInterval);
  }, [currentTime]);
  
  // Calculate player progress based on completed nodes
  useEffect(() => {
    if (map) {
      const progress = Math.round((completedNodeIds.length / map.nodes.length) * 100);
      setGameProgress(progress);
    }
  }, [completedNodeIds, map]);
  
  // Determine hill home state based on game progress
  const getHomeStage = () => {
    if (gameProgress < 25) return 'starting';
    if (gameProgress < 50) return 'improved';
    if (gameProgress < 75) return 'advanced';
    return 'endgame';
  };
  
  const homeStage = getHomeStage();
  
  // Define interactive elements
  const getInteractiveElements = (): InteractiveElement[] => {
    return [
      {
        id: 'competency-binder',
        name: 'Competency Binder',
        x: 220,
        y: 320,
        width: 80,
        height: 40,
        description: 'Review your progress and achievements',
        action: () => {
          // In full implementation, would open CompetencyBinder component
          console.log('Opening competency binder');
          alert('In full implementation, this would open your Competency Binder!');
        }
      },
      {
        id: 'study-area',
        name: 'Study Area',
        x: 100,
        y: 250,
        width: 120,
        height: 80,
        description: 'Improve your skills with skill points',
        action: () => {
          setShowMetaProgressPanel(true);
        }
      },
      {
        id: 'hospital-view',
        name: 'Hospital View',
        x: 380,
        y: 200,
        width: 100,
        height: 80,
        description: 'Start your day at the hospital',
        action: () => {
          setIsDawnTransition(true);
          setTimeout(() => {
            setActivateTransition(true);
          }, 1000);
          setTimeout(() => {
            startGame();
          }, 2000);
        }
      },
      {
        id: 'backpack',
        name: 'Backpack',
        x: 50,
        y: 350,
        width: 50,
        height: 50,
        description: 'View your inventory',
        action: () => {
          // In full implementation, would open inventory component
          console.log('Opening inventory');
          alert(`You have ${inventory.length} items in your inventory.`);
        }
      }
    ];
  };
  
  const interactiveElements = getInteractiveElements();
  
  // Handle mouse hover on interactive elements
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over any interactive element
    let isOverElement = false;
    
    interactiveElements.forEach(element => {
      if (
        x >= element.x && 
        x <= element.x + element.width && 
        y >= element.y && 
        y <= element.y + element.height
      ) {
        setTooltipContent(element.description);
        setTooltipPosition({ x, y: y - 30 });
        setShowTooltip(true);
        isOverElement = true;
        
        // Add cursor style to the scene
        e.currentTarget.style.cursor = 'pointer';
      }
    });
    
    if (!isOverElement) {
      setShowTooltip(false);
      e.currentTarget.style.cursor = 'default';
    }
  };
  
  // Handle click on interactive elements
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    interactiveElements.forEach(element => {
      if (
        x >= element.x && 
        x <= element.x + element.width && 
        y >= element.y && 
        y <= element.y + element.height
      ) {
        element.action();
      }
    });
  };
  
  // Render meta-progression panel (skill tree)
  const renderMetaProgressPanel = () => {
    // Sample skill tree data
    const skills = [
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
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="w-[800px] h-[600px] bg-surface pixel-borders relative p-4">
          <button 
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center"
            onClick={() => setShowMetaProgressPanel(false)}
          >
            <PixelText>✕</PixelText>
          </button>
          
          <PixelText className="text-2xl mb-4">Skill Development</PixelText>
          
          <div className="flex items-center mb-4">
            <div className="bg-educational p-2 text-white pixel-borders-thin mr-4">
              <PixelText>Available Skill Points: 3</PixelText>
            </div>
            
            <PixelText className="text-sm text-text-secondary">
              Complete challenges and gain experience to earn skill points
            </PixelText>
          </div>
          
          <div className="grid grid-cols-2 gap-4 overflow-y-auto h-[450px] p-2">
            {skills.map(skill => (
              <div 
                key={skill.id}
                className={`
                  p-3 pixel-borders transition-colors cursor-pointer
                  ${selectedSkill === skill.id ? 'bg-educational/30 border-educational' : 'bg-surface-dark border-border'}
                `}
                onClick={() => setSelectedSkill(skill.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <PixelText className="font-bold">{skill.name}</PixelText>
                  <div className="flex items-center">
                    <PixelText className="mr-1">Lv. {skill.level}/{skill.maxLevel}</PixelText>
                    {skill.level < skill.maxLevel && selectedSkill === skill.id && (
                      <PixelButton
                        className="px-2 py-0.5 text-xs ml-2 bg-educational text-white"
                        onClick={() => {
                          // In full implementation, would upgrade skill
                          alert(`Upgraded ${skill.name} to level ${skill.level + 1}!`);
                        }}
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
      </div>
    );
  };
  
  // Get visual properties based on time of day
  const getTimeVisuals = () => {
    const hours = parseInt(currentTime.split(':')[0]);
    
    // Early morning (5:00 - 7:59)
    if (hours >= 5 && hours < 8) {
      return {
        skyGradient: 'linear-gradient(to bottom, #FF9E53 0%, #FFD4A0 50%, #87CEEB 100%)',
        lightIntensity: 0.7,
        starOpacity: 0
      };
    }
    // Daytime (8:00 - 17:59)
    else if (hours >= 8 && hours < 18) {
      return {
        skyGradient: 'linear-gradient(to bottom, #87CEEB 0%, #C3E5F5 100%)',
        lightIntensity: 1,
        starOpacity: 0
      };
    }
    // Evening (18:00 - 20:59)
    else if (hours >= 18 && hours < 21) {
      return {
        skyGradient: 'linear-gradient(to bottom, #F77F73 0%, #BA6A85 50%, #42566D 100%)',
        lightIntensity: 0.5,
        starOpacity: 0.2
      };
    }
    // Night (21:00 - 4:59)
    else {
      return {
        skyGradient: 'linear-gradient(to bottom, #0A1221 0%, #1D2B46 100%)',
        lightIntensity: 0.2,
        starOpacity: 1
      };
    }
  };
  
  const timeVisuals = getTimeVisuals();
  
  // Get home stage specific elements
  const getHomeStageElements = () => {
    switch (homeStage) {
      case 'starting':
        return (
          <>
            {/* Simple tent */}
            <div className="absolute left-[120px] top-[280px] w-[100px] h-[70px]">
              <div className="absolute bottom-0 left-0 w-full h-[40px] bg-[#5F4426] pixel-borders-thin"></div>
              <div className="absolute bottom-[40px] left-[10px] w-[80px] h-[40px] bg-[#7B6B43] z-10" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
            </div>
            
            {/* Campfire */}
            <div className="absolute left-[250px] top-[320px] w-[30px] h-[30px]">
              <div className="absolute inset-0 bg-[#FFA500] pixel-borders-thin animate-pulse"></div>
              <div className="absolute inset-[5px] bg-[#FF4500] animate-pulse"></div>
            </div>
            
            {/* Basic desk for binder */}
            <div className="absolute left-[200px] top-[300px] w-[60px] h-[40px] bg-[#8B5A2B] pixel-borders-thin"></div>
          </>
        );
      
      case 'improved':
        return (
          <>
            {/* Improved shelter (small cabin) */}
            <div className="absolute left-[100px] top-[250px] w-[120px] h-[100px]">
              <div className="absolute bottom-0 left-0 w-full h-[60px] bg-[#5F4426] pixel-borders-thin"></div>
              <div className="absolute bottom-[60px] left-0 w-full h-[40px] bg-[#8B5A2B] z-10" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
              <div className="absolute bottom-[20px] left-[20px] w-[30px] h-[30px] bg-[#87CEEB] pixel-borders-thin"></div> {/* Window */}
              <div className="absolute bottom-[10px] left-[70px] w-[30px] h-[40px] bg-[#3A2921] pixel-borders-thin"></div> {/* Door */}
            </div>
            
            {/* Improved campfire with pot */}
            <div className="absolute left-[250px] top-[320px] w-[40px] h-[30px]">
              <div className="absolute inset-0 bg-[#FFA500] pixel-borders-thin animate-pulse"></div>
              <div className="absolute inset-[5px] bg-[#FF4500] animate-pulse"></div>
              <div className="absolute top-[-15px] left-[5px] w-[30px] h-[20px] bg-[#444] rounded-full pixel-borders-thin"></div>
            </div>
            
            {/* Improved study area */}
            <div className="absolute left-[200px] top-[290px] w-[80px] h-[50px]">
              <div className="absolute inset-0 bg-[#8B5A2B] pixel-borders-thin"></div>
              <div className="absolute top-[5px] left-[10px] w-[60px] h-[15px] bg-[#3A2921]"></div> {/* Books */}
              <div className="absolute top-[25px] left-[20px] w-[40px] h-[20px] bg-[#DDD]"></div> {/* Paper */}
            </div>
          </>
        );
      
      case 'advanced':
        return (
          <>
            {/* Advanced shelter (larger cabin) */}
            <div className="absolute left-[80px] top-[230px] w-[150px] h-[120px]">
              <div className="absolute bottom-0 left-0 w-full h-[70px] bg-[#8B5A2B] pixel-borders-thin"></div>
              <div className="absolute bottom-[70px] left-0 w-full h-[50px] bg-[#A67C52] z-10" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
              <div className="absolute bottom-[30px] left-[20px] w-[30px] h-[30px] bg-[#87CEEB] pixel-borders-thin"></div> {/* Window 1 */}
              <div className="absolute bottom-[30px] left-[100px] w-[30px] h-[30px] bg-[#87CEEB] pixel-borders-thin"></div> {/* Window 2 */}
              <div className="absolute bottom-[10px] left-[60px] w-[30px] h-[50px] bg-[#3A2921] pixel-borders-thin"></div> {/* Door */}
              <div className="absolute top-[10px] left-[65px] w-[20px] h-[30px] bg-[#666] pixel-borders-thin"></div> {/* Chimney */}
            </div>
            
            {/* Advanced study setup with solar panel */}
            <div className="absolute left-[180px] top-[280px] w-[120px] h-[70px]">
              <div className="absolute inset-0 bg-[#A67C52] pixel-borders-thin"></div>
              <div className="absolute top-[5px] left-[10px] w-[100px] h-[25px] bg-[#3A2921]"></div> {/* Bookshelf */}
              <div className="absolute top-[35px] left-[20px] w-[50px] h-[30px] bg-[#DDD]"></div> {/* Computer */}
              <div className="absolute top-[-30px] left-[40px] w-[40px] h-[25px] bg-[#1E3F66] pixel-borders-thin"></div> {/* Solar panel */}
            </div>
            
            {/* Garden area */}
            <div className="absolute left-[320px] top-[320px] w-[80px] h-[40px] bg-[#7D8F69] pixel-borders-thin">
              <div className="absolute top-[5px] left-[10px] w-[10px] h-[20px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[30px] w-[10px] h-[25px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[50px] w-[10px] h-[15px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[70px] w-[10px] h-[20px] bg-[#526F35]"></div>
            </div>
          </>
        );
      
      case 'endgame':
        return (
          <>
            {/* Complete mini-research station */}
            <div className="absolute left-[70px] top-[200px] w-[180px] h-[150px]">
              <div className="absolute bottom-0 left-0 w-full h-[90px] bg-[#8B5A2B] pixel-borders-thin"></div>
              <div className="absolute bottom-[90px] left-0 w-full h-[60px] bg-[#A67C52] z-10" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
              <div className="absolute bottom-[40px] left-[20px] w-[40px] h-[40px] bg-[#87CEEB] pixel-borders-thin"></div> {/* Window 1 */}
              <div className="absolute bottom-[40px] left-[120px] w-[40px] h-[40px] bg-[#87CEEB] pixel-borders-thin"></div> {/* Window 2 */}
              <div className="absolute bottom-[10px] left-[70px] w-[40px] h-[60px] bg-[#3A2921] pixel-borders-thin"></div> {/* Door */}
              <div className="absolute top-[10px] left-[80px] w-[20px] h-[40px] bg-[#666] pixel-borders-thin"></div> {/* Chimney */}
              <div className="absolute top-[-15px] left-[10px] w-[60px] h-[30px] bg-[#1E3F66] pixel-borders-thin"></div> {/* Solar panel 1 */}
              <div className="absolute top-[-15px] left-[110px] w-[60px] h-[30px] bg-[#1E3F66] pixel-borders-thin"></div> {/* Solar panel 2 */}
            </div>
            
            {/* Advanced workstation */}
            <div className="absolute left-[180px] top-[260px] w-[150px] h-[90px]">
              <div className="absolute inset-0 bg-[#A67C52] pixel-borders-thin"></div>
              <div className="absolute top-[5px] left-[10px] w-[130px] h-[35px] bg-[#3A2921]"></div> {/* Bookshelves */}
              <div className="absolute top-[45px] left-[20px] w-[60px] h-[40px] bg-[#DDD]"></div> {/* Computer setup */}
              <div className="absolute top-[45px] left-[90px] w-[40px] h-[40px] bg-[#8B5A2B]"></div> {/* Equipment */}
            </div>
            
            {/* Advanced garden and lab area */}
            <div className="absolute left-[280px] top-[290px] w-[120px] h-[70px]">
              <div className="absolute inset-0 bg-[#7D8F69] pixel-borders-thin"></div>
              <div className="absolute top-[5px] left-[10px] w-[15px] h-[25px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[35px] w-[15px] h-[35px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[60px] w-[15px] h-[20px] bg-[#526F35]"></div>
              <div className="absolute top-[5px] left-[85px] w-[25px] h-[60px] bg-[#3A2921] pixel-borders-thin"></div> {/* Weather station */}
            </div>
            
            {/* Telescope */}
            <div className="absolute left-[350px] top-[230px] w-[50px] h-[80px]">
              <div className="absolute bottom-0 left-[15px] w-[20px] h-[50px] bg-[#555]"></div> {/* Stand */}
              <div className="absolute top-0 left-0 w-[50px] h-[20px] bg-[#333] rounded-full transform -rotate-45"></div> {/* Telescope */}
            </div>
          </>
        );
      
      default:
        return null;
    }
  };
  
  if (activateTransition) {
    return (
      <div 
        className="h-screen w-full flex items-center justify-center"
        style={{
          background: 'black',
          transition: 'all 1s ease-in'
        }}
      >
        <PixelText className="text-4xl text-white">Heading to the Hospital...</PixelText>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full overflow-hidden relative">
      {/* Background sky with time-based gradient */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: timeVisuals.skyGradient,
          opacity: isDawnTransition ? 0 : 1
        }}
      >
        {/* Stars (visible at night) */}
        <div 
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(white, rgba(255, 255, 255, 0) 2px) 0 0 / 100px 100px space',
            opacity: timeVisuals.starOpacity
          }}
        ></div>
      </div>
      
      {/* Dawn transition effect */}
      {isDawnTransition && (
        <div className="absolute inset-0 bg-gradient-to-t from-orange-300 to-blue-700 animate-pulse z-10"></div>
      )}
      
      {/* Hills */}
      <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-[#4B6043]" style={{ clipPath: 'polygon(0 100%, 0 30%, 20% 60%, 40% 40%, 60% 70%, 80% 50%, 100% 60%, 100% 100%)' }}></div>
      <div className="absolute bottom-0 left-0 right-0 h-[250px] bg-[#5C8150]" style={{ clipPath: 'polygon(0 100%, 0 40%, 30% 70%, 50% 50%, 70% 80%, 90% 40%, 100% 70%, 100% 100%)' }}></div>
      
      {/* Hospital in distance */}
      <div 
        className="absolute bottom-[220px] right-[100px] w-[120px] h-[80px] bg-[#DDD] pixel-borders-thin"
        style={{ opacity: timeVisuals.lightIntensity }}
      >
        <div className="absolute top-[-30px] left-[40px] w-[40px] h-[30px] bg-[#AAA] pixel-borders-thin"></div>
        <div className="absolute top-[10px] left-[10px] w-[20px] h-[20px] bg-[#87CEEB] pixel-borders-thin"></div>
        <div className="absolute top-[10px] left-[50px] w-[20px] h-[20px] bg-[#87CEEB] pixel-borders-thin"></div>
        <div className="absolute top-[10px] left-[90px] w-[20px] h-[20px] bg-[#87CEEB] pixel-borders-thin"></div>
        <div className="absolute top-[40px] left-[50px] w-[20px] h-[40px] bg-[#999] pixel-borders-thin"></div>
      </div>
      
      {/* Path down to hospital */}
      <div className="absolute bottom-0 right-[150px] w-[50px] h-[220px] bg-[#B9A281]" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }}></div>
      
      {/* Home stage specific elements */}
      {getHomeStageElements()}
      
      {/* Interactive elements hitboxes (invisible) */}
      <div 
        className="absolute inset-0" 
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {interactiveElements.map(element => (
          <div
            key={element.id}
            className={`absolute outline-none ${
              (element.id === 'hospital-view' && timeVisuals.lightIntensity < 0.5) 
                ? 'border border-white' 
                : ''
            }`}
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              // For debugging only
              // border: '1px solid red'
            }}
          ></div>
        ))}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="absolute bg-dark-gray text-white px-2 py-1 text-sm rounded z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <PixelText>{tooltipContent}</PixelText>
        </div>
      )}
      
      {/* UI overlay */}
      <div className="absolute top-0 left-0 right-0 flex justify-between p-4">
        <div className="bg-surface-dark p-2 pixel-borders-thin">
          <PixelText>{currentTime}</PixelText>
        </div>
        
        <div className="bg-surface-dark p-2 pixel-borders-thin">
          <PixelText>Day 1</PixelText>
        </div>
      </div>
      
      {/* Help text */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-surface-dark p-2 pixel-borders-thin">
        <PixelText className="text-sm">Click on objects to interact with them</PixelText>
      </div>
      
      {/* Meta-progression panel */}
      {showMetaProgressPanel && renderMetaProgressPanel()}
      
      {/* Lighting overlay to simulate time of day */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000"
        style={{ opacity: 1 - timeVisuals.lightIntensity }}
      ></div>
      
      {/* Scanlines for retro effect */}
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none"></div>
    </div>
  );
}