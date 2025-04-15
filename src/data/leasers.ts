
import { v4 as uuidv4 } from 'uuid';

export const defaultLeasers = [
  {
    id: "bf9a7b68-287a-4ed0-8fd0-1f0c3c28f9b8",
    name: "Grenke",
    logo_url: null,
    is_default: true,
    ranges: [
      { id: "75e0d12a-6780-4e9e-a9e4-3c1f5a4f5c49", min: 500, max: 2500, coefficient: 3.55 },
      { id: "d82c5b3f-c230-4eea-a9a2-389d68f5290e", min: 2500.01, max: 5000, coefficient: 3.27 },
      { id: "f91cf0b0-ae3c-489e-b8e5-0e6a7f54cb3b", min: 5000.01, max: 12500, coefficient: 3.18 },
      { id: "c45a9e37-b4aa-4fd6-939e-1d52c850e79d", min: 12500.01, max: 25000, coefficient: 3.17 },
      { id: "91e8d742-37a6-4ec3-933a-29f38d5c9ae9", min: 25000.01, max: 50000, coefficient: 3.16 }
    ]
  }
];
