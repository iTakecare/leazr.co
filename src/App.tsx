
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import './App.css';
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import Dashboard from "@/pages/Dashboard";
import Offers from "@/pages/Offers";
import CreateOffer from "@/pages/CreateOffer";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CreateTestUsers from "@/pages/CreateTestUsers";
import { AuthProvider } from "@/context/AuthContext";

// Create a client
const queryClient = new QueryClient();

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/create-test-users" element={<CreateTestUsers />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/create-offer" element={<CreateOffer />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:productId" element={<ProductDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
