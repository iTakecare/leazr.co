
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LandingPage from "@/pages/LandingPage";
import SignupPage from "@/pages/SignupPage";

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import Offers from './pages/Offers';
import Clients from './pages/Clients';
import { PrivateRoute } from './components/PrivateRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<Login />} />

              {/* Private Routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/offers"
                element={
                  <PrivateRoute>
                    <Offers />
                  </PrivateRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <PrivateRoute>
                    <Clients />
                  </PrivateRoute>
                }
              />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
