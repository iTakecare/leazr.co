
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Check if the path contains specific routes
  const isClientEditAttempt = location.pathname.includes('/clients/edit/');
  const isProductDetailAttempt = location.pathname.includes('/products/');
  
  const clientId = isClientEditAttempt ? 
    location.pathname.split('/clients/edit/')[1] : null;
  
  const productId = isProductDetailAttempt ?
    location.pathname.split('/products/')[1] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">404</h1>
          <p className="text-xl text-gray-700 mb-2">Page introuvable</p>
          <p className="text-sm text-gray-500 mb-6">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          
          {isClientEditAttempt && clientId && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous essayez de modifier le client, veuillez utiliser le lien ci-dessous:
              </p>
              <Link to={`/clients/${clientId}`}>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voir la fiche client
                </Button>
              </Link>
            </div>
          )}
          
          {isProductDetailAttempt && productId && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Le produit que vous recherchez n'a pas été trouvé. Revenez au catalogue pour voir les produits disponibles.
              </p>
              <Link to="/catalog">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Package className="h-4 w-4" /> Voir le catalogue
                </Button>
              </Link>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <Button 
              variant="default" 
              asChild
              className="flex items-center gap-2"
            >
              <Link to="/">
                <Home className="h-4 w-4" /> 
                Accueil
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="flex items-center gap-2"
            >
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4" /> 
                Liste des clients
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
