import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { QueryClient } from 'react-query';

import LandingPage from "@/pages/LandingPage";
import SignupPage from "@/pages/SignupPage";

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import UpdateProfile from './pages/UpdateProfile';
import Offers from './pages/Offers';
import OfferDetails from './pages/OfferDetails';
import NewOffer from './pages/NewOffer';
import EditOffer from './pages/EditOffer';
import Clients from './pages/Clients';
import NewClient from './pages/NewClient';
import EditClient from './pages/EditClient';
import Settings from './pages/Settings';
import Products from './pages/Products';
import NewProduct from './pages/NewProduct';
import EditProduct from './pages/EditProduct';
import Categories from './pages/Categories';
import NewCategory from './pages/NewCategory';
import EditCategory from './pages/EditCategory';
import AuthCallback from './pages/AuthCallback';
import PaymentPage from './pages/PaymentPage';
import { PrivateRoute } from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <QueryClient>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Payment Route */}
              <Route path="/payment" element={<PaymentPage />} />

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
                path="/update-profile"
                element={
                  <PrivateRoute>
                    <UpdateProfile />
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
                path="/offers/:id"
                element={
                  <PrivateRoute>
                    <OfferDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/new-offer"
                element={
                  <PrivateRoute>
                    <NewOffer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-offer/:id"
                element={
                  <PrivateRoute>
                    <EditOffer />
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
              <Route
                path="/new-client"
                element={
                  <PrivateRoute>
                    <NewClient />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-client/:id"
                element={
                  <PrivateRoute>
                    <EditClient />
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
                path="/products"
                element={
                  <PrivateRoute>
                    <Products />
                  </PrivateRoute>
                }
              />
              <Route
                path="/new-product"
                element={
                  <PrivateRoute>
                    <NewProduct />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-product/:id"
                element={
                  <PrivateRoute>
                    <EditProduct />
                  </PrivateRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <PrivateRoute>
                    <Categories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/new-category"
                element={
                  <PrivateRoute>
                    <NewCategory />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-category/:id"
                element={
                  <PrivateRoute>
                    <EditCategory />
                  </PrivateRoute>
                }
              />
            </Routes>
          </QueryClient>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
