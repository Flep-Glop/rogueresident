// app/components/HillHomeScene.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { PixelText, PixelButton } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import ConstellationView from './knowledge/ConstellationView';

/**
 * HillHomeScene - Night phase component with a minimalist design
 * 
 * This version focuses on functionality over visual complexity,
 * using a simple black background with clear navigation buttons
 */
export default function HillHomeScene({ onComplete }: { onComplete: () => void }) {
  const { player, completedNodeIds, inventory, updateInsight } = useGameStore();
  const { 
    pendingInsights, 
    transferInsights, 
    totalMastery, 
    domainMastery,
    nodes,
    connections,
    resetNewlyDiscovered
  } = useKnowledgeStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Internal state
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [skillsApplied, setSkillsApplied] = useState(false);
  const [insightTransferred, setInsightTransferred] = useState(false);
  const [constellationAnimating, setConstellationAnimating] = useState(false);
  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  
  // Simple skill upgrade system
  const [availablePoints, setAvailablePoints] = useState(3);
  const [skills, setSkills] = useState({
    clinical: 0,
    qa: 0,
    educational: 0,
    health: 0
  });
  
  useEffect(() => {
    // Calculate available skill points based on insight
    const calculatedPoints = Math.floor(player.insight / 100);
    setAvailablePoints(calculatedPoints);
    
    // Track whether there are pending insights to transfer
    setInsightTransferred(pendingInsights.length === 0);
  }, [completedNodeIds, player.insight, pendingInsights.length]);
  
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
  
  // Handle constellation transfer - ENHANCED AS SUGGESTED
  const handleTransferInsights = () => {
    // Connect to animation sequence
    setConstellationAnimating(true);
    
    // Track newly discovered nodes for highlighting
    const newNodes = pendingInsights.map(insight => insight.conceptId);
    setActiveNodes(newNodes);
    
    // Visual effects
    if (playSound) playSound('success');
    if (flashScreen) flashScreen('blue');
    
    // Create centered reward effect for larger insight transfers
    const totalInsight = pendingInsights.reduce((sum, item) => sum + item.amount, 0);
    if (showRewardEffect && totalInsight > 0) {
      showRewardEffect(totalInsight, window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Complete the knowledge transfer
    transferInsights();
    setInsightTransferred(true);
    
    // Reset animation state after delay to allow visualization
    setTimeout(() => {
      setConstellationAnimating(false);
      resetNewlyDiscovered();
      setActiveNodes([]);
    }, 5000);
  };
  
  // Apply skills to game state
  const applySkills = () => {
    // Apply clinical skill bonus
    if (skills.clinical > 0) {
      console.log(`Applied +${skills.clinical * 15}% Clinical bonus`);
    }
    
    // Apply QA skill bonus
    if (skills.qa > 0) {
      console.log(`Applied +${skills.qa * 15}% QA bonus`);
    }
    
    // Apply educational skill bonus
    if (skills.educational > 0) {
      console.log(`Applied +${skills.educational * 15}% Educational bonus`);
    }
    
    // Apply health bonus
    if (skills.health > 0) {
      const bonusInsight = skills.health * 50;
      updateInsight(bonusInsight);
      
      if (showRewardEffect) {
        showRewardEffect(bonusInsight, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
    
    setSkillsApplied(true);
    setShowSkillPanel(false);
    if (playSound) playSound('success');
    if (flashScreen) flashScreen('green');
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

  return (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6">
      {/* Simplified header */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <PixelText className="text-3xl text-white font-pixel-heading mb-2">Night Phase</PixelText>
        <PixelText className="text-lg text-gray-400">
          Hillside Home - Study and Reflect
        </PixelText>
      </div>
      
      {/* Main interaction grid - simplified to 2x2 button layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-8">
        {/* Constellation button */}
        <div 
          className={`p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer ${!insightTransferred ? 'animate-pulse' : ''}`}
          onClick={() => setShowConstellation(true)}
        >
          <div className="text-4xl mb-4">🌠</div>
          <PixelText className="text-xl mb-2">Knowledge Constellation</PixelText>
          {!insightTransferred && (
            <span className="px-3 py-1 bg-clinical text-white text-sm mt-2">
              {pendingInsights.length} New Insights!
            </span>
          )}
        </div>
        
        {/* Skill development button */}
        <div 
          className={`p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer ${availablePoints > 0 ? 'ring-1 ring-educational' : ''}`}
          onClick={() => setShowSkillPanel(true)}
        >
          <div className="text-4xl mb-4">📚</div>
          <PixelText className="text-xl mb-2">Skill Development</PixelText>
          {availablePoints > 0 && (
            <span className="px-3 py-1 bg-educational text-white text-sm mt-2">
              {availablePoints} Points Available
            </span>
          )}
          {skillsApplied && (
            <span className="px-3 py-1 bg-success text-white text-sm mt-2">
              Skills Applied
            </span>
          )}
        </div>
        
        {/* Inventory button */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer"
          onClick={() => setShowInventory(true)}
        >
          <div className="text-4xl mb-4">🎒</div>
          <PixelText className="text-xl mb-2">Inventory</PixelText>
          <span className="px-3 py-1 bg-gray-700 text-white text-sm mt-2">
            {inventory.length} Items
          </span>
        </div>
        
        {/* Start day button */}
        <div 
          className="p-8 bg-surface-dark pixel-borders flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 hover:bg-surface cursor-pointer"
          onClick={startDay}
        >
          <div className="text-4xl mb-4">🏥</div>
          <PixelText className="text-xl mb-2">Return to Hospital</PixelText>
          <span className="px-3 py-1 bg-gray-700 text-white text-sm mt-2">
            Start Day
          </span>
        </div>
      </div>
      
      {/* Player stats summary - simplified */}
      <div className="bg-surface-dark pixel-borders p-4 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <PixelText className="text-lg">Player Status</PixelText>
          <div className="flex space-x-2">
            <span className="px-2 py-1 bg-danger text-white text-sm">
              Health: {player.health}/{player.maxHealth}
            </span>
            <span className="px-2 py-1 bg-clinical text-white text-sm">
              Insight: {player.insight}
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <PixelText className="text-text-secondary mb-1">Knowledge Mastery</PixelText>
          <div className="pixel-progress-bg">
            <div 
              className="h-full bg-educational" 
              style={{ width: `${totalMastery}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-text-secondary flex justify-between">
          <span>Clinical: {domainMastery.clinical}%</span>
          <span>Technical: {domainMastery.technical}%</span>
          <span>Theory: {domainMastery.theoretical}%</span>
        </div>
      </div>
      
      {/* Simple skill panel */}
      {showSkillPanel && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-md w-full pixel-borders">
            <div className="flex justify-between items-center mb-4">
              <PixelText className="text-2xl">Inventory</PixelText>
              <PixelButton 
                className="bg-red-600 hover:bg-red-500 text-white" 
                onClick={() => setShowInventory(false)}
              >
                Close
              </PixelButton>
            </div>
            
            <div className="grid grid-cols-1 gap-3 mb-4 max-h-96 overflow-y-auto">
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
          </div>
        </div>
      )}
      
      {/* Knowledge Constellation Overlay */}
      {showConstellation && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="relative max-w-4xl w-full h-[80vh]">
            <ConstellationView 
              onClose={() => setShowConstellation(false)}
              width={800}
              height={600}
              interactive={true}
              enableJournal={true}
              activeNodes={activeNodes}
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