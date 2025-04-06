import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Offers from './pages/Offers';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RequireAuth from './components/auth/RequireAuth';
import ClientDetail from './pages/ClientDetail';
import OfferDetail from './pages/OfferDetail';
import CreateClient from './pages/CreateClient';
import EditClient from './pages/EditClient';
import CreateOffer from './pages/CreateOffer';
import EditOffer from './pages/EditOffer';
import Ambassadors from './pages/Ambassadors';
import AmbassadorDetail from './pages/AmbassadorDetail';
import CreateAmbassador from './pages/CreateAmbassador';
import EditAmbassador from './pages/EditAmbassador';
import CommissionLevels from './pages/CommissionLevels';
import CreateCommissionLevel from './pages/CreateCommissionLevel';
import EditCommissionLevel from './pages/EditCommissionLevel';
import { Toaster } from "@/components/ui/toaster"
import AmbassadorCommissionInfo from "@/pages/AmbassadorCommissionInfo";

function App() {
  const queryClient = new QueryClient();

  return (
    <div className="app">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
              <Route path="/clients/:id" element={<RequireAuth><ClientDetail /></RequireAuth>} />
              <Route path="/clients/create" element={<RequireAuth><CreateClient /></RequireAuth>} />
              <Route path="/clients/:id/edit" element={<RequireAuth><EditClient /></RequireAuth>} />

              <Route path="/offers" element={<RequireAuth><Offers /></RequireAuth>} />
              <Route path="/offers/:id" element={<RequireAuth><OfferDetail /></RequireAuth>} />
              <Route path="/offers/create" element={<RequireAuth><CreateOffer /></RequireAuth>} />
              <Route path="/offers/:id/edit" element={<RequireAuth><EditOffer /></RequireAuth>} />

              <Route path="/ambassadors" element={<RequireAuth><Ambassadors /></RequireAuth>} />
              <Route path="/ambassadors/:id" element={<RequireAuth><AmbassadorDetail /></RequireAuth>} />
              <Route path="/ambassadors/create" element={<RequireAuth><CreateAmbassador /></RequireAuth>} />
              <Route path="/ambassadors/:id/edit" element={<RequireAuth><EditAmbassador /></RequireAuth>} />
              
              <Route path="/commission-levels" element={<RequireAuth><CommissionLevels /></RequireAuth>} />
              <Route path="/commission-levels/create" element={<RequireAuth><CreateCommissionLevel /></RequireAuth>} />
              <Route path="/commission-levels/:id/edit" element={<RequireAuth><EditCommissionLevel /></RequireAuth>} />

              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              
              {/* Ajout de la route pour voir les informations de commission d'un ambassadeur */}
              <Route 
                path="/ambassadors/:id/commission-info" 
                element={<AmbassadorCommissionInfo />}
              />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
