
import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types/catalog";

// Type pour un article dans le panier
export type CartItem = {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string>;
  duration?: number;
};

// Interface du contexte du panier
interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getItemQuantity: (productId: string) => number;
  showAnimation: boolean;
  setShowAnimation: (show: boolean) => void;
}

// Création du contexte avec une valeur par défaut
const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalItems: () => 0,
  getItemQuantity: () => 0,
  showAnimation: false,
  setShowAnimation: () => {},
});

// Hook personnalisé pour utiliser le contexte
export const useCart = () => useContext(CartContext);

// Clé pour le stockage local
const CART_STORAGE_KEY = "itakecare_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  
  // Charger le panier depuis le stockage local au démarrage
  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error("Erreur lors du chargement du panier:", error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
  }, []);
  
  // Sauvegarder le panier dans le stockage local à chaque modification
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Ajouter un article au panier
  const addToCart = (item: CartItem) => {
    setItems(prevItems => {
      // Vérifier si le produit est déjà dans le panier
      const existingItemIndex = prevItems.findIndex(
        cartItem => cartItem.product.id === item.product.id
      );

      // Si le produit existe déjà, mettre à jour la quantité
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += item.quantity;
        return updatedItems;
      }

      // Sinon, ajouter le nouvel article
      return [...prevItems, item];
    });
    
    // Déclencher l'animation
    setShowAnimation(true);
    // Arrêter l'animation après 2 secondes
    setTimeout(() => {
      setShowAnimation(false);
    }, 2000);
  };

  // Supprimer un article du panier
  const removeFromCart = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  // Mettre à jour la quantité d'un article
  const updateQuantity = (productId: string, quantity: number) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Vider le panier
  const clearCart = () => {
    setItems([]);
  };

  // Obtenir le nombre total d'articles dans le panier
  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };
  
  // Obtenir la quantité d'un article spécifique
  const getItemQuantity = (productId: string) => {
    const item = items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getItemQuantity,
        showAnimation,
        setShowAnimation
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
