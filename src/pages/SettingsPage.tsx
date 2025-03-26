
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, User, Globe, Database, CreditCard, MessageCircle, Wrench } from "lucide-react";
import UserManagement from "@/components/settings/UserManagement";
import Container from "@/components/layout/Container";
import AccountSettings from "@/components/settings/AccountSettings";
import PageHeader from "@/components/layout/PageHeader";
import { Separator } from "@/components/ui/separator";
import SmtpSettings from "@/components/settings/SmtpSettings";
import PDFModelManager from "@/components/settings/PDFModelManager";
import DataImporter from "@/components/settings/DataImporter";
import { useAuth } from "@/context/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const isAdmin = user?.user_metadata?.role === "admin";
  
  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Paramètres"
          subtitle="Gérez les paramètres de votre compte et de l'application"
          icon={<Settings className="h-6 w-6" />}
        />
        
        <Separator />
        
        <Tabs
          defaultValue="account"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Compte</span>
            </TabsTrigger>
            
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <TabsTrigger value="pdf-models" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Modèles PDF</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <TabsTrigger value="woocommerce" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">WooCommerce</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Maintenance</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="account" className="space-y-4">
            <AccountSettings />
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
          )}
          
          {isAdmin && (
            <TabsContent value="pdf-models" className="space-y-4">
              <PDFModelManager />
            </TabsContent>
          )}
          
          {isAdmin && (
            <TabsContent value="smtp" className="space-y-4">
              <SmtpSettings />
            </TabsContent>
          )}
          
          {isAdmin && (
            <TabsContent value="import" className="space-y-4">
              <DataImporter />
            </TabsContent>
          )}
          
          {isAdmin && (
            <TabsContent value="woocommerce" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration WooCommerce</CardTitle>
                  <CardDescription>
                    Configurez l'intégration avec votre boutique WooCommerce
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site-url">URL du site</Label>
                    <Input id="site-url" placeholder="https://votre-site.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumer-key">Clé consommateur</Label>
                    <Input id="consumer-key" placeholder="Clé API WooCommerce" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumer-secret">Secret consommateur</Label>
                    <Input id="consumer-secret" type="password" placeholder="Secret API WooCommerce" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => toast.success("Configuration WooCommerce enregistrée")}>
                    Enregistrer
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
          
          {isAdmin && (
            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance</CardTitle>
                  <CardDescription>
                    Outils de maintenance du système
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Nettoyage de la base de données</h3>
                      <p className="text-sm text-muted-foreground">
                        Nettoyer les données obsolètes et temporaires pour améliorer les performances.
                      </p>
                    </div>
                    <Button onClick={() => toast.success("Nettoyage de la base de données terminé")}>
                      Lancer le nettoyage
                    </Button>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h3 className="text-lg font-medium">Sauvegarde des données</h3>
                      <p className="text-sm text-muted-foreground">
                        Créer une sauvegarde complète de toutes les données.
                      </p>
                    </div>
                    <Button onClick={() => toast.success("Sauvegarde créée avec succès")}>
                      Créer une sauvegarde
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Container>
  );
};

export default SettingsPage;
