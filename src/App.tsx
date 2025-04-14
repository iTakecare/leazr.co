
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from "./components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ClientCartProvider } from './context/ClientCartContext';
import ClientRoutes from './components/layout/ClientRoutes';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ClientCartProvider>
          <CartProvider>
            <ThemeProvider defaultTheme="light" storageKey="itakecare-theme">
              <Routes>
                <Route path="/client/*" element={<ClientRoutes />} />
                {/* Add other routes here as needed */}
              </Routes>
              <Toaster />
            </ThemeProvider>
          </CartProvider>
        </ClientCartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
