import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store, ArrowRight, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  modules_enabled?: string[];
}

const PublicCatalogList = () => {
  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['public-companies'],
    queryFn: async () => {
      console.log('🏪 Fetching public companies...');
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Error fetching companies:', error);
        throw error;
      }

      console.log('✅ Companies fetched:', data?.length);
      return data as Company[];
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement des catalogues...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="mb-8">
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-4">Erreur de chargement</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Impossible de charger les catalogues pour le moment.
              </p>
              <Button asChild>
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Catalogues Publics</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les catalogues de nos partenaires et explorez leurs produits en leasing.
          </p>
        </div>

        {/* Companies Grid */}
        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {companies.map((company) => (
              <Card key={company.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    {company.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={`Logo ${company.name}`}
                        className="w-12 h-12 object-contain rounded-full"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{company.name}</CardTitle>
                  {company.description && (
                    <CardDescription className="line-clamp-2">
                      {company.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-center">
                  <Button asChild className="w-full group-hover:scale-[1.02] transition-transform">
                    <Link to={`/${company.slug}/catalog`}>
                      Voir le catalogue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Aucun catalogue disponible</h2>
            <p className="text-muted-foreground mb-8">
              Aucune entreprise n'a encore publié son catalogue.
            </p>
            <Button asChild>
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </div>
        )}

        {/* Back to home */}
        <div className="text-center mt-12">
          <Button variant="outline" asChild>
            <Link to="/">← Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicCatalogList;