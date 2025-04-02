'use client';
import { useState } from 'react';
import { useJournalStore } from '../../store/journalStore';
import { PixelText } from '../PixelThemeProvider';
import Image from 'next/image';

export default function JournalReferencesPage() {
  const { 
    hasKapoorReferenceSheets, 
    hasKapoorAnnotatedNotes, 
    currentUpgrade 
  } = useJournalStore();
  
  // Track expanded sections for accordion behavior
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic-calibration']);
  
  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(id => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };
  
  return (
    <div>
      <PixelText className="text-2xl mb-4">Technical References</PixelText>
      
      <div className="space-y-6">
        {/* Basic calibration reference - everyone has this */}
        <div 
          className={`p-4 bg-surface-dark pixel-borders-thin ${expandedSections.includes('basic-calibration') ? '' : 'cursor-pointer hover:bg-surface-dark/80'}`}
          onClick={() => toggleSection('basic-calibration')}
        >
          <div className="flex justify-between items-center mb-2">
            <PixelText className="text-lg text-clinical-light">Basic Calibration Protocol</PixelText>
            <span>{expandedSections.includes('basic-calibration') ? '▼' : '►'}</span>
          </div>
          
          {expandedSections.includes('basic-calibration') && (
            <div className="p-3 bg-surface">
              <PixelText className="text-sm">
                Standard output calibration procedure:
                <br /><br />
                1. Setup farmer chamber at reference depth (10cm)
                <br />
                2. Apply 100 MU at 10x10cm field size, 6MV
                <br />
                3. Record measurements and apply PTP correction
                <br />
                4. Compare to baseline (tolerance: ±2%)
                <br /><br />
                Additional requirements:
                <br />
                - SSD setup: 100cm
                <br />
                - Water phantom or solid water phantom
                <br />
                - Calibrated electrometer 
                <br />
                - Temperature and pressure measurement
                <br /><br />
                All measurements must be documented in the QA logbook with date, time, and physicist initials.
              </PixelText>
            </div>
          )}
        </div>
        
        {/* Kapoor's reference sheets - conditionally shown */}
        {hasKapoorReferenceSheets && (
          <div 
            className={`p-4 bg-surface-dark pixel-borders-thin ${expandedSections.includes('kapoor-reference') ? '' : 'cursor-pointer hover:bg-surface-dark/80'}`}
            onClick={() => toggleSection('kapoor-reference')}
            style={{ borderLeft: '4px solid var(--clinical-color)' }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <PixelText className="text-lg text-clinical-light">Kapoor's Technical Reference</PixelText>
                <span className="ml-2 px-2 py-0.5 bg-clinical text-white text-xs">SPECIAL</span>
              </div>
              <span>{expandedSections.includes('kapoor-reference') ? '▼' : '►'}</span>
            </div>
            
            {expandedSections.includes('kapoor-reference') && (
              <>
                <div className="p-3 bg-surface">
                  <PixelText className="text-sm">
                    Advanced calibration coefficients and correction factors:
                    <br /><br />
                    - Temperature correction factor: (273.15 + T) / 295.15
                    <br />
                    - Pressure correction factor: 101.325 / P
                    <br />
                    - Combined PTP = [(273.15 + T) / 295.15] × [101.325 / P]
                    <br /><br />
                    Machine-specific calibration factors:
                    <br />
                    - LINAC 1 (6MV): 0.9823 cGy/nC
                    <br />
                    - LINAC 1 (10MV): 0.9756 cGy/nC
                    <br />
                    - LINAC 1 (15MV): 0.9698 cGy/nC
                    <br />
                    - LINAC 2 (6MV): 0.9847 cGy/nC
                    <br />
                    - LINAC 2 (10MV): 0.9725 cGy/nC
                    <br /><br />
                    Expanded tolerance specifications:
                    <br />
                    - Daily output: ±2%
                    <br />
                    - Monthly crosscalibration: ±1%
                    <br />
                    - Annual calibration: ±0.5%
                    <br />
                    - Field size dependence: ±2% for fields 5x5cm to 40x40cm
                    <br />
                    - Beam symmetry: ±1%
                    <br />
                    - Beam flatness: ±2%
                  </PixelText>
                </div>
                <div className="text-right text-xs text-text-secondary mt-1">
                  Provides +15% efficiency in calibration challenges
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Kapoor's annotated notes - conditionally shown */}
        {hasKapoorAnnotatedNotes && (
          <div 
            className={`p-4 bg-surface-dark pixel-borders-thin ${expandedSections.includes('kapoor-notes') ? '' : 'cursor-pointer hover:bg-surface-dark/80'}`}
            onClick={() => toggleSection('kapoor-notes')}
            style={{ borderLeft: '4px solid var(--educational-color)' }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <PixelText className="text-lg text-educational-light">Kapoor's Annotated Notes</PixelText>
                <span className="ml-2 px-2 py-0.5 bg-educational text-white text-xs">RARE</span>
              </div>
              <span>{expandedSections.includes('kapoor-notes') ? '▼' : '►'}</span>
            </div>
            
            {expandedSections.includes('kapoor-notes') && (
              <>
                <div className="p-3 bg-surface">
                  <div className="border-l-4 border-educational pl-2 italic">
                    <PixelText className="text-sm text-educational-light">
                      "Pay particular attention to barometric pressure trends in this facility. The building's HVAC system creates a cyclic pressure variation of approximately ±0.3 kPa throughout the day, significant enough to affect measurements if not properly accounted for."
                    </PixelText>
                  </div>
                  
                  <div className="border-l-4 border-clinical pl-2 mt-4">
                    <PixelText className="text-sm">
                      During my first year as physics resident, I failed to account for this pressure variation during morning QA. Dr. Chen caught the mistake before it affected treatment. Always check the building's pressure log before calibration.
                    </PixelText>
                  </div>
                  
                  <div className="mt-4">
                    <PixelText className="text-sm">
                      <span className="text-educational-light font-bold">Historical Context:</span> The original commissioning data for LINAC 2 showed inconsistencies that were traced to a faulty barometer. The machine was recommissioned with proper equipment, but subtle variations remained that needed careful documentation.
                    </PixelText>
                  </div>
                  
                  <div className="border-l-4 border-educational pl-2 mt-4 italic">
                    <PixelText className="text-sm text-educational-light">
                      "When working with Dr. Chen, I learned that technical precision is not about achieving perfection, but about understanding and documenting the limitations of our measurements. True rigor includes acknowledging uncertainty."
                    </PixelText>
                  </div>
                </div>
                <div className="text-right text-xs text-text-secondary mt-1">
                  Unlocks additional dialogue options with Kapoor
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Hospital map - placeholder, would be more interactive in full implementation */}
        <div 
          className={`p-4 bg-surface-dark pixel-borders-thin ${expandedSections.includes('hospital-map') ? '' : 'cursor-pointer hover:bg-surface-dark/80'}`}
          onClick={() => toggleSection('hospital-map')}
        >
          <div className="flex justify-between items-center mb-2">
            <PixelText className="text-lg">Hospital Map</PixelText>
            <span>{expandedSections.includes('hospital-map') ? '▼' : '►'}</span>
          </div>
          
          {expandedSections.includes('hospital-map') && (
            <div className="p-3 bg-surface flex items-center justify-center">
              {/* Simple hospital map visualization */}
              <div className="w-full h-64 relative bg-surface-dark">
                <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-clinical rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">L1</span>
                </div>
                
                <div className="absolute bottom-1/4 left-1/3 w-8 h-8 bg-clinical rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">L2</span>
                </div>
                
                <div className="absolute top-1/3 right-1/4 w-8 h-8 bg-educational rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">Lab</span>
                </div>
                
                <div className="absolute center bottom-1/3 right-1/3 w-8 h-8 bg-qa rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">QA</span>
                </div>
                
                <div className="absolute bottom-1/4 right-1/4 w-8 h-8 bg-storage-dark rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">S</span>
                </div>
                
                {/* Path lines */}
                <div className="absolute top-1/4 left-1/4 w-20 h-1 bg-border transform rotate-45 origin-left"></div>
                <div className="absolute top-1/3 right-1/4 w-16 h-1 bg-border transform -rotate-45 origin-left translate-y-4 translate-x-2"></div>
                
                <div className="absolute bottom-1/4 left-1/3 w-24 h-1 bg-border transform -rotate-15 origin-left translate-y-4 translate-x-8"></div>
                
                {/* Legend */}
                <div className="absolute top-2 left-2 bg-surface-dark/90 p-2 text-xs">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-clinical mr-1"></div>
                    <span>LINAC Rooms</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-educational mr-1"></div>
                    <span>Research Lab</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-qa mr-1"></div>
                    <span>QA Room</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-storage-dark mr-1"></div>
                    <span>Storage</span>
                  </div>
                </div>
                
                {/* You are here indicator */}
                <div className="absolute bottom-10 right-10 p-1 bg-danger text-white text-xs animate-pulse">
                  You are here
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Medical Physics Glossary - basic reference for all players */}
        <div 
          className={`p-4 bg-surface-dark pixel-borders-thin ${expandedSections.includes('glossary') ? '' : 'cursor-pointer hover:bg-surface-dark/80'}`}
          onClick={() => toggleSection('glossary')}
        >
          <div className="flex justify-between items-center mb-2">
            <PixelText className="text-lg">Medical Physics Glossary</PixelText>
            <span>{expandedSections.includes('glossary') ? '▼' : '►'}</span>
          </div>
          
          {expandedSections.includes('glossary') && (
            <div className="p-3 bg-surface max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <PixelText className="text-clinical-light font-medium">Absorbed Dose</PixelText>
                  <PixelText className="text-sm">The amount of energy deposited by ionizing radiation per unit mass of material. Measured in Gray (Gy).</PixelText>
                </div>
                
                <div>
                  <PixelText className="text-clinical-light font-medium">Linear Energy Transfer (LET)</PixelText>
                  <PixelText className="text-sm">The amount of energy that an ionizing particle transfers to the material traversed per unit distance. Measured in keV/μm.</PixelText>
                </div>
                
                <div>
                  <PixelText className="text-clinical-light font-medium">Inverse Square Law</PixelText>
                  <PixelText className="text-sm">The principle that the intensity of radiation is inversely proportional to the square of the distance from the source.</PixelText>
                </div>
                
                <div>
                  <PixelText className="text-clinical-light font-medium">PTP Correction</PixelText>
                  <PixelText className="text-sm">Temperature and pressure correction factor applied to ionization chamber measurements to account for air density differences from calibration conditions.</PixelText>
                </div>
                
                <div>
                  <PixelText className="text-clinical-light font-medium">Electron Equilibrium</PixelText>
                  <PixelText className="text-sm">The condition where the number of electrons entering a volume equals the number leaving it, important for accurate dosimetry measurements.</PixelText>
                </div>
                
                {/* More glossary entries would be included here */}
                <div className="text-center text-text-secondary text-sm py-2 border-t border-border">
                  Additional terms will be added as you encounter them in your residency.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}