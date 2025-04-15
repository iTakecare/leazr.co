
import { Product } from './catalog';
import { Leaser } from './equipment';

export type CartItem = {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  monthlyPrice?: number;
  leaser?: Leaser;
};
