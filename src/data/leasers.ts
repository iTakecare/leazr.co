
export const defaultLeasers = [
  {
    id: "grenke",
    name: "Grenke",
    logo_url: null,
    ranges: [
      { id: "1", min: 500, max: 2500, coefficient: 3.64 },
      { id: "2", min: 2500.01, max: 5000, coefficient: 3.28 },
      { id: "3", min: 5000.01, max: 12500, coefficient: 3.18 },
      { id: "4", min: 12500.01, max: 25000, coefficient: 3.17 },
      { id: "5", min: 25000.01, max: 50000, coefficient: 3.16 }
    ]
  }
];
