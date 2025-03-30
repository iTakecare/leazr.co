
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('itakecare-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        
        // Validate prices in loaded cart items
        const validatedCart = parsedCart.map((item: CartItem) => {
          let validPrice: number;
          
          if (typeof item.product.monthly_price === 'number') {
            validPrice = item.product.monthly_price;
          } else if (typeof item.product.monthly_price === 'string') {
            validPrice = parseFloat(item.product.monthly_price);
          } else {
            validPrice = 0;
          }
          
          // If the price is not a valid number, set it to 0
          if (isNaN(validPrice)) validPrice = 0;
          
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
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('itakecare-cart', JSON.stringify(items));
  }, [items]);
  
  const addToCart = (newItem: CartItem) => {
    // Ensure we're making a deep copy of the product to avoid reference issues
    const productToAdd = JSON.parse(JSON.stringify(newItem.product));
    
    console.log("CartContext: Adding item to cart:", {
      product: productToAdd.name,
      originalPrice: productToAdd.monthly_price,
      priceType: typeof productToAdd.monthly_price
    });
    
    // Ensure the product has a valid numerical price
    let validPrice: number;
    
    if (typeof productToAdd.monthly_price === 'number') {
      validPrice = productToAdd.monthly_price;
    } else if (typeof productToAdd.monthly_price === 'string') {
      validPrice = parseFloat(productToAdd.monthly_price);
    } else {
      validPrice = 0;
    }
    
    // If price is NaN (not a valid number), set it to 0
    if (isNaN(validPrice)) validPrice = 0;
    
    console.log(`CartContext: Normalized price for ${productToAdd.name}: ${validPrice}`);
    
    // Update the product with the validated price
    productToAdd.monthly_price = validPrice;
    
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
  
  // Calculate the cart total, ensuring we normalize any price values to numbers
  const cartTotal = items.reduce((total, item) => {
    // Log detailed information about the item for debugging
    console.log(`Cart total calculation - Item: ${item.product.name}, Raw Price: ${item.product.monthly_price}, Parsed Price: ${typeof item.product.monthly_price === 'number' ? item.product.monthly_price : parseFloat(String(item.product.monthly_price) || '0')}, Quantity: ${item.quantity}, Subtotal: ${(typeof item.product.monthly_price === 'number' ? item.product.monthly_price : parseFloat(String(item.product.monthly_price) || '0')) * item.quantity}`);
    
    // Always ensure we're using a valid number for calculations
    let itemPrice: number;
    
    if (typeof item.product.monthly_price === 'number') {
      itemPrice = item.product.monthly_price;
    } else if (typeof item.product.monthly_price === 'string') {
      itemPrice = parseFloat(item.product.monthly_price);
      if (isNaN(itemPrice)) {
        itemPrice = 0;
      }
    } else {
      itemPrice = 0;
    }
    
    return total + (itemPrice * item.quantity);
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
