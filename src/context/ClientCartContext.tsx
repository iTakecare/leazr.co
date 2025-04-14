
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/catalog';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Définition du type d'élément du panier client
export type ClientCartItem = {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  monthlyPrice?: number;
};

interface ClientCartContextType {
  items: ClientCartItem[];
  addItem: (item: ClientCartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isInCart: (productId: string) => boolean;
}

const ClientCartContext = createContext<ClientCartContextType | undefined>(undefined);

export const ClientCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ClientCartItem[]>([]);
  const { user } = useAuth();

  // Charger les éléments du panier depuis le localStorage au démarrage
  useEffect(() => {
    if (user?.id) {
      const savedItems = localStorage.getItem(`client_cart_${user.id}`);
      if (savedItems) {
        try {
          setItems(JSON.parse(savedItems));
        } catch (error) {
          console.error('Erreur lors du chargement du panier client:', error);
        }
      }
    }
  }, [user?.id]);

  // Sauvegarder les éléments du panier dans le localStorage à chaque changement
  useEffect(() => {
    if (user?.id && items.length > 0) {
      localStorage.setItem(`client_cart_${user.id}`, JSON.stringify(items));
    }
  }, [items, user?.id]);

  // Ajouter un produit au panier
  const addItem = (newItem: ClientCartItem) => {
    setItems(prevItems => {
      // Vérifier si le produit est déjà dans le panier
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === newItem.product.id
      );

      if (existingItemIndex !== -1) {
        // Si le produit existe déjà, mettre à jour la quantité
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
          selectedOptions: newItem.selectedOptions || updatedItems[existingItemIndex].selectedOptions
        };
        toast.success("Quantité mise à jour dans votre panier");
        return updatedItems;
      } else {
        // Sinon, ajouter le nouveau produit
        toast.success("Produit ajouté à votre panier");
        return [...prevItems, newItem];
      }
    });
  };

  // Supprimer un produit du panier
  const removeItem = (productId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.product.id !== productId);
      
      // Si le panier est vide après la suppression, effacer du localStorage
      if (newItems.length === 0 && user?.id) {
        localStorage.removeItem(`client_cart_${user.id}`);
      }
      
      toast.info("Produit retiré de votre panier");
      return newItems;
    });
  };

  // Mettre à jour la quantité d'un produit
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  // Vider le panier
  const clearCart = () => {
    setItems([]);
    if (user?.id) {
      localStorage.removeItem(`client_cart_${user.id}`);
    }
  };

  // Obtenir le nombre total d'articles
  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  // Obtenir le prix total
  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const itemPrice = typeof item.monthlyPrice === 'number' 
        ? item.monthlyPrice 
        : (item.product.monthly_price || 0);
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  // Vérifier si un produit est dans le panier
  const isInCart = (productId: string) => {
    return items.some(item => item.product.id === productId);
  };

  return (
    <ClientCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isInCart
      }}
    >
      {children}
    </ClientCartContext.Provider>
  );
};

export const useClientCart = () => {
  const context = useContext(ClientCartContext);
  if (context === undefined) {
    throw new Error('useClientCart doit être utilisé à l\'intérieur d\'un ClientCartProvider');
  }
  return context;
};
