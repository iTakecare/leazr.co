import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, Home, Search } from "lucide-react";

interface PublicNotFoundProps {
  title?: string;
  message?: string;
  showCatalogLink?: boolean;
}

const PublicNotFound: React.FC<PublicNotFoundProps> = ({ 
  title = "Page introuvable",
  message = "La page que vous recherchez n'existe pas ou n'est plus disponible.",
  showCatalogLink = true
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <AlertCircle className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                Retour à l'accueil
              </Link>
            </Button>
            
            {showCatalogLink && (
              <Button variant="outline" asChild size="lg">
                <Link to="/catalog">
                  <Search className="mr-2 h-5 w-5" />
                  Voir tous les catalogues
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-12 p-6 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Suggestions :</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Vérifiez l'orthographe de l'URL</li>
              <li>• Assurez-vous que le nom de l'entreprise est correct</li>
              <li>• Consultez la liste des catalogues disponibles</li>
              <li>• Contactez-nous si le problème persiste</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicNotFound;