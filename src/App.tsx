
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Offers from "@/pages/Offers";
import CreateOffer from "@/pages/CreateOffer";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Clients from "@/pages/Clients";
import ClientForm from "@/pages/ClientForm";
import ClientDetail from "@/pages/ClientDetail";
import CreateTestUsers from "@/pages/CreateTestUsers";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />

              {/* Clients */}
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/create" element={<ClientForm />} />
              <Route path="/clients/edit/:id" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientDetail />} />

              {/* Offers */}
              <Route path="/offers" element={<Offers />} />
              <Route path="/create-offer" element={<CreateOffer />} />

              {/* Catalog */}
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/products/:id" element={<ProductDetail />} />

              {/* Dev Tools */}
              <Route path="/create-test-users" element={<CreateTestUsers />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <SonnerToaster position="top-right" />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
