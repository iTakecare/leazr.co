
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, 
  Settings as SettingsIcon, 
  Cloud,
  Shield
} from "lucide-react";
import NetlifyConfiguration from "@/components/admin/NetlifyConfiguration";

const LeazrSaaSConfiguration = () => {
  const { user } = useAuth();

  // Vérifier que seul l'admin SaaS peut accéder à cette page
  if (!user || user.email !== "ecommerce@itakecare.be") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configuration SaaS</h1>
          <p className="text-muted-foreground mt-2">
            Paramètres globaux pour le déploiement et la gestion de vos clients
          </p>
        </div>
        
        <Tabs defaultValue="netlify" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="netlify" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Netlify
            </TabsTrigger>
            <TabsTrigger value="cloudflare" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloudflare
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Général
            </TabsTrigger>
          </TabsList>

          <TabsContent value="netlify" className="mt-6">
            <NetlifyConfiguration />
          </TabsContent>

          <TabsContent value="cloudflare" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Configuration Cloudflare
                </CardTitle>
                <CardDescription>
                  Gestion des domaines et DNS via Cloudflare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Configuration Cloudflare</h3>
                  <p className="text-muted-foreground">
                    La configuration Cloudflare sera disponible prochainement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Paramètres généraux
                </CardTitle>
                <CardDescription>
                  Configuration générale du système SaaS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Paramètres généraux</h3>
                  <p className="text-muted-foreground">
                    Les paramètres généraux seront disponibles prochainement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeazrSaaSConfiguration;
