
import { Product } from './catalog';

export type CartItem = {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  // Add the properties needed for cart items
  monthlyPrice?: number;
  totalPrice?: number;
};
