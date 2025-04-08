import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import CatalogManagement from "./pages/CatalogManagement";
import ProductEditPage from "./pages/ProductEditPage";
import AmbassadorCatalog from "./pages/AmbassadorCatalog";
import AmbassadorProductDetail from "./pages/AmbassadorPages/AmbassadorProductDetail";
import PublicCatalog from "./pages/PublicCatalog";
import PublicProductDetail from "./pages/PublicProductDetail";

import { AuthProvider } from "./hooks/auth/useAuth";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalog" element={<CatalogManagement />} />
          <Route path="/products/:id" element={<ProductEditPage />} />
          <Route path="/ambassador/catalog" element={<AmbassadorCatalog />} />
          <Route path="/ambassador/products/:productId" element={<AmbassadorProductDetail />} />
          <Route path="/produits" element={<PublicCatalog />} />
          <Route path="/produits/:id" element={<PublicProductDetail />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
