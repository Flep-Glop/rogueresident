// app/components/Inventory.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';
import { PixelText, PixelBorder } from './PixelThemeProvider';
import { PixelItemCard, PixelTooltip } from './PixelUIElements';

// Effect type colors
const effectColors: Record<string, { bg: string, text: string, icon: string }> = {
  clinical: {
    bg: 'bg-clinical',
    text: 'text-white',
    icon: '🏥'
  },
  qa: {
    bg: 'bg-qa',
    text: 'text-white',
    icon: '🔍'
  },
  educational: {
    bg: 'bg-educational',
    text: 'text-white',
    icon: '📚'
  },
  general: {
    bg: 'bg-accent-primary',
    text: 'text-white',
    icon: '⚡'
  }
};

export default function Inventory() {
  const { inventory } = useGameStore();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  
  // Animation for newly added items
  useEffect(() => {
    if (inventory.length > 0) {
      const newestItem = inventory[inventory.length - 1];
      setNewItemId(newestItem.id);
      
      // Clear the "new" status after animation
      const timer = setTimeout(() => {
        setNewItemId(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [inventory.length]);
  
  const toggleItemDetails = (itemId: string) => {
    setActiveItemId(activeItemId === itemId ? null : itemId);
  };
  
  // Calculate total bonuses
  const calculateTotalBonuses = () => {
    const bonuses: Record<string, number> = {
      clinical: 0,
      qa: 0,
      educational: 0,
      general: 0
    };
    
    inventory.forEach((item: Item) => {
      item.effects.forEach((effect: any) => {
        if (bonuses[effect.type] !== undefined) {
          bonuses[effect.type] += effect.value;
        }
      });
    });
    
    return bonuses;
  };
  
  const totalBonuses = calculateTotalBonuses();
  
  return (
    <div className="p-4">
      <div className="pixel-borders-thin mb-6">
        <div className="bg-surface-dark px-3 py-2 border-b border-border flex justify-between items-center">
          <PixelText>Inventory</PixelText>
          <PixelText className="text-text-secondary">{inventory.length}/10</PixelText>
        </div>
        
        <div className="p-3">
          {inventory.length === 0 ? (
            <div className="bg-surface-dark border border-border rounded p-4 text-center">
              <div className="text-4xl mb-2">📦</div>
              <PixelText className="text-text-secondary text-sm">Your inventory is empty. Find items in Storage Closets!</PixelText>
            </div>
          ) : (
            <div className="space-y-3">
              {inventory.map((item: Item) => {
                const isNew = item.id === newItemId;
                
                return (
                  <div 
                    key={item.id} 
                    className={`
                      pixel-borders-thin bg-surface-dark
                      transition-all duration-300 cursor-pointer
                      ${isNew ? 'animate-pixel-pulse' : ''}
                    `}
                    onClick={() => toggleItemDetails(item.id)}
                  >
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {isNew && (
                            <span className="inline-flex items-center justify-center mr-2 w-5 h-5 text-xs font-pixel rounded-full bg-success text-white">
                              NEW
                            </span>
                          )}
                          <PixelText className="text-text-primary">{item.name}</PixelText>
                        </div>
                        <div className="flex items-center">
                          <span className={`text-xs font-pixel px-2 py-0.5 rounded ${item.rarity === 'rare' ? 'bg-purple-900 text-purple-300' : item.rarity === 'uncommon' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'} mr-2`}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </span>
                          <button className="text-text-secondary hover:text-text-primary w-6 h-6 flex items-center justify-center">
                            {activeItemId === item.id ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                      
                      {activeItemId === item.id && (
                        <div className="mt-3 pt-3 border-t border-border text-sm space-y-3">
                          <p className="text-text-secondary font-pixel">{item.description}</p>
                          
                          <div className="space-y-2">
                            <PixelText className="text-text-primary">Effects:</PixelText>
                            <div className="grid grid-cols-2 gap-2">
                              {item.effects.map((effect: any) => {
                                const effectStyle = effectColors[effect.type];
                                
                                return (
                                  <div 
                                    key={`${item.id}-${effect.type}`} 
                                    className={`
                                      flex items-center px-2 py-1 rounded-md
                                      ${effectStyle.bg}
                                    `}
                                  >
                                    <span className="mr-1">{effectStyle.icon}</span>
                                    <span className="capitalize mr-1 font-pixel">{effect.type}:</span>
                                    <span className="font-pixel">+{effect.value}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {inventory.length > 0 && (
        <div className="pixel-borders-thin">
          <div className="bg-surface-dark px-3 py-2 border-b border-border flex items-center">
            <PixelText>Current Bonuses</PixelText>
            <PixelTooltip 
              content="Item bonuses stack and provide benefits to different types of challenges."
              position="top"
            >
              <div className="ml-2 w-4 h-4 rounded-full bg-medium-gray text-white flex items-center justify-center text-xs cursor-help">?</div>
            </PixelTooltip>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(totalBonuses).map(([type, value]) => {
                const effectStyle = effectColors[type];
                
                return (
                  <div 
                    key={type}
                    className={`
                      flex justify-between px-3 py-2 
                      ${value > 0 ? effectStyle.bg : 'bg-medium-gray'}
                      pixel-borders-thin
                    `}
                  >
                    <div className="flex items-center">
                      <span className="mr-1">{effectStyle.icon}</span>
                      <PixelText className="capitalize">{type}:</PixelText>
                    </div>
                    <PixelText className={value > 0 ? 'text-white' : 'text-gray-400'}>+{value}%</PixelText>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}