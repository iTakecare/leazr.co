
import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { toast } from "sonner";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedAttributes?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, selectedAttributes?: Record<string, string>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Charger les données du panier depuis le localStorage au démarrage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error("Erreur lors du chargement du panier:", error);
      }
    }
  }, []);

  // Sauvegarder les données du panier dans le localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number, selectedAttributes?: Record<string, string>) => {
    setItems((prevItems) => {
      // Vérifier si le produit est déjà dans le panier (même ID et mêmes attributs)
      const existingItemIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && 
        JSON.stringify(item.selectedAttributes) === JSON.stringify(selectedAttributes)
      );

      // Si le produit existe, mettre à jour la quantité
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        toast.success("Quantité mise à jour dans votre panier");
        return updatedItems;
      }

      // Sinon, ajouter le nouveau produit
      toast.success("Produit ajouté à votre panier");
      return [...prevItems, { product, quantity, selectedAttributes }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
    toast.info("Produit retiré du panier");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prevItems) => 
      prevItems.map((item) => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.info("Panier vidé");
  };

  const getTotalItems = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => {
      const price = item.product.monthly_price || 0;
      return total + price * item.quantity;
    }, 0);
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
        getTotalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
