// app/components/challenges/ClinicalChallenge.tsx
'use client';
import { useState, useEffect } from 'react';
import { useChallengeStore } from '../../store/challengeStore';
import { useGameStore } from '../../store/gameStore';
import { Item } from '../../data/items';
import { PixelButton, PixelText } from '../PixelThemeProvider';

// Add these interfaces for type safety
interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

export default function ClinicalChallenge() {
  const { currentChallenge, completeChallenge } = useChallengeStore();
  const { inventory } = useGameStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [hintUsed, setHintUsed] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  
  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);
  
  if (!currentChallenge) return null;
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Calculate clinical bonus from inventory
  const calculateClinicalBonus = () => {
    return inventory.reduce((total, item: Item) => {
      const effect = item.effects.find((e: any) => e.type === 'clinical');
      return total + (effect?.value || 0);
    }, 0);
  };
  
  const clinicalBonus = calculateClinicalBonus();
  
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
  };
  
  const useHint = () => {
    if (hintUsed) return;
    
    const questions = currentChallenge.content.questions as Question[];
    const currentQuestion = questions[activeQuestion];
    const correctOption = currentQuestion.options.find(opt => opt.isCorrect);
    
    if (correctOption) {
      // Give a hint by eliminating 2 wrong answers
      const wrongOptions = currentQuestion.options
        .filter(opt => !opt.isCorrect)
        .map(opt => opt.id);
      
      // Shuffle wrong options and take 2 (or 1 if only 1 wrong option)
      const eliminatedOptions = wrongOptions
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(2, wrongOptions.length));
      
      setHintUsed(true);
      
      return eliminatedOptions;
    }
    
    return [];
  };
  
  const handleSubmit = () => {
    // Calculate score based on correct answers
    const questions = currentChallenge.content.questions as Question[];
    const totalQuestions = questions.length;
    let correctAnswers = 0;
    
    questions.forEach((question: Question) => {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.options.find((opt: Option) => opt.id === selectedOptionId);
      if (selectedOption?.isCorrect) {
        correctAnswers++;
      }
    });
    
    // Apply clinical bonus (item effects)
    // Each 20% of bonus gives +5% to score, max 25%
    const bonusPercentage = Math.min(25, Math.floor(clinicalBonus / 20) * 5);
    
    // Calculate raw percentage
    let percentCorrect = (correctAnswers / totalQuestions) * 100;
    
    // Apply bonus (e.g., 80% raw score + 15% bonus = 92% effective score)
    const effectivePercentage = Math.min(100, percentCorrect * (1 + bonusPercentage/100));
    
    // Determine grade based on percentage
    let grade: 'S' | 'A' | 'B' | 'C';
    if (effectivePercentage === 100) grade = 'S';
    else if (effectivePercentage >= 80) grade = 'A';
    else if (effectivePercentage >= 60) grade = 'B';
    else grade = 'C';
    
    completeChallenge(grade);
  };
  
  const questions = currentChallenge.content.questions as Question[];
  const currentQuestion = questions[activeQuestion];
  const isComplete = questions.every((q: Question) => answers[q.id]);
  const eliminatedOptions = hintUsed ? useHint() : [];
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders clinical-container">
      {/* Header with timer and title */}
      <div className="flex justify-between items-center mb-8">
        <PixelText className="text-2xl text-clinical-light font-pixel-heading">
          {currentChallenge.content.title}
        </PixelText>
        
        <div className="flex items-center space-x-4">
          {clinicalBonus > 0 && (
            <div className="px-3 py-1 bg-clinical text-white pixel-borders-thin text-sm font-pixel flex items-center">
              <span className="mr-1">🏥</span>
              <span>+{clinicalBonus}% Clinical Bonus</span>
            </div>
          )}
          
          <div className={`
            px-3 py-1 text-sm font-pixel flex items-center 
            ${timeRemaining < 60 ? 'bg-danger text-white' : 'bg-medium-gray text-text-primary'}
            pixel-borders-thin
          `}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="w-full bg-dark-gray pixel-borders-thin h-4">
          <div 
            className="bg-clinical h-4 transition-all duration-300" 
            style={{ width: `${Object.keys(answers).length / questions.length * 100}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-text-secondary flex justify-between font-pixel">
          <span>Question {activeQuestion + 1} of {questions.length}</span>
          <span>{Object.keys(answers).length} answered</span>
        </div>
      </div>
      
      {/* Current question */}
      <div key={currentQuestion.id} className="bg-surface-dark p-6 pixel-borders mb-6">
        <PixelText className="text-lg text-text-primary mb-4">{currentQuestion.text}</PixelText>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option: Option) => {
            const isEliminatedOption = eliminatedOptions?.includes(option.id);
            const isSelected = answers[currentQuestion.id] === option.id;
            
            return (
              <label 
                key={option.id}
                className={`
                  block p-3 cursor-pointer transition-all duration-200
                  ${isSelected ? 'bg-clinical/30 pixel-borders' : 'bg-surface pixel-borders-thin'}
                  ${isEliminatedOption ? 'opacity-50 line-through' : ''}
                `}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    className="mt-1 mr-3"
                    disabled={isEliminatedOption}
                  />
                  <div className="flex-grow">
                    <PixelText className="text-text-primary">{option.text}</PixelText>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <div>
          <PixelButton
            className={`
              mr-2 
              ${activeQuestion > 0 
                ? 'bg-medium-gray text-text-primary hover:bg-light-gray' 
                : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
            `}
            onClick={() => setActiveQuestion(prev => Math.max(0, prev - 1))}
            disabled={activeQuestion === 0}
          >
            Previous
          </PixelButton>
          
          <PixelButton
            className={`
              ${activeQuestion < questions.length - 1
                ? 'bg-medium-gray text-text-primary hover:bg-light-gray' 
                : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
            `}
            onClick={() => setActiveQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={activeQuestion === questions.length - 1}
          >
            Next
          </PixelButton>
        </div>
        
        <div>
          <PixelButton
            className={`
              mr-2
              ${!hintUsed
                ? 'bg-warning text-dark-gray hover:bg-yellow-400' 
                : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
            `}
            onClick={() => useHint()}
            disabled={hintUsed}
          >
            Use Hint
          </PixelButton>
          
          <PixelButton
            className={`
              font-medium
              ${isComplete 
                ? 'bg-clinical text-white hover:bg-clinical-light' 
                : 'bg-dark-gray text-text-secondary cursor-not-allowed'}
            `}
            onClick={handleSubmit}
            disabled={!isComplete}
          >
            Submit All Answers
          </PixelButton>
        </div>
      </div>
    </div>
  );
}