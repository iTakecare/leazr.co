import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from 'react-query';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import PublicPage from './pages/PublicPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import LeazrClients from './pages/LeazrClients';
import LeazrSaaSConfiguration from "@/pages/LeazrSaaSConfiguration";
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LeazrSaaSClients from './pages/LeazrSaaSClients';
import LeazrSaaSAdminDashboard from './pages/LeazrSaaSAdminDashboard';
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <QueryClient>
        <AuthProvider>
          <Routes>
            <Route path="/public" element={<PublicPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Routes protégées */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-settings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CompanySettingsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
             <Route
              path="/admin/leazr-clients"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LeazrClients />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Routes admin SaaS */}
            <Route 
              path="/admin/leazr-saas-clients" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LeazrSaaSClients />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/leazr-saas-dashboard" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LeazrSaaSAdminDashboard />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
          
          {/* Route pour la configuration SaaS */}
          <Route 
            path="/admin/leazr-saas-configuration" 
            element={
              <MainLayout>
                <LeazrSaaSConfiguration />
              </MainLayout>
            } 
          />
          
          </Routes>
          <Toaster richColors />
        </AuthProvider>
      </QueryClient>
    </BrowserRouter>
  );
}

export default App;
