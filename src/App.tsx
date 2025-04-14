import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from "@/components/theme-provider"
import MainRoutes from './MainRoutes';
import { Toaster } from "@/components/ui/toaster"
import { ClientCartProvider } from './context/ClientCartContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ClientCartProvider>
          <CartProvider>
            <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
              <MainRoutes />
              <Toaster />
            </ThemeProvider>
          </CartProvider>
        </ClientCartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
