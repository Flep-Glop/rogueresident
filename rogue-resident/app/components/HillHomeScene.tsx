// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';

// Progress stages for hill home (visual evolution)
type HomeStage = 'initial' | 'improving' | 'established';

export default function HillHomeScene() {
  const { player, startGame, completedNodeIds, inventory } = useGameStore();
  const { playSound, flashScreen } = useGameEffects();
  
  // Internal state
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'dusk' | 'night'>('dusk');
  const [homeStage, setHomeStage] = useState<HomeStage>('initial');
  
  // Simple skill upgrade system
  const [availablePoints, setAvailablePoints] = useState(3);
  const [skills, setSkills] = useState({
    clinical: 0,
    qa: 0,
    educational: 0,
    health: 0
  });

  // Set home stage based on game progress
  useEffect(() => {
    if (completedNodeIds.length >= 10) {
      setHomeStage('established');
    } else if (completedNodeIds.length >= 5) {
      setHomeStage('improving');
    } else {
      setHomeStage('initial');
    }
  }, [completedNodeIds]);
  
  // Time of day cycle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        switch(prev) {
          case 'dawn': return 'dusk';
          case 'dusk': return 'night';
          case 'night': return 'dawn';
          default: return 'dusk';
        }
      });
    }, 60000); // Change every minute for demo purposes
    
    return () => clearInterval(interval);
  }, []);
  
  // Transition to hospital/day phase
  const startDay = () => {
    if (playSound) playSound('click');
    if (flashScreen) flashScreen('white');
    setTimeout(() => {
      startGame();
    }, 300);
  };
  
  const upgradeSkill = (skill: keyof typeof skills) => {
    if (availablePoints > 0) {
      if (playSound) playSound('success');
      setSkills(prev => ({
        ...prev,
        [skill]: prev[skill] + 1
      }));
      setAvailablePoints(prev => prev - 1);
    } else {
      if (playSound) playSound('failure');
    }
  };
  
  // Interactive area hover handler
  const handleAreaHover = (area: string | null) => {
    setActiveArea(area);
    if (area && playSound) {
      playSound('ui-click');
    }
  };
  
  // Get sky gradient based on time of day
  const getSkyGradient = () => {
    switch(timeOfDay) {
      case 'dawn':
        return 'from-indigo-900 via-purple-500 to-orange-400';
      case 'dusk':
        return 'from-indigo-900 via-purple-800 to-orange-600';
      case 'night':
        return 'from-gray-900 via-indigo-900 to-indigo-800';
      default:
        return 'from-indigo-900 via-purple-800 to-indigo-800';
    }
  };
  
  // Get home details based on stage
  const getHomeDetails = () => {
    switch(homeStage) {
      case 'initial':
        return {
          structure: 'tent',
          color: 'bg-yellow-800',
          size: 'w-24 h-20',
          extras: []
        };
      case 'improving':
        return {
          structure: 'improved-tent',
          color: 'bg-yellow-700',
          size: 'w-28 h-24',
          extras: ['study-table', 'small-garden']
        };
      case 'established':
        return {
          structure: 'cabin',
          color: 'bg-yellow-800',
          size: 'w-32 h-28',
          extras: ['study-table', 'garden', 'telescope', 'lab-equipment']
        };
      default:
        return {
          structure: 'tent',
          color: 'bg-yellow-800',
          size: 'w-24 h-20',
          extras: []
        };
    }
  };
  
  const homeDetails = getHomeDetails();
  
  return (
    <div className="h-screen w-full overflow-hidden relative">
      {/* Sky with stars - changes based on time of day */}
      <div className={`absolute inset-0 bg-gradient-to-b ${getSkyGradient()} transition-colors duration-1000`}>
        <div className="absolute inset-0 opacity-70" style={{
          background: 'radial-gradient(white, rgba(255, 255, 255, 0) 2px)',
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Moon or sun */}
        <div 
          className={`absolute rounded-full 
            ${timeOfDay === 'night' ? 'bg-gray-200' : 'bg-yellow-200'}
            ${timeOfDay === 'dusk' ? 'right-20 top-20' : 
              timeOfDay === 'night' ? 'right-40 top-40' : 'left-20 top-20'}
            transition-all duration-1000
          `}
          style={{
            width: timeOfDay === 'night' ? '60px' : '80px',
            height: timeOfDay === 'night' ? '60px' : '80px',
            boxShadow: timeOfDay === 'night' 
              ? '0 0 20px rgba(255, 255, 255, 0.5)' 
              : '0 0 30px rgba(255, 255, 0, 0.5)'
          }}
        ></div>
      </div>
      
      {/* Hills */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-green-800" 
        style={{ borderRadius: '100% 100% 0 0 / 100% 100% 0 0' }}></div>
      
      {/* Path to hospital */}
      <div className="absolute bottom-0 left-1/4 right-0 h-6 bg-yellow-700/50"
        style={{ 
          clipPath: 'polygon(0 0, 100% 100%, 100% 0)',
          transform: 'translateX(20px)'
        }}></div>
      
      {/* Main home structure */}
      <div 
        className={`absolute ${homeDetails.size} ${homeDetails.color} border-2 border-yellow-900
          ${activeArea === 'home' ? 'ring-2 ring-white cursor-pointer' : ''}
          transition-all duration-300
        `}
        style={{ 
          bottom: '120px',
          left: '25%',
          transform: activeArea === 'home' ? 'scale(1.05)' : 'scale(1)'
        }}
        onMouseEnter={() => handleAreaHover('home')}
        onMouseLeave={() => handleAreaHover(null)}
        onClick={() => setShowInventory(true)}
      >
        {/* Roof */}
        {homeStage === 'established' && (
          <div className="absolute -top-12 left-0 w-full h-12 bg-gray-700"
            style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}
          ></div>
        )}
        
        {/* Window */}
        {homeStage !== 'initial' && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-300 border border-yellow-950"></div>
        )}
        
        {/* Door */}
        <div className="absolute bottom-0 left-1/3 w-8 h-10 bg-yellow-950"></div>
        
        {/* Light glow from window at night */}
        {timeOfDay === 'night' && (
          <div 
            className="absolute -z-10 opacity-60 rounded-full bg-yellow-500"
            style={{
              width: '50px',
              height: '50px',
              top: homeStage === 'initial' ? '5px' : '2px',
              right: homeStage === 'initial' ? '5px' : '2px',
              filter: 'blur(10px)'
            }}
          ></div>
        )}
      </div>
      
      {/* Study area (appears in improving and established stages) */}
      {(homeDetails.extras.includes('study-table')) && (
        <div 
          className={`absolute w-16 h-10 bg-brown-600 border border-yellow-950
            ${activeArea === 'study' ? 'ring-2 ring-white cursor-pointer' : ''}
            transition-all duration-300
          `}
          style={{ 
            bottom: '105px',
            left: '40%',
            transform: activeArea === 'study' ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={() => handleAreaHover('study')}
          onMouseLeave={() => handleAreaHover(null)}
          onClick={() => setShowSkillPanel(true)}
        >
          {/* Books on table */}
          <div className="absolute top-0 left-1 w-4 h-4 bg-blue-800"></div>
          <div className="absolute top-0 left-5 w-3 h-3 bg-red-800"></div>
          <div className="absolute top-0 left-8 w-2 h-5 bg-green-800"></div>
          
          {/* Light glow at night */}
          {timeOfDay === 'night' && (
            <div 
              className="absolute -z-10 opacity-60 rounded-full bg-yellow-500"
              style={{
                width: '40px',
                height: '40px',
                top: '-5px',
                left: '5px',
                filter: 'blur(8px)'
              }}
            ></div>
          )}
        </div>
      )}
      
      {/* Telescope (appears in established stage) */}
      {homeDetails.extras.includes('telescope') && (
        <div 
          className={`absolute w-8 h-12 
            ${activeArea === 'telescope' ? 'ring-2 ring-white cursor-pointer' : ''}
            transition-all duration-300
          `}
          style={{ 
            bottom: '160px',
            right: '30%',
            transform: activeArea === 'telescope' ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={() => handleAreaHover('telescope')}
          onMouseLeave={() => handleAreaHover(null)}
        >
          <div className="w-4 h-8 bg-gray-700 absolute bottom-0 left-2"></div>
          <div className="w-8 h-3 bg-gray-800 absolute top-0 left-0 transform -rotate-45"></div>
        </div>
      )}
      
      {/* Garden (varies by stage) */}
      {homeDetails.extras.includes('garden') && (
        <div 
          className={`absolute
            ${activeArea === 'garden' ? 'ring-2 ring-white cursor-pointer' : ''}
            transition-all duration-300
          `}
          style={{ 
            bottom: '90px',
            left: homeStage === 'established' ? '15%' : '45%',
            width: homeStage === 'established' ? '60px' : '30px',
            height: homeStage === 'established' ? '30px' : '15px',
            transform: activeArea === 'garden' ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={() => handleAreaHover('garden')}
          onMouseLeave={() => handleAreaHover(null)}
        >
          {/* Plants */}
          <div className="absolute bottom-0 left-1 w-3 h-6 bg-green-600"></div>
          <div className="absolute bottom-0 left-5 w-4 h-8 bg-green-700"></div>
          <div className="absolute bottom-0 left-10 w-3 h-5 bg-green-800"></div>
          {homeStage === 'established' && (
            <>
              <div className="absolute bottom-0 left-14 w-4 h-7 bg-green-600"></div>
              <div className="absolute bottom-0 left-20 w-3 h-9 bg-green-700"></div>
            </>
          )}
        </div>
      )}
      
      {/* Hospital in distance */}
      <div 
        className={`absolute bottom-56 right-1/4 w-40 h-32 bg-gray-300 border-2 border-gray-400
          ${activeArea === 'hospital' ? 'ring-2 ring-white cursor-pointer' : ''}
          transition-all duration-300
        `}
        style={{ transform: activeArea === 'hospital' ? 'scale(1.05)' : 'scale(1)' }}
        onMouseEnter={() => handleAreaHover('hospital')}
        onMouseLeave={() => handleAreaHover(null)}
        onClick={startDay}
      >
        {/* Hospital windows with lights at night */}
        <div className="grid grid-cols-4 grid-rows-3 gap-1 p-2 h-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className={`border border-gray-500 ${timeOfDay === 'night' ? 'bg-yellow-200' : 'bg-white'}`}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Tooltip for active area */}
      {activeArea && (
        <div 
          className="absolute bg-surface-dark text-white px-3 py-1 rounded-sm z-10 text-sm font-pixel"
          style={{
            left: `${activeArea === 'home' ? '25%' : 
                  activeArea === 'study' ? '40%' : 
                  activeArea === 'garden' ? (homeStage === 'established' ? '15%' : '45%') : 
                  activeArea === 'telescope' ? '70%' : 
                  activeArea === 'hospital' ? '75%' : '50%'}`,
            bottom: `${activeArea === 'home' ? '150px' : 
                    activeArea === 'study' ? '125px' : 
                    activeArea === 'garden' ? '130px' : 
                    activeArea === 'telescope' ? '180px' : 
                    activeArea === 'hospital' ? '100px' : '50%'}`,
            transform: 'translateX(-50%)',
          }}
        >
          {activeArea === 'home' ? 'Your Living Space - View Inventory' : 
           activeArea === 'study' ? 'Study Area - Upgrade Skills' : 
           activeArea === 'garden' ? 'Garden - Medicinal Plants' : 
           activeArea === 'telescope' ? 'Telescope - View Night Sky' : 
           activeArea === 'hospital' ? 'Go to Hospital (Start Day)' : activeArea}
        </div>
      )}
      
      {/* Main UI Elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl font-pixel-heading mb-2">Rogue Resident</h1>
          <p className="text-xl font-pixel">
            {timeOfDay === 'dawn' ? 'A new day begins' :
             timeOfDay === 'dusk' ? 'Evening on the hillside' :
             'Under the stars'}
          </p>
        </div>
        
        {/* Stats panel */}
        <div className="bg-surface/80 p-4 pixel-borders max-w-sm pointer-events-auto">
          <PixelText className="text-xl mb-3">Resident Status</PixelText>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <PixelText className="text-text-secondary mb-1">Health</PixelText>
              <div className="flex">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-6 h-6 mr-1 ${i < player.health ? 'bg-danger' : 'bg-dark-gray'}`}></div>
                ))}
              </div>
            </div>
            
            <div>
              <PixelText className="text-text-secondary mb-1">Insight</PixelText>
              <PixelText className="text-clinical-light text-xl">{player.insight}</PixelText>
            </div>
          </div>
          
          <div className="flex justify-between">
            <PixelButton
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={() => setShowSkillPanel(true)}
            >
              Study & Improve Skills
            </PixelButton>
            
            <PixelButton
              className="bg-green-600 hover:bg-green-500 text-white"
              onClick={startDay}
            >
              Head to Hospital
            </PixelButton>
          </div>
        </div>
      </div>
      
      {/* Simple skill panel */}
      {showSkillPanel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Skill Development</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowSkillPanel(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <PixelText className="mb-4">Available Points: {availablePoints}</PixelText>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <PixelText>Clinical Expertise: {skills.clinical}</PixelText>
                  <PixelText className="text-xs text-text-secondary">Improves performance in clinical scenarios</PixelText>
                </div>
                <PixelButton
                  className="bg-clinical hover:bg-clinical-light text-white"
                  onClick={() => upgradeSkill('clinical')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <PixelText>QA Proficiency: {skills.qa}</PixelText>
                  <PixelText className="text-xs text-text-secondary">Enhances equipment calibration accuracy</PixelText>
                </div>
                <PixelButton
                  className="bg-qa hover:bg-qa-light text-white"
                  onClick={() => upgradeSkill('qa')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <PixelText>Educational Insight: {skills.educational}</PixelText>
                  <PixelText className="text-xs text-text-secondary">Improves ability to explain complex concepts</PixelText>
                </div>
                <PixelButton
                  className="bg-educational hover:bg-educational-light text-white"
                  onClick={() => upgradeSkill('educational')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <PixelText>Max Health: {skills.health}</PixelText>
                  <PixelText className="text-xs text-text-secondary">Increases maximum health by 1 per level</PixelText>
                </div>
                <PixelButton
                  className="bg-danger hover:bg-red-500 text-white"
                  onClick={() => upgradeSkill('health')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
            </div>
            
            {/* Study progress */}
            <div className="mt-6 pt-4 border-t border-border">
              <PixelText className="mb-2">Study Progress</PixelText>
              <div className="w-full bg-dark-gray h-4 pixel-borders-thin mb-2">
                <div className="h-full bg-educational" style={{ width: '65%' }}></div>
              </div>
              <PixelText className="text-xs text-text-secondary">Complete more challenges to unlock advanced skills</PixelText>
            </div>
          </div>
        </div>
      )}
      
      {/* Inventory panel */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Personal Items</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowInventory(false)}
              >
                Close
              </PixelButton>
            </div>
            
            {/* Simple inventory view */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              {inventory && inventory.length > 0 ? (
                inventory.map((item: any, index: number) => (
                  <div key={index} className="bg-surface-dark p-3 pixel-borders-thin">
                    <div className="flex justify-between">
                      <PixelText>{item.name}</PixelText>
                      <PixelText className="text-text-secondary text-sm">{item.rarity}</PixelText>
                    </div>
                    <PixelText className="text-text-secondary text-sm">{item.description}</PixelText>
                  </div>
                ))
              ) : (
                <div className="bg-surface-dark p-4 text-center">
                  <PixelText className="text-text-secondary">No items collected yet</PixelText>
                  <PixelText className="text-text-secondary text-sm mt-2">Visit storage closets in the hospital to find useful equipment</PixelText>
                </div>
              )}
            </div>
            
            {/* Hill home progression info */}
            <div className="mt-4 pt-4 border-t border-border">
              <PixelText className="mb-2">Hill Home Development</PixelText>
              <div className="w-full bg-dark-gray h-4 pixel-borders-thin mb-2">
                <div 
                  className="h-full bg-success" 
                  style={{ 
                    width: homeStage === 'initial' ? '20%' : 
                            homeStage === 'improving' ? '60%' : '90%' 
                  }}
                ></div>
              </div>
              <PixelText className="text-xs text-text-secondary">
                {homeStage === 'initial' 
                  ? 'Your basic campsite. Complete more runs to improve your living space.' 
                  : homeStage === 'improving' 
                    ? 'Your home is developing nicely. Continue to enhance it with more successful runs.' 
                    : 'Your hillside home has become a comfortable and functional space.'}
              </PixelText>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}