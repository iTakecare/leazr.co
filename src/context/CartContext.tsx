
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/catalog';
import { toast } from 'sonner';

type CartItem = {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('itakecare-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        
        // Validate prices in loaded cart items
        const validatedCart = parsedCart.map((item: CartItem) => {
          return {
            ...item,
            product: {
              ...item.product,
              monthly_price: typeof item.product.monthly_price === 'number' ? 
                            item.product.monthly_price : 
                            parseFloat(String(item.product.monthly_price) || '0')
            }
          };
        });
        
        setItems(validatedCart);
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('itakecare-cart', JSON.stringify(items));
  }, [items]);
  
  const addToCart = (newItem: CartItem) => {
    console.log("CartContext: Adding item to cart:", {
      product: newItem.product.name,
      price: newItem.product.monthly_price,
      rawPrice: String(newItem.product.monthly_price),
      priceType: typeof newItem.product.monthly_price
    });
    
    // Ensure the product has a valid numerical price
    const validPrice = typeof newItem.product.monthly_price === 'number' ? 
                      newItem.product.monthly_price : 
                      parseFloat(String(newItem.product.monthly_price) || '0');
    
    // If price is NaN (not a valid number), set it to 0
    const normalizedPrice = isNaN(validPrice) ? 0 : validPrice;
    
    console.log(`CartContext: Normalized price for ${newItem.product.name}: ${normalizedPrice}`);
    
    setItems(prevItems => {
      // Check if this product is already in the cart
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === newItem.product.id
      );
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity
        };
        
        toast.success('Quantité mise à jour dans le panier');
        return updatedItems;
      } else {
        // Add new item with validated price
        toast.success('Produit ajouté au panier');
        return [...prevItems, {
          ...newItem,
          product: {
            ...newItem.product,
            monthly_price: normalizedPrice
          }
        }];
      }
    });
  };
  
  const removeFromCart = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
    toast.info('Produit retiré du panier');
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: Math.max(1, quantity) } 
          : item
      )
    );
  };
  
  const clearCart = () => {
    setItems([]);
    toast.info('Panier vidé');
  };
  
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate the cart total, ensuring we normalize any price values to numbers
  const cartTotal = items.reduce((total, item) => {
    // Ensure we're getting a valid number for the monthly_price
    const rawPrice = item.product.monthly_price;
    const priceType = typeof rawPrice;
    
    let itemPrice: number;
    if (typeof rawPrice === 'number') {
      itemPrice = rawPrice;
    } else if (typeof rawPrice === 'string') {
      itemPrice = parseFloat(rawPrice);
      if (isNaN(itemPrice)) {
        console.warn(`Invalid string price: "${rawPrice}" converted to 0`);
        itemPrice = 0;
      }
    } else {
      console.warn(`Unknown price type: ${priceType}, value: ${rawPrice}, converted to 0`);
      itemPrice = 0;
    }
    
    const itemTotal = itemPrice * item.quantity;
    
    console.log(`Cart total calculation - Item: ${item.product.name}, Raw Price: ${rawPrice}, Parsed Price: ${itemPrice}, Price Type: ${priceType}, Quantity: ${item.quantity}, Subtotal: ${itemTotal}`);
    
    return total + itemTotal;
  }, 0);
  
  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen
  };
  
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
