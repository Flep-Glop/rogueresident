'use client';
import { useState } from 'react';
import { useJournalStore, JournalEntry } from '../../store/journalStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';

export default function JournalNotesPage() {
  const { entries, addEntry } = useJournalStore();
  const { playSound } = useGameEffects();
  
  // State for creating new entries
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryTags, setNewEntryTags] = useState('');
  
  // State for expanded entries
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  
  // For prototype, we'll use some hardcoded entries if no entries exist yet
  const allEntries = entries.length > 0 ? entries : [
    {
      id: 'entry-1',
      title: 'LINAC Calibration with Dr. Kapoor',
      date: new Date().toISOString(),
      content: 'Today I performed my first LINAC output calibration under Dr. Kapoor\'s supervision. Key learnings:\n\n- Importance of PTP correction factor\n- Electronic equilibrium principles\n- Clinical significance of 1% output error (0.7 Gy in 70 Gy treatment)',
      tags: ['calibration', 'qa', 'kapoor']
    }
  ];
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Toggle entry expanded state
  const toggleExpanded = (entryId: string) => {
    if (expandedEntries.includes(entryId)) {
      setExpandedEntries(expandedEntries.filter(id => id !== entryId));
    } else {
      setExpandedEntries([...expandedEntries, entryId]);
    }
  };
  
  // Handle creating new entry
  const handleCreateEntry = () => {
    if (!newEntryTitle.trim()) return;
    
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      title: newEntryTitle,
      date: new Date().toISOString(),
      content: newEntryContent,
      tags: newEntryTags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    addEntry(newEntry);
    
    // Reset form
    setNewEntryTitle('');
    setNewEntryContent('');
    setNewEntryTags('');
    setIsCreatingEntry(false);
    
    // Play sound effect
    if (playSound) playSound('success');
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <PixelText className="text-2xl">Journal Entries</PixelText>
        {!isCreatingEntry && (
          <PixelButton 
            className="bg-clinical text-white text-sm px-3 py-1"
            onClick={() => setIsCreatingEntry(true)}
          >
            New Entry
          </PixelButton>
        )}
      </div>
      
      {/* New entry form */}
      {isCreatingEntry && (
        <div className="mb-6 p-4 bg-surface-dark pixel-borders-thin">
          <PixelText className="text-lg text-clinical-light mb-2">Create New Entry</PixelText>
          
          <div className="mb-3">
            <PixelText className="text-sm mb-1">Title:</PixelText>
            <input
              className="w-full bg-surface p-2 text-sm font-pixel border border-border"
              value={newEntryTitle}
              onChange={(e) => setNewEntryTitle(e.target.value)}
              placeholder="Entry title..."
            />
          </div>
          
          <div className="mb-3">
            <PixelText className="text-sm mb-1">Content:</PixelText>
            <textarea
              className="w-full h-32 bg-surface p-2 text-sm font-pixel border border-border"
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              placeholder="Record your observations here..."
            />
          </div>
          
          <div className="mb-3">
            <PixelText className="text-sm mb-1">Tags (comma separated):</PixelText>
            <input
              className="w-full bg-surface p-2 text-sm font-pixel border border-border"
              value={newEntryTags}
              onChange={(e) => setNewEntryTags(e.target.value)}
              placeholder="calibration, qa, kapoor..."
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <PixelButton 
              className="bg-surface text-sm px-3 py-1"
              onClick={() => setIsCreatingEntry(false)}
            >
              Cancel
            </PixelButton>
            <PixelButton 
              className="bg-clinical text-white text-sm px-3 py-1"
              onClick={handleCreateEntry}
              disabled={!newEntryTitle.trim()}
            >
              Save Entry
            </PixelButton>
          </div>
        </div>
      )}
      
      {/* Entry list */}
      <div className="space-y-4">
        {allEntries.length === 0 ? (
          <div className="p-4 bg-surface-dark text-center">
            <PixelText className="text-text-secondary">
              No journal entries yet. Create your first entry to start documenting your journey.
            </PixelText>
          </div>
        ) : (
          allEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort newest first
            .map(entry => (
              <div key={entry.id} className="p-4 bg-surface-dark pixel-borders-thin">
                <div className="flex justify-between items-center">
                  <button 
                    className="flex-1 flex justify-between items-center text-left"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <PixelText className="text-lg text-clinical-light">{entry.title}</PixelText>
                    <div className="flex items-center">
                      <PixelText className="text-sm text-text-secondary mr-2">{formatDate(entry.date)}</PixelText>
                      <span>{expandedEntries.includes(entry.id) ? '▼' : '►'}</span>
                    </div>
                  </button>
                </div>
                
                {expandedEntries.includes(entry.id) && (
                  <>
                    <div className="p-3 bg-surface my-2 min-h-[80px] whitespace-pre-line">
                      <PixelText className="text-sm">{entry.content}</PixelText>
                    </div>
                    
                    <div className="flex items-center">
                      <PixelText className="text-sm text-text-secondary mr-2">Tags:</PixelText>
                      <div className="flex flex-wrap">
                        {entry.tags && entry.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 bg-clinical/20 text-clinical-light text-xs mr-1 mb-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}