
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminCRM from "@/pages/AdminCRM";
import AdminOffersPage from "@/pages/AdminOffersPage";
import AdminOfferDetail from "@/pages/AdminOfferDetail";
import AdminProductsPage from "@/pages/AdminProductsPage";
import AdminPartnersPage from "@/pages/AdminPartnersPage";
import AdminContractsPage from "@/pages/AdminContractsPage";
import AdminContractDetail from "@/pages/AdminContractDetail";
import AdminClientsPage from "@/pages/AdminClientsPage";
import AdminClientDetail from "@/pages/AdminClientDetail";
import AdminUserManagement from "@/pages/AdminUserManagement";
import AdminCommissionsPage from "@/pages/AdminCommissionsPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import CreateOfferPage from "@/pages/CreateOfferPage";
import AmbassadorDashboard from "@/pages/AmbassadorPages/AmbassadorDashboard";
import AmbassadorOffersPage from "@/pages/AmbassadorPages/AmbassadorOffersPage";
import AmbassadorOfferDetail from "@/pages/AmbassadorPages/AmbassadorOfferDetail";
import AmbassadorClientsPage from "@/pages/AmbassadorPages/AmbassadorClientsPage";
import AmbassadorCreateOfferPage from "@/pages/AmbassadorPages/AmbassadorCreateOfferPage";
import AmbassadorCommissionsPage from "@/pages/AmbassadorPages/AmbassadorCommissionsPage";
import AmbassadorProfilePage from "@/pages/AmbassadorPages/AmbassadorProfilePage";
import PublicOfferPage from "@/pages/PublicOfferPage";
import CatalogPage from "@/pages/CatalogPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PublicCatalogPage from "@/pages/PublicCatalogPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import CMSPage from "@/pages/CMSPage";
import OfferDocumentUpload from "@/pages/OfferDocumentUpload";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/offer/:id" element={<PublicOfferPage />} />
                <Route path="/offer/documents/upload/:token" element={<OfferDocumentUpload />} />
                <Route path="/catalog" element={<PublicCatalogPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/cms/:slug" element={<CMSPage />} />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/crm"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminCRM />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/offers"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminOffersPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/offers/:id"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminOfferDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/products"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminProductsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/catalog"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <CatalogPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/partners"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminPartnersPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/contracts"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminContractsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/contracts/:id"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminContractDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/clients"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminClientsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminClientDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminUserManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/commissions"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminCommissionsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <AdminSettingsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/create-offer"
                  element={
                    <PrivateRoute requiredRole="admin">
                      <CreateOfferPage />
                    </PrivateRoute>
                  }
                />

                {/* Ambassador routes */}
                <Route
                  path="/ambassador"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/offers"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorOffersPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/offers/:id"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorOfferDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/clients"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorClientsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/create-offer"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorCreateOfferPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/commissions"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorCommissionsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ambassador/profile"
                  element={
                    <PrivateRoute requiredRole="ambassador">
                      <AmbassadorProfilePage />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
