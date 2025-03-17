
export interface LeaserRange {
  min: number;
  max: number;
  coefficient: number;
}

export interface Leaser {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  ranges: LeaserRange[];
}
