// app/components/challenges/StorageCloset.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { itemsData, Item } from '../../data/items';

// Colors for item rarity
const rarityColors: Record<string, string> = {
  common: 'border-gray-300 bg-white',
  uncommon: 'border-blue-400 bg-blue-50',
  rare: 'border-purple-500 bg-purple-50'
};

const rarityText: Record<string, string> = {
  common: 'text-gray-600',
  uncommon: 'text-blue-600',
  rare: 'text-purple-600'
};

export default function StorageCloset() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  
  const { completeNode, currentNodeId, addToInventory, updateInsight } = useGameStore();
  
  // Generate a selection of random items when the component mounts
  useEffect(() => {
    // Define rarity distribution (more common, fewer rare)
    const itemPool = [...itemsData].sort(() => 0.5 - Math.random());
    
    // For prototype, simply pick 3 random items
    const selectedItems = itemPool.slice(0, 3);
    setAvailableItems(selectedItems);
  }, []);
  
  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };
  
  const handleConfirm = () => {
    if (selectedItem && currentNodeId) {
      // Add the item to inventory
      addToInventory(selectedItem);
      
      // Complete the node
      completeNode(currentNodeId);
      
      // Give a small insight bonus for finding an item (based on rarity)
      const insightBonus = selectedItem.rarity === 'rare' ? 50 : 
                          selectedItem.rarity === 'uncommon' ? 30 : 20;
      updateInsight(insightBonus);
      
      // Return to map (handled by parent component by checking completedNodeIds)
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-amber-50 rounded-lg">
      <h2 className="text-2xl font-bold text-amber-800 mb-6">Storage Closet</h2>
      
      <p className="mb-6 text-amber-700">You've found some useful items in this storage closet. Choose one to take with you:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {availableItems.map(item => (
          <div
            key={item.id}
            className={`
              p-4 border-2 rounded-lg cursor-pointer transition-all
              ${rarityColors[item.rarity]}
              ${selectedItem?.id === item.id ? 'ring-2 ring-amber-500 shadow-lg transform scale-105' : 'hover:shadow-md'}
            `}
            onClick={() => handleItemSelect(item)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{item.name}</h3>
              <span className={`text-xs font-medium px-2 py-1 rounded ${rarityText[item.rarity]}`}>
                {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
              </span>
            </div>
            
            <p className="text-sm mb-4 text-gray-700">{item.description}</p>
            
            <div className="text-sm space-y-1 border-t pt-2">
              <h4 className="font-medium text-amber-800">Effects:</h4>
              {item.effects.map(effect => (
                <div key={`${item.id}-${effect.type}`} className="flex items-center">
                  <span className="capitalize mr-2">{effect.type}:</span>
                  <span className="font-medium text-green-600">+{effect.value}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-amber-600">
          {selectedItem ? 
            `You've selected: ${selectedItem.name}` : 
            'Click on an item to select it'}
        </p>
        
        <button
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${selectedItem 
              ? 'bg-amber-600 text-white hover:bg-amber-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          `}
          onClick={handleConfirm}
          disabled={!selectedItem}
        >
          Take Item
        </button>
      </div>
    </div>
  );
}