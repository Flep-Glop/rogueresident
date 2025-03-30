// app/components/Inventory.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';

// Enhanced colors for item rarity with gradients
const rarityStyles: Record<string, { border: string, bg: string, text: string, gradient: string }> = {
  common: {
    border: 'border-gray-300',
    bg: 'bg-white',
    text: 'text-gray-600',
    gradient: 'from-gray-50 to-gray-100'
  },
  uncommon: {
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    gradient: 'from-blue-50 to-blue-100'
  },
  rare: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    gradient: 'from-purple-50 to-purple-100'
  }
};

// Effect type colors
const effectColors: Record<string, { bg: string, text: string, icon: string }> = {
  clinical: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: '🏥'
  },
  qa: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: '🔍'
  },
  educational: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: '📚'
  },
  general: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Inventory</h2>
        <span className="text-sm text-gray-500">{inventory.length}/10</span>
      </div>
      
      {inventory.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-gray-500 text-sm">Your inventory is empty. Find items in Storage Closets!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inventory.map((item: Item) => {
            const isNew = item.id === newItemId;
            const isActive = activeItemId === item.id;
            const rarity = rarityStyles[item.rarity];
            
            return (
              <div 
                key={item.id} 
                className={`
                  p-3 rounded-lg border ${rarity.border} bg-gradient-to-r ${rarity.gradient}
                  transition-all duration-300 ${isNew ? 'animate-pulse shadow-md' : ''}
                  ${isActive ? 'shadow-md' : 'hover:shadow-sm'}
                `}
              >
                <div 
                  className="flex justify-between items-center cursor-pointer" 
                  onClick={() => toggleItemDetails(item.id)}
                >
                  <div className="flex items-center">
                    {isNew && (
                      <span className="inline-flex items-center justify-center mr-2 w-5 h-5 text-xs font-semibold rounded-full bg-green-500 text-white">
                        NEW
                      </span>
                    )}
                    <h3 className="font-medium">{item.name}</h3>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rarity.text} ${rarity.bg} mr-2`}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center">
                      {isActive ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
                
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-3 animate-fadeIn">
                    <p className="text-gray-600">{item.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Effects:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {item.effects.map((effect: any) => {
                          const effectStyle = effectColors[effect.type];
                          
                          return (
                            <div 
                              key={`${item.id}-${effect.type}`} 
                              className={`
                                flex items-center px-2 py-1 rounded-md
                                ${effectStyle.bg} ${effectStyle.text}
                              `}
                            >
                              <span className="mr-1">{effectStyle.icon}</span>
                              <span className="capitalize mr-1">{effect.type}:</span>
                              <span className="font-medium">+{effect.value}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {inventory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-medium mb-3 flex items-center">
            <span className="mr-2">Current Bonuses</span>
            <div className="relative group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                Item bonuses stack and provide benefits to different types of challenges.
              </div>
            </div>
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(totalBonuses).map(([type, value]) => {
              const effectStyle = effectColors[type];
              
              return (
                <div 
                  key={type}
                  className={`
                    flex justify-between px-3 py-2 rounded-lg
                    ${effectStyle.bg} ${effectStyle.text}
                  `}
                >
                  <div className="flex items-center">
                    <span className="mr-1">{effectStyle.icon}</span>
                    <span className="capitalize">{type}:</span>
                  </div>
                  <span className="font-bold">+{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}