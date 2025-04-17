
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

const SeoSettings = () => {
  const [globalSeo, setGlobalSeo] = useState({
    siteName: "iTakecare",
    separator: " | ",
    homeTitle: "iTakecare - Location d'équipement informatique reconditionné",
    homeDescription: "iTakecare propose la location d'équipement informatique reconditionné de haute qualité pour les entreprises soucieuses de l'environnement.",
    noindex: false,
    keywords: "leasing, reconditionné, entreprise, équipement informatique, écologique, macbook",
    enableBreadcrumbs: true,
    enableSitelinks: true,
    googleVerification: "",
    bingVerification: "",
    analyticsId: ""
  });

  const handleSave = () => {
    // TODO: Implémenter la sauvegarde dans la base de données
    console.log("Sauvegarde des paramètres SEO", globalSeo);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Optimisation pour les moteurs de recherche</AlertTitle>
        <AlertDescription>
          Ces paramètres affectent la façon dont votre site apparaît dans les résultats des moteurs de recherche.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="social">Open Graph & Twitter</TabsTrigger>
          <TabsTrigger value="verification">Vérification</TabsTrigger>
          <TabsTrigger value="advanced">Avancé</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres SEO généraux</CardTitle>
              <CardDescription>
                Configurez les titres et descriptions qui s'afficheront dans les résultats de recherche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input 
                    id="siteName" 
                    value={globalSeo.siteName}
                    onChange={(e) => setGlobalSeo({...globalSeo, siteName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="separator">Séparateur de titre</Label>
                  <Input 
                    id="separator" 
                    value={globalSeo.separator}
                    onChange={(e) => setGlobalSeo({...globalSeo, separator: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="homeTitle">Titre de la page d'accueil</Label>
                <Input 
                  id="homeTitle" 
                  value={globalSeo.homeTitle}
                  onChange={(e) => setGlobalSeo({...globalSeo, homeTitle: e.target.value})}
                />
                <div className="text-sm text-gray-500 flex items-center mt-1">
                  <Info className="h-4 w-4 mr-1" />
                  <span>Exemple dans Google : <strong>{globalSeo.homeTitle}</strong></span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="homeDescription">Description de la page d'accueil</Label>
                <Textarea 
                  id="homeDescription" 
                  value={globalSeo.homeDescription}
                  onChange={(e) => setGlobalSeo({...globalSeo, homeDescription: e.target.value})}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {globalSeo.homeDescription.length}/160 caractères
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keywords">Mots-clés (séparés par des virgules)</Label>
                <Textarea 
                  id="keywords" 
                  value={globalSeo.keywords}
                  onChange={(e) => setGlobalSeo({...globalSeo, keywords: e.target.value})}
                  rows={2}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="noindex" 
                  checked={globalSeo.noindex}
                  onCheckedChange={(checked) => setGlobalSeo({...globalSeo, noindex: checked})}
                />
                <Label htmlFor="noindex">Ne pas indexer ce site (désactive l'indexation par les moteurs de recherche)</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="social" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Graph & Twitter Cards</CardTitle>
              <CardDescription>
                Configurez comment votre site s'affiche lorsqu'il est partagé sur les réseaux sociaux
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image par défaut pour les partages</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Recommandé : 1200 x 630 pixels pour Facebook, 800 x 418 pixels pour Twitter
                  </p>
                  <Button variant="outline" size="sm">
                    Télécharger une image
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ogTitle">Titre Open Graph par défaut</Label>
                <Input 
                  id="ogTitle" 
                  placeholder="Titre pour les partages sociaux"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ogDescription">Description Open Graph par défaut</Label>
                <Textarea 
                  id="ogDescription" 
                  placeholder="Description pour les partages sociaux"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Compte Twitter</Label>
                <Input 
                  id="twitterHandle" 
                  placeholder="@votrecompte"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="verification" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vérification des outils webmaster</CardTitle>
              <CardDescription>
                Ajoutez des codes de vérification pour les outils d'analyse et de webmaster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleVerification">Code de vérification Google Search Console</Label>
                <Input 
                  id="googleVerification" 
                  value={globalSeo.googleVerification}
                  onChange={(e) => setGlobalSeo({...globalSeo, googleVerification: e.target.value})}
                  placeholder="google-site-verification=xxxxxxxxxxxxxxxx"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bingVerification">Code de vérification Bing Webmaster</Label>
                <Input 
                  id="bingVerification" 
                  value={globalSeo.bingVerification}
                  onChange={(e) => setGlobalSeo({...globalSeo, bingVerification: e.target.value})}
                  placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="analyticsId">ID Google Analytics</Label>
                <Input 
                  id="analyticsId" 
                  value={globalSeo.analyticsId}
                  onChange={(e) => setGlobalSeo({...globalSeo, analyticsId: e.target.value})}
                  placeholder="G-XXXXXXXXXX ou UA-XXXXXXXX-X"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fonctionnalités avancées</CardTitle>
              <CardDescription>
                Activez des fonctionnalités SEO avancées pour votre site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableBreadcrumbs" 
                  checked={globalSeo.enableBreadcrumbs}
                  onCheckedChange={(checked) => setGlobalSeo({...globalSeo, enableBreadcrumbs: checked})}
                />
                <Label htmlFor="enableBreadcrumbs">Activer les fils d'Ariane structurés</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableSitelinks" 
                  checked={globalSeo.enableSitelinks}
                  onCheckedChange={(checked) => setGlobalSeo({...globalSeo, enableSitelinks: checked})}
                />
                <Label htmlFor="enableSitelinks">Activer la recherche Sitelinks</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="robotsTxt">Contenu du fichier robots.txt</Label>
                <Textarea 
                  id="robotsTxt" 
                  defaultValue={`User-agent: *\nDisallow: /admin/\nDisallow: /wp-admin/\n\nSitemap: https://www.itakecare.com/sitemap.xml`}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SeoSettings;
