import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SubdomainProvider } from './context/SubdomainContext';
import { CompanyBrandingProvider } from './context/CompanyBrandingContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Settings from './pages/Settings';
import CompanySettingsPage from './pages/CompanySettingsPage';
import LeazrSaaSConfiguration from "@/pages/LeazrSaaSConfiguration";
import Layout from './components/layout/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import LeazrSaaSClients from './pages/LeazrSaaSClients';
import { Toaster } from "sonner";

function App() {
  const queryClient = new QueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SubdomainProvider>
          <AuthProvider>
            <CompanyBrandingProvider>
          <Routes>
            {/* Default redirect to dashboard */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            
            {/* Routes protégées */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/company-settings"
              element={
                <PrivateRoute>
                  <Layout>
                    <CompanySettingsPage />
                  </Layout>
                </PrivateRoute>
              }
            />
            
            {/* Routes admin SaaS */}
            <Route 
              path="/admin/leazr-saas-clients" 
              element={
                <PrivateRoute>
                  <Layout>
                    <LeazrSaaSClients />
                  </Layout>
                </PrivateRoute>
              } 
            />
          
          {/* Route pour la configuration SaaS */}
          <Route 
            path="/admin/leazr-saas-configuration" 
            element={
              <Layout>
                <LeazrSaaSConfiguration />
              </Layout>
            } 
          />
          
          </Routes>
          <Toaster richColors />
            </CompanyBrandingProvider>
        </AuthProvider>
        </SubdomainProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
