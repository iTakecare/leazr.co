
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Package, User, Building, HeartHandshake, BadgePercent, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const isClientEditAttempt = location.pathname.includes('/clients/edit/');
  const isProductDetailAttempt = location.pathname.includes('/products/');
  const isCatalogDetailAttempt = location.pathname.includes('/catalog/');
  const isPartnerEditAttempt = location.pathname.includes('/partners/edit/');
  const isAmbassadorEditAttempt = location.pathname.includes('/ambassadors/edit/');
  const isAmbassadorAttempt = location.pathname.includes('/ambassadors/');
  const isPartnerAttempt = location.pathname.includes('/partners/');
  const isAmbassadorDashboardAttempt = location.pathname.includes('/ambassador/') && !location.pathname.includes('/ambassador/dashboard');
  const isCalculatorAttempt = location.pathname.includes('/calculator');
  
  const clientId = isClientEditAttempt ? 
    location.pathname.split('/clients/edit/')[1] : null;
  
  const productId = isProductDetailAttempt ?
    location.pathname.split('/products/')[1] : null;
    
  const catalogId = isCatalogDetailAttempt ?
    location.pathname.split('/catalog/')[1] : null;

  const partnerId = isPartnerEditAttempt ?
    location.pathname.split('/partners/edit/')[1] : null;
    
  const ambassadorId = isAmbassadorEditAttempt ?
    location.pathname.split('/ambassadors/edit/')[1] : null;

  const isSimpleAmbassadorAttempt = isAmbassadorAttempt && !isAmbassadorEditAttempt;
  const isSimplePartnerAttempt = isPartnerAttempt && !isPartnerEditAttempt;

  const productOrCatalogId = productId || catalogId;

  const goBack = () => {
    navigate(-1);
  };

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
          
          {isPartnerEditAttempt && partnerId && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous essayez de modifier le partenaire, veuillez utiliser le lien ci-dessous:
              </p>
              <Link to={`/partners/${partnerId}`}>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Building className="h-4 w-4" /> Voir la fiche partenaire
                </Button>
              </Link>
            </div>
          )}
          
          {isAmbassadorEditAttempt && ambassadorId && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous essayez de modifier l'ambassadeur, veuillez utiliser le lien ci-dessous:
              </p>
              <Link to={`/ambassadors/${ambassadorId}`}>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <User className="h-4 w-4" /> Voir la fiche ambassadeur
                </Button>
              </Link>
            </div>
          )}
          
          {isSimpleAmbassadorAttempt && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous cherchez la liste des ambassadeurs, utilisez le lien ci-dessous:
              </p>
              <Link to="/ambassadors">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <HeartHandshake className="h-4 w-4" /> Liste des ambassadeurs
                </Button>
              </Link>
            </div>
          )}
          
          {isSimplePartnerAttempt && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous cherchez la liste des partenaires, utilisez le lien ci-dessous:
              </p>
              <Link to="/partners">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Building className="h-4 w-4" /> Liste des partenaires
                </Button>
              </Link>
            </div>
          )}
          
          {isAmbassadorDashboardAttempt && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous cherchez votre tableau de bord ambassadeur, utilisez le lien ci-dessous:
              </p>
              <Link to="/ambassador/dashboard">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <HeartHandshake className="h-4 w-4" /> Tableau de bord ambassadeur
                </Button>
              </Link>
            </div>
          )}
          
          {isCalculatorAttempt && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 text-sm mb-4">
                Si vous cherchez le calculateur d'offres, utilisez le lien ci-dessous:
              </p>
              <Link to="/create-offer">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4" /> Calculateur d'offres
                </Button>
              </Link>
            </div>
          )}
          
          {productOrCatalogId && (isProductDetailAttempt || isCatalogDetailAttempt) && (
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
          
          <div className="flex flex-col gap-3 justify-center">
            <Button 
              variant="default" 
              onClick={goBack}
              className="flex items-center gap-2 w-full"
            >
              <ArrowLeft className="h-4 w-4" /> 
              Retour
            </Button>
            
            <Button 
              variant="outline" 
              asChild
              className="flex items-center gap-2 w-full"
            >
              <Link to="/">
                <Home className="h-4 w-4" /> 
                Tableau de bord
              </Link>
            </Button>
            
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to="/clients">
                  <Users className="h-4 w-4" /> 
                  Clients
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to="/ambassadors">
                  <HeartHandshake className="h-4 w-4" /> 
                  Ambassadeurs
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to="/partners">
                  <BadgePercent className="h-4 w-4" /> 
                  Partenaires
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
