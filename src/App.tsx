
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

// Création d'un nouveau QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 pl-24">
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
