import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, ExternalLink } from "lucide-react";

const DebugSlugs = () => {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['debug-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'solutions', 'services', 'about', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'features', 'blog', 'news'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Debug des Slugs d'Entreprises</h1>
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Valid Company Slugs */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-600">
                Entreprises Valides ({companies?.length || 0})
              </h2>
              {isLoading ? (
                <p className="text-muted-foreground">Chargement...</p>
              ) : companies && companies.length > 0 ? (
                <div className="space-y-2">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">/{company.slug}</div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/${company.slug}`} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune entreprise trouvée</p>
              )}
            </div>

            {/* Reserved Keywords */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-600">
                Mots-clés Réservés ({reservedKeywords.length})
              </h2>
              <div className="space-y-2">
                {reservedKeywords.map((keyword) => (
                  <div key={keyword} className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                    <div className="font-medium text-red-700 dark:text-red-300">/{keyword}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Réservé par le système</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Test URLs */}
          <div className="mt-8 bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Test des URLs</h2>
            <div className="grid gap-4">
              <div>
                <h3 className="font-medium mb-2">URLs de test :</h3>
                <ul className="space-y-1 text-sm">
                  <li>• <Link to="/catalog" className="text-primary hover:underline">/catalog</Link> - Liste des catalogues publics</li>
                  <li>• <Link to="/solutions" className="text-primary hover:underline">/solutions</Link> - Mot-clé réservé (erreur attendue)</li>
                  {companies?.slice(0, 3).map((company) => (
                    <li key={company.id}>
                      • <Link to={`/${company.slug}`} className="text-primary hover:underline">/{company.slug}</Link> - Catalogue de {company.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugSlugs;