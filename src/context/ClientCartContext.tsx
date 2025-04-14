
import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { CartItem } from "@/types/cart";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ClientCartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, duration: number, selectedOptions?: Record<string, string>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDuration: (productId: string, duration: number) => void;
  clearCart: () => void;
  itemCount: number;
  getTotalPrice: () => number;
  getMonthlyPrice: () => number;
}

const ClientCartContext = createContext<ClientCartContextType | undefined>(undefined);

export const ClientCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Load cart from localStorage on component mount
  useEffect(() => {
    if (user?.id) {
      const savedCart = localStorage.getItem(`client-cart-${user.id}`);
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (error) {
          console.error("Error parsing saved cart:", error);
        }
      }
    }
  }, [user?.id]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (user?.id && items) {
      localStorage.setItem(`client-cart-${user.id}`, JSON.stringify(items));
    }
  }, [items, user?.id]);

  const addItem = (
    product: Product, 
    quantity: number, 
    duration: number,
    selectedOptions?: Record<string, string>
  ) => {
    setItems(currentItems => {
      // Check if product already exists in cart
      const existingItemIndex = currentItems.findIndex(
        item => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const newItems = [...currentItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity,
          selectedOptions: selectedOptions || newItems[existingItemIndex].selectedOptions
        };
        toast.success("Quantité mise à jour dans le panier");
        return newItems;
      } else {
        // Add new item
        toast.success("Produit ajouté au panier");
        return [...currentItems, { product, quantity, duration, selectedOptions }];
      }
    });
  };

  const removeItem = (productId: string) => {
    setItems(currentItems => 
      currentItems.filter(item => item.product.id !== productId)
    );
    toast.info("Produit retiré du panier");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(currentItems => 
      currentItems.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateDuration = (productId: string, duration: number) => {
    setItems(currentItems => 
      currentItems.map(item => 
        item.product.id === productId ? { ...item, duration } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    if (user?.id) {
      localStorage.removeItem(`client-cart-${user.id}`);
    }
    toast.info("Panier vidé");
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const getTotalPrice = () => {
    return items.reduce((sum, item) => {
      const itemPrice = (
        item.product.price ? 
        Number(item.product.price) * item.quantity : 
        0
      );
      return sum + itemPrice;
    }, 0);
  };

  const getMonthlyPrice = () => {
    return items.reduce((sum, item) => {
      // Calculate monthly price based on total price and duration
      const totalItemPrice = item.product.price ? Number(item.product.price) * item.quantity : 0;
      const monthlyItemPrice = item.duration > 0 ? totalItemPrice / item.duration : 0;
      return sum + monthlyItemPrice;
    }, 0);
  };

  return (
    <ClientCartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateDuration,
      clearCart,
      itemCount,
      getTotalPrice,
      getMonthlyPrice
    }}>
      {children}
    </ClientCartContext.Provider>
  );
};

export const useClientCart = (): ClientCartContextType => {
  const context = useContext(ClientCartContext);
  if (context === undefined) {
    throw new Error("useClientCart must be used within a ClientCartProvider");
  }
  return context;
};
