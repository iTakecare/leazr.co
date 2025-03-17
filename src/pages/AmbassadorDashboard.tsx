
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { ArrowRight, Heart, Users, Activity, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const AmbassadorDashboard = () => {
  const { user } = useAuth();
  const ambassadorName = user?.name || "Ambassadeur";

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <h1 className="text-2xl font-bold mb-6">Tableau de bord Ambassadeur</h1>
          
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Partenaires recommandés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Commission totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 €</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dernière commission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 €</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              <span>Mes partenaires</span>
            </Button>
            
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
              <Heart className="h-5 w-5" />
              <span>Mes recommandations</span>
            </Button>
            
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span>Mes commissions</span>
            </Button>
            
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
              <Activity className="h-5 w-5" />
              <span>Mes performances</span>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Mes dernières activités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <p>Aucune activité récente</p>
                <Button variant="link" className="mt-2">
                  Commencer à recommander des partenaires <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorDashboard;
