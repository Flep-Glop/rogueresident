// app/components/challenges/StorageCloset.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { itemsData, Item } from '../../data/items';
import { PixelButton, PixelText } from '../PixelThemeProvider';

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
  
  // Get rarity styles
  const getRarityStyles = (rarity: string) => {
    switch(rarity) {
      case 'rare':
        return {
          border: 'border-purple-700',
          bg: 'bg-purple-900/20',
          text: 'text-purple-300'
        };
      case 'uncommon':
        return {
          border: 'border-blue-700',
          bg: 'bg-blue-900/20',
          text: 'text-blue-300'
        };
      default:
        return {
          border: 'border-gray-600',
          bg: 'bg-surface',
          text: 'text-gray-300'
        };
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders storage-container">
      <PixelText className="text-2xl text-storage-light font-pixel-heading mb-6">Storage Closet</PixelText>
      
      <PixelText className="mb-6 text-text-primary">You've found some useful items in this storage closet. Choose one to take with you:</PixelText>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {availableItems.map(item => {
          const rarityStyle = getRarityStyles(item.rarity);
          
          return (
            <div
              key={item.id}
              className={`
                p-4 border-2 rounded-lg cursor-pointer transition-all pixel-borders-thin
                ${rarityStyle.border} ${rarityStyle.bg}
                ${selectedItem?.id === item.id ? 'ring-2 ring-storage-light shadow-pixel-md transform scale-105' : 'hover:shadow-pixel'}
              `}
              onClick={() => handleItemSelect(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <PixelText className="text-lg text-text-primary">{item.name}</PixelText>
                <span className={`text-xs font-pixel px-2 py-1 rounded ${rarityStyle.text}`}>
                  {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                </span>
              </div>
              
              <PixelText className="text-sm mb-4 text-text-secondary">{item.description}</PixelText>
              
              <div className="text-sm space-y-1 border-t border-border pt-2">
                <PixelText className="font-medium text-storage-light">Effects:</PixelText>
                {item.effects.map(effect => (
                  <div key={`${item.id}-${effect.type}`} className="flex items-center">
                    <span className="capitalize mr-2 text-text-secondary font-pixel">{effect.type}:</span>
                    <span className="font-medium text-success font-pixel">+{effect.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center">
        <PixelText className="text-sm text-text-secondary">
          {selectedItem ? 
            `You've selected: ${selectedItem.name}` : 
            'Click on an item to select it'}
        </PixelText>
        
        <PixelButton
          className={`
            ${selectedItem 
              ? 'bg-storage text-text-primary hover:bg-storage-light hover:text-dark-gray' 
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
          onClick={handleConfirm}
          disabled={!selectedItem}
        >
          Take Item
        </PixelButton>
      </div>
    </div>
  );
}