
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
          
          console.log(`CartContext: Validating price for ${item.product.name}: ${validPrice}`);
          
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
    
    // Ensure the product has a valid numerical price
    let validPrice: number;
    
    // First check if the product already has a monthly_price that is a number
    if (typeof productToAdd.monthly_price === 'number' && !isNaN(productToAdd.monthly_price) && productToAdd.monthly_price > 0) {
      validPrice = productToAdd.monthly_price;
    } 
    // Then check if it's a string that can be converted to a number
    else if (typeof productToAdd.monthly_price === 'string') {
      validPrice = parseFloat(productToAdd.monthly_price);
      if (isNaN(validPrice) || validPrice <= 0) {
        // If monthly_price is invalid, try to get price from selectedVariant or variant_combination_prices
        if (productToAdd.selectedVariant && typeof productToAdd.selectedVariant.monthly_price === 'number' && productToAdd.selectedVariant.monthly_price > 0) {
          validPrice = productToAdd.selectedVariant.monthly_price;
        } else if (productToAdd.currentPrice && !isNaN(productToAdd.currentPrice) && productToAdd.currentPrice > 0) {
          validPrice = productToAdd.currentPrice;
        } else {
          // Fallback to regular price if available
          if (typeof productToAdd.price === 'number' && productToAdd.price > 0) {
            validPrice = productToAdd.price;
          } else {
            validPrice = 0;
          }
        }
      }
    } 
    // If no monthly_price, check for selectedVariant price
    else if (productToAdd.selectedVariant && typeof productToAdd.selectedVariant.monthly_price === 'number' && productToAdd.selectedVariant.monthly_price > 0) {
      validPrice = productToAdd.selectedVariant.monthly_price;
    } 
    // Check for currentPrice from useProductDetails hook
    else if (productToAdd.currentPrice && !isNaN(productToAdd.currentPrice) && productToAdd.currentPrice > 0) {
      validPrice = productToAdd.currentPrice;
    }
    // Fallback to regular price
    else if (typeof productToAdd.price === 'number' && productToAdd.price > 0) {
      validPrice = productToAdd.price;
    } 
    // Last resort - set to 0 if we couldn't find a valid price
    else {
      validPrice = 0;
    }
    
    // If price is still invalid or zero, set a default value for debugging
    if (isNaN(validPrice) || validPrice <= 0) {
      console.warn(`CartContext: Could not find valid price for ${productToAdd.name}`, productToAdd);
      // Set a default monthly price for testing
      validPrice = 39.99;
    }
    
    console.log(`CartContext: Setting final price for ${productToAdd.name}: ${validPrice}`);
    
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
        
        // Log the product and price being added
        console.log('Adding to cart product with details:', {
          id: productToAdd.id,
          name: productToAdd.name,
          price: validPrice,
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
  
  // Calculate the cart total, ensuring we normalize any price values to numbers
  const cartTotal = items.reduce((total, item) => {
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
    
    const subtotal = itemPrice * item.quantity;
    
    // Log detailed information about each item in cart total calculation
    console.log(`Cart total calculation - Item: ${item.product.name}, Raw Price: ${item.product.monthly_price}, Parsed Price: ${itemPrice}, Quantity: ${item.quantity}, Subtotal: ${subtotal}`);
    
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
