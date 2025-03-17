
export interface Leaser {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  ranges: LeaserRange[];
}

export interface LeaserRange {
  min: number;
  max: number;
  coefficient: number;
}
