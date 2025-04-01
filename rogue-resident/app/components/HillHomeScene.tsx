// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import ConstellationView from './knowledge/ConstellationView';
import Image from 'next/image';

// Progress stages for hill home (visual evolution)
type HomeStage = 'initial' | 'improving' | 'established';

interface HillHomeSceneProps {
  onComplete: () => void;
}

export default function HillHomeScene({ onComplete }: HillHomeSceneProps) {
  const { player, startGame, completedNodeIds, inventory, updateInsight } = useGameStore();
  const { 
    pendingInsights, 
    transferInsights, 
    totalMastery, 
    domainMastery,
    nodes,
    connections
  } = useKnowledgeStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Internal state
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'dusk' | 'night'>('dusk');
  const [homeStage, setHomeStage] = useState<HomeStage>('initial');
  const [skillsApplied, setSkillsApplied] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [constellationAnimating, setConstellationAnimating] = useState(false);
  
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
    
    // Calculate available skill points based on insight
    // This is a simple formula - in a full game, this would be more complex
    const calculatedPoints = Math.floor(player.insight / 100);
    setAvailablePoints(calculatedPoints);
    
    // Track whether there are pending insights to transfer
    setInsightTransferred(pendingInsights.length === 0);
  }, [completedNodeIds, player.insight, pendingInsights.length]);
  
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
    }, 20000); // Change every 20 seconds for demo purposes
    
    return () => clearInterval(interval);
  }, []);
  
  // Apply skills to game state
  const applySkills = () => {
    // Apply clinical skill bonus
    if (skills.clinical > 0) {
      // In a full implementation, this would update a permanent bonus in the game state
      console.log(`Applied +${skills.clinical * 15}% Clinical bonus`);
    }
    
    // Apply QA skill bonus
    if (skills.qa > 0) {
      // In a full implementation, this would update a permanent bonus in the game state
      console.log(`Applied +${skills.qa * 15}% QA bonus`);
    }
    
    // Apply educational skill bonus
    if (skills.educational > 0) {
      // In a full implementation, this would update a permanent bonus in the game state
      console.log(`Applied +${skills.educational * 15}% Educational bonus`);
    }
    
    // Apply health bonus (for prototype, just give extra insight)
    if (skills.health > 0) {
      const bonusInsight = skills.health * 50;
      updateInsight(bonusInsight);
      
      if (showRewardEffect) {
        showRewardEffect(bonusInsight, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
    
    // Mark skills as applied
    setSkillsApplied(true);
    
    // Close the skill panel
    setShowSkillPanel(false);
    
    // Play success sound
    if (playSound) playSound('success');
    
    // Show flash effect
    if (flashScreen) flashScreen('green');
  };
  
  // Start day phase
  const startDay = () => {
    if (playSound) playSound('click');
    if (flashScreen) flashScreen('white');
    
    // Check if there are pending insights that haven't been transferred
    if (pendingInsights.length > 0 && !insightTransferred) {
      if (confirm("You have unreviewed constellation insights. Continue anyway?")) {
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    } else {
      setTimeout(() => {
        onComplete();
      }, 300);
    }
  };
  
  // Handle constellation transfer
  const handleTransferInsights = () => {
    // Transfer pending insights
    transferInsights();
    setInsightTransferred(true);
    setConstellationAnimating(true);
    
    // Play transfer sound
    if (playSound) playSound('success');
    
    // Show transfer effect
    if (flashScreen) flashScreen('blue');
    
    setTimeout(() => {
      setConstellationAnimating(false);
    }, 5000); // Allow time for animation to complete
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
    <div className="h-full w-full overflow-hidden relative">
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
          onClick={() => setShowConstellation(true)}
        >
          <div className="w-4 h-8 bg-gray-700 absolute bottom-0 left-2"></div>
          <div className="w-8 h-3 bg-gray-800 absolute top-0 left-0 transform -rotate-45"></div>
          
          {/* Glowing indicator if there are pending insights */}
          {!insightTransferred && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-clinical rounded-full animate-pulse"></div>
          )}
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
           activeArea === 'telescope' ? 'Knowledge Constellation' : 
           activeArea === 'hospital' ? 'Return to Hospital (Start Day)' : activeArea}
           
           {activeArea === 'telescope' && !insightTransferred && (
             <span className="ml-1 text-clinical-light">• New Insights!</span>
           )}
        </div>
      )}
      
      {/* Main UI Elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl font-pixel-heading mb-2">Night Phase</h1>
          <p className="text-xl font-pixel">
            {timeOfDay === 'dawn' ? 'A new day approaches' :
             timeOfDay === 'dusk' ? 'Evening on the hillside' :
             'Under the stars'}
          </p>
        </div>
        
        {/* Stats panel */}
        <div className="bg-surface/80 p-4 pixel-borders max-w-sm pointer-events-auto">
          <div className="flex justify-between items-center mb-3">
            <PixelText className="text-xl">Resident Status</PixelText>
            
            <div className="flex space-x-1">
              {skillsApplied && (
                <span className="text-sm bg-success text-white px-2 py-1">
                  Skills Applied
                </span>
              )}
              
              {!insightTransferred && (
                <span className="text-sm bg-clinical animate-pulse text-white px-2 py-1">
                  New Insights
                </span>
              )}
            </div>
          </div>
          
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
          
          {/* Knowledge mastery overview */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <PixelText className="text-text-secondary mb-1">Knowledge Mastery</PixelText>
              <PixelText className="text-educational-light text-sm">{totalMastery}%</PixelText>
            </div>
            <div className="pixel-progress-bg">
              <div 
                className="h-full"
                style={{ 
                  width: `${totalMastery}%`,
                  background: 'linear-gradient(to right, var(--clinical-color), var(--educational-color))'
                }}
              ></div>
            </div>
            
            {/* Domain indicators */}
            <div className="flex justify-between mt-1 text-xs text-text-secondary">
              <div>Clinical: {domainMastery.clinical}%</div>
              <div>Technical: {domainMastery.technical}%</div>
              <div>Theory: {domainMastery.theoretical}%</div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <PixelButton
              className={`bg-blue-600 hover:bg-blue-500 text-white ${!insightTransferred && 'animate-pixel-pulse'}`}
              onClick={() => setShowConstellation(true)}
            >
              {!insightTransferred
                ? `View Constellation (${pendingInsights.length})`
                : 'View Constellation'
              }
            </PixelButton>
            
            <PixelButton
              className="bg-green-600 hover:bg-green-500 text-white"
              onClick={startDay}
            >
              Return to Hospital
            </PixelButton>
          </div>
          
          <div className="mt-2">
            <PixelButton
              className="w-full bg-surface hover:bg-surface-dark text-text-primary"
              onClick={() => setShowSkillPanel(true)}
            >
              {availablePoints > 0 ? `Study (${availablePoints} Points)` : 'Review Skills'}
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
            
            {/* Apply skills button */}
            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
              <PixelText className="text-sm text-text-secondary">
                {skillsApplied 
                  ? "Skills already applied to this run" 
                  : "Apply your skills to gain benefits for your next day"}
              </PixelText>
              
              <PixelButton
                className="bg-success hover:bg-green-600 text-white"
                onClick={applySkills}
                disabled={skillsApplied || (skills.clinical === 0 && skills.qa === 0 && skills.educational === 0 && skills.health === 0)}
              >
                Apply Skills
              </PixelButton>
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
      
      {/* Knowledge Constellation Overlay */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl w-full h-[80vh]">
            <ConstellationView 
              onClose={() => setShowConstellation(false)}
              width={800}
              height={600}
              interactive={true}
              enableJournal={true}
            />
            
            {/* Insight transfer controls */}
            {!insightTransferred && pendingInsights.length > 0 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-surface pixel-borders p-4 z-10">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-clinical animate-pulse mr-2"></div>
                  <PixelText className="text-clinical-light">
                    {pendingInsights.length} New Insight{pendingInsights.length !== 1 ? 's' : ''} to Transfer
                  </PixelText>
                </div>
                
                <PixelButton
                  className="bg-clinical hover:bg-clinical-light text-white w-full"
                  onClick={handleTransferInsights}
                  disabled={constellationAnimating}
                >
                  {constellationAnimating 
                    ? 'Transferring...' 
                    : `Transfer Insight${pendingInsights.length !== 1 ? 's' : ''} to Constellation`
                  }
                </PixelButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}