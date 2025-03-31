// app/components/HillHomeScene.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { PixelText, PixelButton } from './PixelThemeProvider';

export default function HillHomeScene() {
  const { player, startGame } = useGameStore();
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  
  // Transition to hospital/day phase
  const startDay = () => {
    startGame();
  };
  
  // Simple skill upgrade system
  const [availablePoints, setAvailablePoints] = useState(3);
  const [skills, setSkills] = useState({
    clinical: 0,
    qa: 0,
    educational: 0,
    health: 0
  });
  
  const upgradeSkill = (skill: keyof typeof skills) => {
    if (availablePoints > 0) {
      setSkills(prev => ({
        ...prev,
        [skill]: prev[skill] + 1
      }));
      setAvailablePoints(prev => prev - 1);
    }
  };
  
  return (
    <div className="h-screen w-full overflow-hidden relative bg-indigo-900">
      {/* Sky with stars */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 to-purple-800">
        <div className="absolute inset-0 opacity-70" style={{
          background: 'radial-gradient(white, rgba(255, 255, 255, 0) 2px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      {/* Hills */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-green-800" 
        style={{ borderRadius: '100% 100% 0 0 / 100% 100% 0 0' }}></div>
      
      {/* Simple cabin */}
      <div className="absolute bottom-48 left-1/4 w-32 h-24 bg-yellow-800 border-2 border-yellow-900"></div>
      <div className="absolute bottom-72 left-1/4 w-32 h-12 bg-gray-700"
        style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
      
      {/* Hospital in distance */}
      <div className="absolute bottom-56 right-1/4 w-40 h-32 bg-gray-300 border-2 border-gray-400"></div>
      
      {/* Main UI Elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-center text-white mb-12">
          <h1 className="text-4xl font-pixel-heading mb-2">Rogue Resident</h1>
          <p className="text-xl font-pixel">Your hill home awaits</p>
        </div>
        
        <div className="flex space-x-6">
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
        
        <div className="mt-8 text-white font-pixel">
          <p>Current Insight: {player.insight}</p>
          <p>Current Health: {player.health}/4</p>
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
                <PixelText>Clinical Expertise: {skills.clinical}</PixelText>
                <PixelButton
                  className="bg-clinical hover:bg-clinical-light text-white"
                  onClick={() => upgradeSkill('clinical')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <PixelText>QA Proficiency: {skills.qa}</PixelText>
                <PixelButton
                  className="bg-qa hover:bg-qa-light text-white"
                  onClick={() => upgradeSkill('qa')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <PixelText>Educational Insight: {skills.educational}</PixelText>
                <PixelButton
                  className="bg-educational hover:bg-educational-light text-white"
                  onClick={() => upgradeSkill('educational')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
              
              <div className="flex justify-between items-center">
                <PixelText>Max Health: {skills.health}</PixelText>
                <PixelButton
                  className="bg-danger hover:bg-red-500 text-white"
                  onClick={() => upgradeSkill('health')}
                  disabled={availablePoints <= 0}
                >
                  Upgrade
                </PixelButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}