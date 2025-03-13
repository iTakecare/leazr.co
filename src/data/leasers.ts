
import { v4 as uuidv4 } from 'uuid';

export const defaultLeasers = [
  {
    id: uuidv4(), // Utiliser un UUID valide au lieu d'une chaîne "grenke"
    name: "Grenke",
    logo_url: null,
    ranges: [
      { id: uuidv4(), min: 500, max: 2500, coefficient: 3.64 },
      { id: uuidv4(), min: 2500.01, max: 5000, coefficient: 3.28 },
      { id: uuidv4(), min: 5000.01, max: 12500, coefficient: 3.18 },
      { id: uuidv4(), min: 12500.01, max: 25000, coefficient: 3.17 },
      { id: uuidv4(), min: 25000.01, max: 50000, coefficient: 3.16 }
    ]
  }
];
