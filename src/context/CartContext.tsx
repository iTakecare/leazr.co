
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/catalog';
import { getProductPrice } from '@/utils/productPricing';
import { toast } from 'sonner';
import { SecureStorage } from '@/utils/secureStorage';
import { Logger } from '@/utils/logger';

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Load cart from SecureStorage on component mount
  useEffect(() => {
    const savedCart = SecureStorage.get('itakecare-cart');
    if (savedCart) {
      try {
        // Validate prices in loaded cart items
        const validatedCart = savedCart.map((item: CartItem) => {
          let validPrice: number;
          
          if (typeof item.product.monthly_price === 'number') {
            validPrice = item.product.monthly_price;
          } else if (typeof item.product.monthly_price === 'string') {
            validPrice = parseFloat(item.product.monthly_price);
          } else {
            // Look for price in other fields if monthly_price is not available
            if (typeof item.product.price === 'number') {
              validPrice = item.product.price;
            } else if (typeof item.product.regularPrice === 'string' || typeof item.product.regularPrice === 'number') {
              validPrice = parseFloat(String(item.product.regularPrice));
            } else {
              validPrice = 0;
            }
          }
          
          // If the price is not a valid number, set it to 0
          if (isNaN(validPrice)) validPrice = 0;
          
          Logger.debug(`CartContext: Validating price for ${item.product.name}: ${validPrice}`);
          
          return {
            ...item,
            product: {
              ...item.product,
              monthly_price: validPrice
            }
          };
        });
        
        setItems(validatedCart);
      } catch (error) {
        Logger.error('Failed to parse cart from storage', error);
      }
    }
  }, []);
  
  // Save cart to SecureStorage whenever it changes
  useEffect(() => {
    SecureStorage.set('itakecare-cart', items);
  }, [items]);
  
  const addToCart = (newItem: CartItem) => {
    // Ensure we're making a deep copy of the product to avoid reference issues
    const productToAdd = JSON.parse(JSON.stringify(newItem.product));
    
    // Use centralized pricing logic
    const priceData = getProductPrice(productToAdd, newItem.selectedOptions);
    
    // Update the product with the validated prices
    productToAdd.monthly_price = priceData.monthlyPrice;
    if (priceData.purchasePrice > 0) {
      productToAdd.currentPrice = priceData.purchasePrice;
    }
    
    Logger.debug(`CartContext: Setting prices for ${productToAdd.name}: monthly=${priceData.monthlyPrice}, purchase=${priceData.purchasePrice}`);
    
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
        
        // Log the product and price being added
        Logger.debug('Adding to cart product with details:', {
          id: productToAdd.id,
          name: productToAdd.name,
          price: priceData.monthlyPrice,
          quantity: newItem.quantity
        });
        
        return [...prevItems, {
          ...newItem,
          product: productToAdd
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
  
  // Calculate the cart total using centralized pricing logic
  const cartTotal = items.reduce((total, item) => {
    const priceData = getProductPrice(item.product, item.selectedOptions);
    const subtotal = priceData.monthlyPrice * item.quantity;
    
    // Log detailed information about each item in cart total calculation
    Logger.debug(`Cart total calculation - Item: ${item.product.name}, Monthly Price: ${priceData.monthlyPrice}, Quantity: ${item.quantity}, Subtotal: ${subtotal}`);
    
    return total + subtotal;
  }, 0);
  
  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal
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
