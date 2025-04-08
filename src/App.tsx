
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CatalogManagement from "./pages/CatalogManagement";
import ProductEditPage from "./pages/ProductEditPage";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";
import AmbassadorProductDetail from "./pages/AmbassadorPages/AmbassadorProductDetail";
import PublicCatalog from "./pages/PublicCatalog";
import ProductDetailPage from "./pages/ProductDetailPage";

import { AuthProvider } from "./hooks/auth/useAuth";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/catalog" element={<CatalogManagement />} />
          <Route path="/products/:id" element={<ProductEditPage />} />
          <Route path="/ambassador/catalog" element={<AmbassadorCatalog />} />
          <Route path="/ambassador/products/:productId" element={<AmbassadorProductDetail />} />
          <Route path="/produits" element={<PublicCatalog />} />
          <Route path="/produits/:id" element={<ProductDetailPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
