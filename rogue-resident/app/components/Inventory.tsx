// app/components/Inventory.tsx
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Item } from '../data/items';

// Colors for item rarity
const rarityColors: Record<string, string> = {
  common: 'border-gray-300',
  uncommon: 'border-blue-400',
  rare: 'border-purple-500'
};

export default function Inventory() {
  const { inventory } = useGameStore();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  const toggleItemDetails = (itemId: string) => {
    setActiveItemId(activeItemId === itemId ? null : itemId);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Inventory</h2>
      
      {inventory.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Your inventory is empty. Find items in Storage Closets!</p>
      ) : (
        <div className="space-y-2">
          {inventory.map((item: Item) => (
            <div 
              key={item.id} 
              className={`p-3 rounded border ${rarityColors[item.rarity]} transition-all`}
            >
              <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleItemDetails(item.id)}>
                <h3 className="font-medium">{item.name}</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  {activeItemId === item.id ? '▲' : '▼'}
                </button>
              </div>
              
              {activeItemId === item.id && (
                <div className="mt-2 pt-2 border-t text-sm space-y-2">
                  <p className="text-gray-600">{item.description}</p>
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-700">Effects:</h4>
                    {item.effects.map((effect: any) => (
                      <div key={`${item.id}-${effect.type}`} className="flex items-center">
                        <span className="capitalize mr-2">{effect.type}:</span>
                        <span className="font-medium text-green-600">+{effect.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {inventory.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h3 className="font-medium mb-2">Current Bonuses:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
              <span>Clinical:</span>
              <span className="font-medium text-green-600">
                +{inventory.reduce((sum: number, item: Item) => {
                  const effect = item.effects.find((e: any) => e.type === 'clinical');
                  return sum + (effect?.value || 0);
                }, 0)}%
              </span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
              <span>QA:</span>
              <span className="font-medium text-green-600">
                +{inventory.reduce((sum: number, item: Item) => {
                  const effect = item.effects.find((e: any) => e.type === 'qa');
                  return sum + (effect?.value || 0);
                }, 0)}%
              </span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
              <span>Educational:</span>
              <span className="font-medium text-green-600">
                +{inventory.reduce((sum: number, item: Item) => {
                  const effect = item.effects.find((e: any) => e.type === 'educational');
                  return sum + (effect?.value || 0);
                }, 0)}%
              </span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
              <span>General:</span>
              <span className="font-medium text-green-600">
                +{inventory.reduce((sum: number, item: Item) => {
                  const effect = item.effects.find((e: any) => e.type === 'general');
                  return sum + (effect?.value || 0);
                }, 0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}