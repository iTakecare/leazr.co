
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Offers from "@/pages/Offers";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import OfferDetail from "@/pages/OfferDetail";
import ClientDetail from "@/pages/ClientDetail";
import ContractDetail from "@/pages/ContractDetail";
import ITakecarePage from "@/pages/ITakecarePage";
import CatalogManagement from "@/pages/CatalogManagement";
import ProductDetailPage from "@/pages/ProductDetailPage";
import ProductEditPage from "@/pages/ProductEditPage";
import AmbassadorsList from "@/pages/AmbassadorsList";
import PartnersList from "@/pages/PartnersList";
import AmbassadorDetail from "@/pages/AmbassadorDetail";
import PartnerDetail from "@/pages/PartnerDetail";
import AmbassadorCreatePage from "@/pages/AmbassadorCreatePage";
import AmbassadorEditPage from "@/pages/AmbassadorEditPage";
import PartnerCreatePage from "@/pages/PartnerCreatePage";
import PartnerEditPage from "@/pages/PartnerEditPage";
import CreateOffer from "@/pages/CreateOffer";

const AdminRoutes = () => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/:id" element={<OfferDetail />} />
        <Route path="/create-offer" element={<CreateOffer />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
        <Route path="/catalog" element={<CatalogManagement />} />
        <Route path="/catalog/product/:id" element={<ProductDetailPage />} />
        <Route path="/catalog/product/edit/:id" element={<ProductEditPage />} />
        <Route path="/ambassadors" element={<AmbassadorsList />} />
        <Route path="/ambassadors/create" element={<AmbassadorCreatePage />} />
        <Route path="/ambassadors/:id" element={<AmbassadorDetail />} />
        <Route path="/ambassadors/edit/:id" element={<AmbassadorEditPage />} />
        <Route path="/partners" element={<PartnersList />} />
        <Route path="/partners/create" element={<PartnerCreatePage />} />
        <Route path="/partners/:id" element={<PartnerDetail />} />
        <Route path="/partners/edit/:id" element={<PartnerEditPage />} />
        <Route path="/itakecare" element={<ITakecarePage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
