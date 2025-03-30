'use client';
import { useState } from 'react';
import { useChallengeStore } from '../../store/challengeStore';

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  if (!currentChallenge) return null;
  
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
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
    
    const percentCorrect = (correctAnswers / totalQuestions) * 100;
    
    // Determine grade based on percentage
    let grade: 'S' | 'A' | 'B' | 'C';
    if (percentCorrect === 100) grade = 'S';
    else if (percentCorrect >= 80) grade = 'A';
    else if (percentCorrect >= 60) grade = 'B';
    else grade = 'C';
    
    completeChallenge(grade);
  };
  
  const questions = currentChallenge.content.questions as Question[];
  const isComplete = questions.every((q: Question) => answers[q.id]);
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-blue-50 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        {currentChallenge.content.title}
      </h2>
      
      <div className="space-y-8">
        {questions.map((question: Question) => (
          <div key={question.id} className="bg-white p-4 rounded border border-blue-200">
            <h3 className="text-lg font-medium mb-3">{question.text}</h3>
            
            <div className="space-y-2">
              {question.options.map((option: Option) => (
                <label 
                  key={option.id}
                  className={`
                    block p-2 rounded cursor-pointer
                    ${answers[question.id] === option.id ? 'bg-blue-100 border-blue-400' : 'border border-gray-200'}
                  `}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => handleAnswerSelect(question.id, option.id)}
                    className="mr-2"
                  />
                  {option.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <button
          className={`
            px-6 py-2 rounded
            ${isComplete 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          `}
          onClick={handleSubmit}
          disabled={!isComplete}
        >
          Submit Answers
        </button>
      </div>
    </div>
  );
}