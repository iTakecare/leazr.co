
import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { toast } from "sonner";

type CartItem = {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string>;
  duration?: number;
};

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartAnimating: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  
  // Load cart from localStorage on initial load
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('itakecare-cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('itakecare-cart', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [items]);
  
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const addToCart = (newItem: CartItem) => {
    setItems(prevItems => {
      // Check if product already exists in cart
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === newItem.product.id
      );
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, newItem];
      }
    });
    
    // Trigger animation
    setIsCartAnimating(true);
    setTimeout(() => setIsCartAnimating(false), 1000);
    
    toast.success(`${newItem.product.name} ajouté au panier`);
  };
  
  const removeFromCart = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };
  
  const clearCart = () => {
    setItems([]);
  };
  
  return (
    <CartContext.Provider 
      value={{ 
        items, 
        totalItems, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        isCartAnimating 
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
