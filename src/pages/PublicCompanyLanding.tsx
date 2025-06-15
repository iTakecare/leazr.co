import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, Star, Users, Award, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PublicCompanyLanding = () => {
  const { companyId } = useParams<{ companyId: string }>();

  // Fetch company info
  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch some featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["products", "featured", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .or('admin_only.is.null,admin_only.eq.false')
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Entreprise non trouvée</h3>
            <p className="text-muted-foreground text-center">
              L'entreprise demandée n'existe pas ou n'est plus active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-10 w-auto"
                />
              )}
              <h1 className="text-2xl font-bold">{company.name}</h1>
            </div>
            <Link to={`/public/${companyId}/catalog`}>
              <Button>
                Voir le catalogue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Financement d'équipements
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez notre large gamme d'équipements informatiques et professionnels 
            avec des solutions de financement adaptées à vos besoins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`/public/${companyId}/catalog`}>
              <Button size="lg" className="gap-2">
                <Package className="h-5 w-5" />
                Explorer le catalogue
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Demander un devis
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Pourquoi nous choisir ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Financement rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Obtenez une réponse en 24h et financez vos équipements rapidement
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Équipements premium</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Large sélection d'équipements de qualité professionnelle
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Support dédié</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Accompagnement personnalisé tout au long de votre projet
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-3xl font-bold">Produits populaires</h3>
              <Link to={`/public/${companyId}/catalog`}>
                <Button variant="outline">
                  Voir tout le catalogue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4">
                    <img 
                      src={product.image_url || "/placeholder.svg"} 
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-md bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardTitle className="text-sm mb-1">{product.name}</CardTitle>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">4.5</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-primary">
                        {product.monthly_price ? `${product.monthly_price}€/mois` : `${product.price}€`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-6">Prêt à commencer ?</h3>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Explorez notre catalogue et trouvez l'équipement parfait pour votre entreprise
          </p>
          <Link to={`/public/${companyId}/catalog`}>
            <Button size="lg" variant="secondary">
              Découvrir le catalogue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {company.name}. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicCompanyLanding;