import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import CatalogManagement from './pages/CatalogManagement';
import ProductEditPage from './pages/ProductEditPage';
import Layout from './components/layout/Layout';
import { Toaster } from "@/components/ui/toaster"
import ProductCreationPage from './pages/ProductCreationPage';

function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/catalog" element={<CatalogManagement />} />
          <Route path="/catalog/create" element={<ProductCreationPage />} />
          <Route path="/catalog/edit/:id" element={<ProductEditPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
