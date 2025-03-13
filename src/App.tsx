
import { Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import CreateOffer from "./pages/CreateOffer";
import Offers from "./pages/Offers";
import Contracts from "./pages/Contracts";
import CreateTestUsers from "./pages/CreateTestUsers";

import { Layout } from "./components/layout/Layout";
import { ThemeProvider } from "./components/providers/theme-provider";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { Toaster as SonnerToaster } from "sonner";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="medease-theme">
      <AuthProvider>
        <SonnerToaster position="top-right" />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:id" element={<ProductDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create-offer" element={<CreateOffer />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/create-test-users" element={<CreateTestUsers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
