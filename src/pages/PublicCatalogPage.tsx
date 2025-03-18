
import React, { useState, useEffect } from "react";
import ProductCatalog from "@/components/ui/ProductCatalog";
import PageTransition from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import Container from "@/components/layout/Container";
import { getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { products as fallbackProducts } from "@/data/products";

const PublicCatalogPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        
        // If we received no products from the API, use the fallback data
        if (!data || data.length === 0) {
          console.log("No products returned from API, using fallback data");
          setProducts(fallbackProducts);
        } else {
          setProducts(data);
        }
      } catch (err) {
        console.error("Error loading products:", err);
        setError("Failed to load products. Using fallback data.");
        setProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  const handleSelectProduct = (product: any) => {
    console.log("Product selected:", product);
    // In a public catalog, selection doesn't need to do anything special
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">iTakecare - Catalogue</h1>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-gray-700 hover:text-blue-700">Accueil</Link>
              <Link to="/pack-selection" className="text-gray-700 hover:text-blue-700">Pack Selection</Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-700">Connexion</Link>
              <Link to="/signup" className="text-gray-700 hover:text-blue-700">Inscription</Link>
            </nav>
          </div>
        </header>
        <main className="py-8">
          <Container>
            <h1 className="text-3xl font-bold mb-6">Catalogue de produits</h1>
            <p className="text-gray-600 mb-8">Découvrez notre gamme complète d'équipements disponibles pour la location.</p>
            
            {error && (
              <div className="bg-yellow-100 p-4 rounded-md mb-6 text-yellow-800">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ProductCatalog 
                isOpen={true} 
                onClose={() => {}} 
                onSelectProduct={handleSelectProduct}
                title="Catalogue complet"
                description="Parcourez notre catalogue d'équipements"
                initialProducts={products}
              />
            )}
          </Container>
        </main>
      </div>
    </PageTransition>
  );
};

export default PublicCatalogPage;
