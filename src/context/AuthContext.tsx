
import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "partner";
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // For demo purposes, we'll use a mock login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // This would be replaced with a real API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Mock user data for demo
      const userData: User = {
        id: "user-123",
        email,
        name: email.split("@")[0],
        role: email.includes("admin") ? "admin" : "partner",
        first_name: email.split("@")[0],
        last_name: "User",
        avatar_url: null
      };
      
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Connexion réussie");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Échec de la connexion");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.success("Déconnexion réussie");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
