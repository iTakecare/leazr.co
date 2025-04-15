
import { v4 as uuidv4 } from 'uuid';

export const defaultLeasers = [
  {
    id: "bf9a7b68-287a-4ed0-8fd0-1f0c3c28f9b8",
    name: "Grenke",
    logo_url: null,
    is_default: true,
    ranges: [
      { id: uuidv4(), min: 500, max: 2500, coefficient: 3.55 },
      { id: uuidv4(), min: 2500.01, max: 5000, coefficient: 3.27 },
      { id: uuidv4(), min: 5000.01, max: 12500, coefficient: 3.18 },
      { id: uuidv4(), min: 12500.01, max: 25000, coefficient: 3.17 },
      { id: uuidv4(), min: 25000.01, max: 50000, coefficient: 3.16 }
    ]
  },
  {
    id: "d2c5b3f9-4e9a-4b5c-8f0c-1e3d5a7b9f6e",
    name: "CréditLease",
    logo_url: null,
    is_default: false,
    ranges: [
      { id: uuidv4(), min: 500, max: 3000, coefficient: 3.45 },
      { id: uuidv4(), min: 3000.01, max: 7500, coefficient: 3.22 },
      { id: uuidv4(), min: 7500.01, max: 15000, coefficient: 3.15 },
      { id: uuidv4(), min: 15000.01, max: 30000, coefficient: 3.10 },
      { id: uuidv4(), min: 30000.01, max: 60000, coefficient: 3.05 }
    ]
  },
  {
    id: "f7a9c3e1-2b6d-4f5b-9c3a-8d5e2f7b1c6a",
    name: "LeasePro",
    logo_url: null,
    is_default: false,
    ranges: [
      { id: uuidv4(), min: 1000, max: 4000, coefficient: 3.40 },
      { id: uuidv4(), min: 4000.01, max: 8000, coefficient: 3.25 },
      { id: uuidv4(), min: 8000.01, max: 16000, coefficient: 3.17 },
      { id: uuidv4(), min: 16000.01, max: 32000, coefficient: 3.12 },
      { id: uuidv4(), min: 32000.01, max: 64000, coefficient: 3.08 }
    ]
  }
];

