export interface ClinicalChallenge {
    id: string;
    title: string;
    description: string;
    patientInfo: string;
    questions: {
      id: string;
      text: string;
      options: {
        id: string;
        text: string;
        isCorrect: boolean;
      }[];
    }[];
  }
  
  export const clinicalChallenges: ClinicalChallenge[] = [
    {
      id: 'breast-cancer-plan',
      title: 'Breast Cancer Treatment Plan',
      description: 'Evaluate a treatment plan for a patient with breast cancer',
      patientInfo: '54-year-old female with Stage II invasive ductal carcinoma of the left breast',
      questions: [
        {
          id: 'q1',
          text: 'Which imaging modality would be most appropriate for treatment planning?',
          options: [
            { id: 'o1', text: 'CT with contrast', isCorrect: false },
            { id: 'o2', text: 'CT without contrast', isCorrect: true },
            { id: 'o3', text: 'MRI only', isCorrect: false },
            { id: 'o4', text: 'PET scan', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What is the most appropriate treatment technique?',
          options: [
            { id: 'o1', text: '3D Conformal', isCorrect: false },
            { id: 'o2', text: 'IMRT', isCorrect: true },
            { id: 'o3', text: 'VMAT', isCorrect: false },
            { id: 'o4', text: 'SBRT', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What dose fractionation scheme is typically recommended?',
          options: [
            { id: 'o1', text: '50 Gy in 25 fractions', isCorrect: true },
            { id: 'o2', text: '60 Gy in 30 fractions', isCorrect: false },
            { id: 'o3', text: '30 Gy in 5 fractions', isCorrect: false },
            { id: 'o4', text: '70 Gy in 35 fractions', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'prostate-imrt',
      title: 'Prostate IMRT Plan',
      description: 'Evaluate an IMRT plan for a prostate cancer patient',
      patientInfo: '67-year-old male with intermediate-risk prostate cancer',
      questions: [
        {
          id: 'q1',
          text: 'Which organs at risk should be contoured for this treatment?',
          options: [
            { id: 'o1', text: 'Bladder, rectum, femoral heads', isCorrect: true },
            { id: 'o2', text: 'Bladder, rectum, liver', isCorrect: false },
            { id: 'o3', text: 'Rectum, heart, lungs', isCorrect: false },
            { id: 'o4', text: 'Bladder, kidneys, spinal cord', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What is a typical PTV margin for prostate IMRT?',
          options: [
            { id: 'o1', text: '0.5 cm', isCorrect: false },
            { id: 'o2', text: '0.7-1.0 cm', isCorrect: true },
            { id: 'o3', text: '1.5-2.0 cm', isCorrect: false },
            { id: 'o4', text: '3.0 cm', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What dose constraint is typically applied to the rectum?',
          options: [
            { id: 'o1', text: 'V70Gy < 15%', isCorrect: true },
            { id: 'o2', text: 'V50Gy < 50%', isCorrect: false },
            { id: 'o3', text: 'Mean dose < 45 Gy', isCorrect: false },
            { id: 'o4', text: 'Maximum dose < 60 Gy', isCorrect: false },
          ],
        },
      ],
    }
  ];