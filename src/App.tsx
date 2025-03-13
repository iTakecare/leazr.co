
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";
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
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Component for protected routes with timeout handling
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, session } = useAuth();
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  
  useEffect(() => {
    console.log("Protected route state:", { isLoading, user: !!user, session: !!session });
    
    // Set a timeout to handle possible infinite loading
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log("Authentication loading timeout occurred");
        setTimeoutOccurred(true);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timer);
  }, [isLoading, user, session]);
  
  // If timed out or explicitly not authenticated, redirect to login
  if (timeoutOccurred || (!isLoading && !user)) {
    console.log("Redirecting to login: timeout =", timeoutOccurred, "no user =", !user);
    return <Navigate to="/login" replace />;
  }
  
  // Still loading and not timed out yet
  if (isLoading && !timeoutOccurred) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Chargement de votre profil...</p>
        <p className="text-sm text-muted-foreground mt-2">Si le chargement persiste, <a href="/login" className="text-primary underline">cliquez ici pour vous reconnecter</a></p>
      </div>
    );
  }
  
  // If we made it here, user is authenticated
  return <>{children}</>;
}

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

// Simple app component to separate router from auth provider
function AppRoutes() {
  // Force rerender when route changes to help clean up auth state issues
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    // Reset the router component on mount to clean any stale auth state
    setKey(prevKey => prevKey + 1);
  }, []);
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/create-test-users" element={<CreateTestUsers />} />
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/create-offer" element={<CreateOffer />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/catalog/:productId" element={<ProductDetail />} />
        <Route path="/calculator" element={<div className="p-6"><h1 className="text-3xl font-bold">Calculateur</h1><p className="text-muted-foreground mt-2">Page en cours de développement</p></div>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
