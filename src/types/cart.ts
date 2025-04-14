
import { Product } from './catalog';

export type CartItem = {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  monthlyPrice?: number;
};
