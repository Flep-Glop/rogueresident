'use client';
import { useState } from 'react';
import { useJournalStore, JournalCharacterNote } from '../../store/journalStore';
import { PixelText } from '../PixelThemeProvider';
import Image from 'next/image';

// Character data structure
interface Character {
  id: string;
  name: string;
  title: string;
  imageSrc: string;
  colorClass: string;
  bgClass: string;
  textClass: string;
  unlocked: boolean;
  description: string;
}

export default function JournalCharactersPage() {
  // In full implementation, fetch from store
  const { characterNotes, updateCharacterNote } = useJournalStore();
  
  // For the prototype, we'll use some hardcoded character data
  const characters: Character[] = [
    {
      id: 'kapoor',
      name: 'Dr. Kapoor',
      title: 'Chief Medical Physicist',
      imageSrc: '/characters/kapoor.png',
      colorClass: 'border-clinical',
      bgClass: 'bg-clinical',
      textClass: 'text-clinical-light',
      unlocked: true,
      description: 'Methodical and precise. Values technical accuracy and careful documentation.'
    },
    {
      id: 'quinn',
      name: 'Dr. Quinn',
      title: 'Experimental Researcher',
      imageSrc: '/characters/quinn.png',
      colorClass: 'border-educational',
      bgClass: 'bg-educational',
      textClass: 'text-educational-light',
      unlocked: true,
      description: 'Innovative and unconventional. Approaches problems with creative solutions.'
    },
    {
      id: 'jesse',
      name: 'Technician Jesse',
      title: 'Equipment Specialist',
      imageSrc: '/characters/jesse.png',
      colorClass: 'border-qa',
      bgClass: 'bg-qa',
      textClass: 'text-qa-light',
      unlocked: true,
      description: 'Practical and resourceful. Focuses on hands-on solutions to technical problems.'
    },
    {
      id: 'garcia',
      name: 'Dr. Garcia',
      title: 'Radiation Oncologist',
      imageSrc: '/characters/kapoor.png', // Placeholder, would be replaced with actual image
      colorClass: 'border-clinical-alt',
      bgClass: 'bg-clinical-alt-dark',
      textClass: 'text-clinical-light',
      unlocked: false,
      description: ''
    }
  ];
  
  // Set up state for notes editing
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  
  // Get relationship level for character
  const getRelationshipLevel = (characterId: string): number => {
    const note = characterNotes.find(note => note.characterId === characterId);
    return note?.relationshipLevel || 0;
  };
  
  // Get notes for character
  const getCharacterNotes = (characterId: string): string => {
    // If currently editing, return from editing state
    if (editingNotes[characterId] !== undefined) {
      return editingNotes[characterId];
    }
    
    // Otherwise get from store
    const note = characterNotes.find(note => note.characterId === characterId);
    return note?.notes || '';
  };
  
  // Handle note changes
  const handleNoteChange = (characterId: string, value: string) => {
    setEditingNotes({
      ...editingNotes,
      [characterId]: value
    });
  };
  
  // Save notes for character
  const saveNotes = (characterId: string) => {
    if (editingNotes[characterId] !== undefined) {
      updateCharacterNote(characterId, editingNotes[characterId]);
      
      // Remove from editing state
      const newEditingNotes = {...editingNotes};
      delete newEditingNotes[characterId];
      setEditingNotes(newEditingNotes);
    }
  };
  
  // Format last interaction date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'No interaction yet';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get last interaction date
  const getLastInteraction = (characterId: string): string => {
    const note = characterNotes.find(note => note.characterId === characterId);
    return formatDate(note?.lastInteraction);
  };
  
  return (
    <div>
      <PixelText className="text-2xl mb-4">Character Notes</PixelText>
      
      <div className="space-y-6">
        {characters.map(character => (
          <div 
            key={character.id} 
            className={`p-4 bg-surface-dark pixel-borders-thin ${!character.unlocked ? 'opacity-50' : ''}`}
            style={{
              borderLeft: character.unlocked ? `4px solid ${character.colorClass.replace('border-', 'var(--')}${character.colorClass.includes('alt') ? '' : '-color'})` : undefined
            }}
          >
            <div className="flex items-start">
              <div className={`w-20 h-20 mr-4 rounded-full overflow-hidden border-2 ${character.colorClass} flex-shrink-0 ${!character.unlocked ? 'grayscale' : ''}`}>
                <div className="w-full h-full relative">
                  {character.unlocked ? (
                    <Image 
                      src={character.imageSrc} 
                      alt={character.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-dark">
                      <span className="text-3xl">?</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <PixelText className={`text-xl ${character.unlocked ? character.textClass : ''}`}>
                  {character.unlocked ? character.name : 'Unknown Character'}
                </PixelText>
                
                <PixelText className="text-text-secondary text-sm mb-2">
                  {character.unlocked ? character.title : '???'}
                </PixelText>
                
                {character.unlocked && (
                  <>
                    <div className="flex items-center mb-3">
                      <PixelText className="text-sm mr-2">Relationship:</PixelText>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i}
                            className={`w-5 h-2 mx-0.5 ${i < getRelationshipLevel(character.id) ? character.bgClass : 'bg-surface'}`}
                          ></div>
                        ))}
                      </div>
                      <PixelText className={`text-xs ml-2 ${character.textClass}`}>
                        {getRelationshipLevel(character.id)}/5
                      </PixelText>
                    </div>
                    
                    <div className="mb-1">
                      <div className="flex justify-between">
                        <PixelText className="text-sm text-text-secondary">Notes:</PixelText>
                        <PixelText className="text-xs text-text-secondary">
                          Last interaction: {getLastInteraction(character.id)}
                        </PixelText>
                      </div>
                      
                      {editingNotes[character.id] !== undefined ? (
                        <div className="mt-1">
                          <textarea
                            className="w-full h-24 bg-surface p-2 text-sm font-pixel border border-border"
                            value={editingNotes[character.id]}
                            onChange={(e) => handleNoteChange(character.id, e.target.value)}
                            placeholder="Add your observations about this character..."
                          />
                          <div className="flex justify-end mt-1 space-x-2">
                            <button 
                              className="px-2 py-1 bg-clinical text-white text-xs"
                              onClick={() => saveNotes(character.id)}
                            >
                              Save
                            </button>
                            <button 
                              className="px-2 py-1 bg-surface text-xs"
                              onClick={() => {
                                const newEditingNotes = {...editingNotes};
                                delete newEditingNotes[character.id];
                                setEditingNotes(newEditingNotes);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          {getCharacterNotes(character.id) ? (
                            <div className="p-2 bg-surface min-h-[60px]">
                              <PixelText className="text-sm">
                                {getCharacterNotes(character.id)}
                              </PixelText>
                            </div>
                          ) : (
                            <div className="p-2 bg-surface border border-dashed border-border text-text-secondary text-sm italic min-h-[60px]">
                              No notes recorded yet. Add your observations about this character.
                            </div>
                          )}
                          <div className="flex justify-end mt-1">
                            <button 
                              className="px-2 py-1 bg-surface text-xs"
                              onClick={() => setEditingNotes({
                                ...editingNotes,
                                [character.id]: getCharacterNotes(character.id)
                              })}
                            >
                              Edit Notes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Character info summary */}
                    {character.description && (
                      <div className="mt-3 pt-2 border-t border-border">
                        <PixelText className="text-sm">
                          {character.description}
                        </PixelText>
                      </div>
                    )}
                  </>
                )}
                
                {!character.unlocked && (
                  <div className="p-3 bg-surface-dark/50 text-text-secondary text-sm italic">
                    You have not yet met this character.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}