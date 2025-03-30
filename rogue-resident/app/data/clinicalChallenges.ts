// app/data/clinicalChallenges.ts
export interface ClinicalChallenge {
    id: string;
    title: string;
    description: string;
    patientInfo: string;
    difficulty: 'easy' | 'medium' | 'hard';
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
      difficulty: 'medium',
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
        {
          id: 'q4',
          text: 'Which structure requires the most careful consideration for dose constraints?',
          options: [
            { id: 'o1', text: 'Ipsilateral lung', isCorrect: true },
            { id: 'o2', text: 'Contralateral breast', isCorrect: false },
            { id: 'o3', text: 'Spinal cord', isCorrect: false },
            { id: 'o4', text: 'Contralateral lung', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'prostate-imrt',
      title: 'Prostate IMRT Plan',
      description: 'Evaluate an IMRT plan for a prostate cancer patient',
      patientInfo: '67-year-old male with intermediate-risk prostate cancer',
      difficulty: 'medium',
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
        {
          id: 'q4',
          text: 'What is the standard prescription dose for intermediate-risk prostate cancer?',
          options: [
            { id: 'o1', text: '60 Gy in 20 fractions', isCorrect: false },
            { id: 'o2', text: '70 Gy in 28 fractions', isCorrect: false },
            { id: 'o3', text: '78 Gy in 39 fractions', isCorrect: true },
            { id: 'o4', text: '85 Gy in 40 fractions', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'pediatric-brain',
      title: 'Pediatric Brain Treatment',
      description: 'Plan a treatment for a pediatric patient with a brain tumor',
      patientInfo: '8-year-old male with medulloblastoma in the posterior fossa',
      difficulty: 'hard',
      questions: [
        {
          id: 'q1',
          text: 'Which treatment approach is most appropriate for this case?',
          options: [
            { id: 'o1', text: 'Craniospinal irradiation with boost to posterior fossa', isCorrect: true },
            { id: 'o2', text: 'Whole brain radiation only', isCorrect: false },
            { id: 'o3', text: 'Stereotactic radiosurgery alone', isCorrect: false },
            { id: 'o4', text: 'Posterior fossa radiation only', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What is a significant concern when treating pediatric patients with radiation?',
          options: [
            { id: 'o1', text: 'Development of secondary malignancies', isCorrect: false },
            { id: 'o2', text: 'Growth and development effects', isCorrect: false },
            { id: 'o3', text: 'Neurocognitive impact', isCorrect: false },
            { id: 'o4', text: 'All of the above', isCorrect: true },
          ],
        },
        {
          id: 'q3',
          text: 'What additional imaging would be most helpful for treatment planning?',
          options: [
            { id: 'o1', text: 'PET scan', isCorrect: false },
            { id: 'o2', text: 'MRI with contrast', isCorrect: true },
            { id: 'o3', text: 'Bone scan', isCorrect: false },
            { id: 'o4', text: 'Ultrasound', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What dose is typically prescribed for the boost to the posterior fossa?',
          options: [
            { id: 'o1', text: '15-20 Gy', isCorrect: false },
            { id: 'o2', text: '18-23.4 Gy', isCorrect: true },
            { id: 'o3', text: '30-36 Gy', isCorrect: false },
            { id: 'o4', text: '50-54 Gy', isCorrect: false },
          ],
        },
        {
          id: 'q5',
          text: 'Which structure is most critical to spare during craniospinal irradiation?',
          options: [
            { id: 'o1', text: 'Cochlea', isCorrect: false },
            { id: 'o2', text: 'Pituitary gland', isCorrect: false },
            { id: 'o3', text: 'Thyroid gland', isCorrect: false },
            { id: 'o4', text: 'All of the above', isCorrect: true },
          ],
        },
      ],
    },
    {
      id: 'lung-sbrt',
      title: 'Lung SBRT Planning',
      description: 'Design a stereotactic body radiation therapy plan for early-stage lung cancer',
      patientInfo: '72-year-old female with stage I NSCLC in right upper lobe, medically inoperable',
      difficulty: 'hard',
      questions: [
        {
          id: 'q1',
          text: 'What imaging technique is essential for accurate target delineation in lung SBRT?',
          options: [
            { id: 'o1', text: '4D-CT to account for respiratory motion', isCorrect: true },
            { id: 'o2', text: 'MRI only', isCorrect: false },
            { id: 'o3', text: 'Standard CT with oral contrast', isCorrect: false },
            { id: 'o4', text: 'Ultrasound-guided imaging', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What is a typical dose regimen for lung SBRT?',
          options: [
            { id: 'o1', text: '20 Gy in 5 fractions', isCorrect: false },
            { id: 'o2', text: '45 Gy in 15 fractions', isCorrect: false },
            { id: 'o3', text: '54 Gy in 3 fractions', isCorrect: true },
            { id: 'o4', text: '66 Gy in 33 fractions', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'Which organ at risk has the strictest dose constraint in lung SBRT?',
          options: [
            { id: 'o1', text: 'Heart', isCorrect: false },
            { id: 'o2', text: 'Spinal cord', isCorrect: true },
            { id: 'o3', text: 'Contralateral lung', isCorrect: false },
            { id: 'o4', text: 'Ribs', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What treatment delivery technique is most appropriate for lung SBRT?',
          options: [
            { id: 'o1', text: '3D Conformal with multiple beams', isCorrect: false },
            { id: 'o2', text: 'VMAT or IMRT', isCorrect: true },
            { id: 'o3', text: 'Single anterior field', isCorrect: false },
            { id: 'o4', text: 'Electron therapy', isCorrect: false },
          ],
        },
        {
          id: 'q5',
          text: 'Which patient immobilization device is typically used for lung SBRT?',
          options: [
            { id: 'o1', text: 'Custom thermoplastic mask', isCorrect: false },
            { id: 'o2', text: 'Body frame with abdominal compression', isCorrect: true },
            { id: 'o3', text: 'Standard headrest only', isCorrect: false },
            { id: 'o4', text: 'No immobilization is needed', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'head-neck-imrt',
      title: 'Head & Neck IMRT Plan',
      description: 'Evaluate an IMRT plan for a head and neck cancer patient',
      patientInfo: '61-year-old male with stage III squamous cell carcinoma of the oropharynx',
      difficulty: 'hard',
      questions: [
        {
          id: 'q1',
          text: 'Which of these structures should receive the highest priority for sparing?',
          options: [
            { id: 'o1', text: 'Parotid glands', isCorrect: true },
            { id: 'o2', text: 'Masseter muscles', isCorrect: false },
            { id: 'o3', text: 'Submandibular glands', isCorrect: false },
            { id: 'o4', text: 'Temporomandibular joints', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What is the standard prescription dose for definitive treatment of locally advanced head and neck cancer?',
          options: [
            { id: 'o1', text: '50 Gy in 25 fractions', isCorrect: false },
            { id: 'o2', text: '60 Gy in 30 fractions', isCorrect: false },
            { id: 'o3', text: '70 Gy in 35 fractions', isCorrect: true },
            { id: 'o4', text: '80 Gy in 40 fractions', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What approach is typically used for treating both primary tumor and nodal volumes?',
          options: [
            { id: 'o1', text: 'Sequential boost technique', isCorrect: false },
            { id: 'o2', text: 'Simultaneous integrated boost (SIB)', isCorrect: true },
            { id: 'o3', text: 'Alternating treatment fields', isCorrect: false },
            { id: 'o4', text: 'Split-course regimen', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What is a typical dose constraint for the parotid gland to minimize xerostomia?',
          options: [
            { id: 'o1', text: 'Mean dose < 26 Gy', isCorrect: true },
            { id: 'o2', text: 'Mean dose < 45 Gy', isCorrect: false },
            { id: 'o3', text: 'Maximum dose < 30 Gy', isCorrect: false },
            { id: 'o4', text: 'V20 < 50%', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'electron-treatment',
      title: 'Electron Therapy Planning',
      description: 'Plan an electron beam treatment for a superficial lesion',
      patientInfo: '45-year-old female with basal cell carcinoma on the nose',
      difficulty: 'easy',
      questions: [
        {
          id: 'q1',
          text: 'What is the most appropriate electron energy for treating a lesion with 1 cm depth?',
          options: [
            { id: 'o1', text: '6 MeV', isCorrect: true },
            { id: 'o2', text: '12 MeV', isCorrect: false },
            { id: 'o3', text: '18 MeV', isCorrect: false },
            { id: 'o4', text: '20 MeV', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What rule of thumb is used for the practical range of electrons?',
          options: [
            { id: 'o1', text: 'Energy (MeV) / 2 gives range in cm', isCorrect: false },
            { id: 'o2', text: 'Energy (MeV) / 3 gives range in cm', isCorrect: false },
            { id: 'o3', text: 'Energy (MeV) × 0.5 gives range in cm', isCorrect: true },
            { id: 'o4', text: 'Energy (MeV) × 2 gives range in cm', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What is typically used to create a customized treatment field for electron therapy?',
          options: [
            { id: 'o1', text: 'Lead cutout', isCorrect: true },
            { id: 'o2', text: 'Multileaf collimator', isCorrect: false },
            { id: 'o3', text: 'Wedge filter', isCorrect: false },
            { id: 'o4', text: 'Compensator', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What is the typical prescription dose for basal cell carcinoma?',
          options: [
            { id: 'o1', text: '50-60 Gy in 25-30 fractions', isCorrect: false },
            { id: 'o2', text: '45-50 Gy in 15-20 fractions', isCorrect: true },
            { id: 'o3', text: '30 Gy in 5 fractions', isCorrect: false },
            { id: 'o4', text: '20 Gy in 1 fraction', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'total-body-irradiation',
      title: 'Total Body Irradiation',
      description: 'Plan a total body irradiation treatment for bone marrow transplant',
      patientInfo: '35-year-old male with acute myeloid leukemia preparing for allogeneic transplant',
      difficulty: 'medium',
      questions: [
        {
          id: 'q1',
          text: 'What is the typical dose and fractionation scheme for myeloablative TBI?',
          options: [
            { id: 'o1', text: '12 Gy in 6 fractions over 3 days', isCorrect: true },
            { id: 'o2', text: '20 Gy in 10 fractions over 5 days', isCorrect: false },
            { id: 'o3', text: '8 Gy in a single fraction', isCorrect: false },
            { id: 'o4', text: '4 Gy in 2 fractions in a single day', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'Which organ is most commonly shielded during TBI?',
          options: [
            { id: 'o1', text: 'Brain', isCorrect: false },
            { id: 'o2', text: 'Lungs', isCorrect: true },
            { id: 'o3', text: 'Liver', isCorrect: false },
            { id: 'o4', text: 'Kidneys', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What treatment setup is typically used for TBI?',
          options: [
            { id: 'o1', text: 'Patient lying on treatment couch', isCorrect: false },
            { id: 'o2', text: 'Patient standing with extended SSD', isCorrect: true },
            { id: 'o3', text: 'Patient in prone position', isCorrect: false },
            { id: 'o4', text: 'Multiple field IMRT', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What is the primary late toxicity concern with TBI?',
          options: [
            { id: 'o1', text: 'Pneumonitis', isCorrect: true },
            { id: 'o2', text: 'Liver failure', isCorrect: false },
            { id: 'o3', text: 'Renal dysfunction', isCorrect: false },
            { id: 'o4', text: 'Myelitis', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'brachytherapy-plan',
      title: 'Brachytherapy Planning',
      description: 'Develop a plan for high-dose-rate brachytherapy',
      patientInfo: '58-year-old female with cervical cancer, FIGO stage IIB',
      difficulty: 'medium',
      questions: [
        {
          id: 'q1',
          text: 'What isotope is commonly used for HDR brachytherapy?',
          options: [
            { id: 'o1', text: 'Iodine-125', isCorrect: false },
            { id: 'o2', text: 'Iridium-192', isCorrect: true },
            { id: 'o3', text: 'Cobalt-60', isCorrect: false },
            { id: 'o4', text: 'Cesium-137', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'What imaging modality is recommended for brachytherapy planning?',
          options: [
            { id: 'o1', text: 'MRI', isCorrect: true },
            { id: 'o2', text: 'CT only', isCorrect: false },
            { id: 'o3', text: 'Ultrasound only', isCorrect: false },
            { id: 'o4', text: 'Plain radiographs', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'What dose is typically prescribed to the HR-CTV for cervical cancer?',
          options: [
            { id: 'o1', text: 'Total EQD2 of 80-90 Gy', isCorrect: true },
            { id: 'o2', text: 'Total EQD2 of 50-60 Gy', isCorrect: false },
            { id: 'o3', text: 'Total EQD2 of 100-110 Gy', isCorrect: false },
            { id: 'o4', text: 'Total EQD2 of 35-45 Gy', isCorrect: false },
          ],
        },
        {
          id: 'q4',
          text: 'What is an important dose constraint for the rectum in gynecological brachytherapy?',
          options: [
            { id: 'o1', text: 'D2cc < 70-75 Gy EQD2', isCorrect: true },
            { id: 'o2', text: 'D2cc < 100 Gy EQD2', isCorrect: false },
            { id: 'o3', text: 'Mean dose < 45 Gy EQD2', isCorrect: false },
            { id: 'o4', text: 'V70 < 15%', isCorrect: false },
          ],
        },
      ],
    }
  ];