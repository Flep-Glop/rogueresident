// app/components/challenges/StorageCloset.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { itemsData, Item } from '../../data/items';

// Updated colors for dark theme
const rarityColors: Record<string, string> = {
  common: 'border-gray-600 bg-surface',
  uncommon: 'border-blue-600 bg-blue-900/20',
  rare: 'border-purple-600 bg-purple-900/20'
};

const rarityText: Record<string, string> = {
  common: 'text-gray-300',
  uncommon: 'text-blue-300',
  rare: 'text-purple-300'
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
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-background storage-theme rounded-lg">
      <h2 className="text-2xl font-bold text-storage-light mb-6">Storage Closet</h2>
      
      <p className="mb-6 text-text-primary">You've found some useful items in this storage closet. Choose one to take with you:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {availableItems.map(item => (
          <div
            key={item.id}
            className={`
              p-4 border-2 rounded-lg cursor-pointer transition-all bg-surface
              ${rarityColors[item.rarity]}
              ${selectedItem?.id === item.id ? 'ring-2 ring-storage-light shadow-lg transform scale-105' : 'hover:shadow-md'}
            `}
            onClick={() => handleItemSelect(item)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-text-primary">{item.name}</h3>
              <span className={`text-xs font-medium px-2 py-1 rounded ${rarityText[item.rarity]}`}>
                {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
              </span>
            </div>
            
            <p className="text-sm mb-4 text-text-secondary">{item.description}</p>
            
            <div className="text-sm space-y-1 border-t border-border pt-2">
              <h4 className="font-medium text-storage-light">Effects:</h4>
              {item.effects.map(effect => (
                <div key={`${item.id}-${effect.type}`} className="flex items-center">
                  <span className="capitalize mr-2 text-text-secondary">{effect.type}:</span>
                  <span className="font-medium text-success">+{effect.value}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">
          {selectedItem ? 
            `You've selected: ${selectedItem.name}` : 
            'Click on an item to select it'}
        </p>
        
        <button
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${selectedItem 
              ? 'bg-storage-dark text-text-primary hover:bg-storage-light hover:text-dark-gray' 
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
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