
import { v4 as uuidv4 } from 'uuid';

// Valeurs de fallback avec un leaser par défaut
export const defaultLeasers = [
  {
    id: 'default-leaser',
    name: 'Leaser par défaut',
    ranges: [
      {
        id: 'default-range-1',
        min: 0,
        max: 5000,
        coefficient: 3.55,
        duration_coefficients: [
          { duration_months: 12, coefficient: 8.5 },
          { duration_months: 24, coefficient: 4.8 },
          { duration_months: 36, coefficient: 3.55 },
          { duration_months: 48, coefficient: 2.9 },
          { duration_months: 60, coefficient: 2.5 }
        ]
      },
      {
        id: 'default-range-2',
        min: 5001,
        max: 15000,
        coefficient: 3.35,
        duration_coefficients: [
          { duration_months: 12, coefficient: 8.3 },
          { duration_months: 24, coefficient: 4.6 },
          { duration_months: 36, coefficient: 3.35 },
          { duration_months: 48, coefficient: 2.7 },
          { duration_months: 60, coefficient: 2.3 }
        ]
      },
      {
        id: 'default-range-3',
        min: 15001,
        max: 999999,
        coefficient: 3.15,
        duration_coefficients: [
          { duration_months: 12, coefficient: 8.1 },
          { duration_months: 24, coefficient: 4.4 },
          { duration_months: 36, coefficient: 3.15 },
          { duration_months: 48, coefficient: 2.5 },
          { duration_months: 60, coefficient: 2.1 }
        ]
      }
    ]
  }
];
