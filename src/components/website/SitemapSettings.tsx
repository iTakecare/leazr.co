
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, DownloadIcon, RefreshCw } from "lucide-react";

const SitemapSettings = () => {
  const [sitemapEnabled, setSitemapEnabled] = useState(true);
  const [sitemapConfig, setSitemapConfig] = useState({
    includeImages: true,
    includeLastModified: true,
    autoGenerate: true,
    notifySearchEngines: true,
    frequency: "weekly"
  });

  // Données simulées pour les pages
  const pages = [
    { id: 1, name: "Accueil", url: "/", include: true, priority: "1.0" },
    { id: 2, name: "À propos", url: "/about", include: true, priority: "0.8" },
    { id: 3, name: "Services", url: "/services", include: true, priority: "0.8" },
    { id: 4, name: "Durabilité", url: "/durability", include: true, priority: "0.7" },
    { id: 5, name: "Solutions", url: "/solutions", include: true, priority: "0.8" },
    { id: 6, name: "Contact", url: "/contact", include: true, priority: "0.6" },
    { id: 7, name: "Blog", url: "/blog", include: true, priority: "0.9" }
  ];

  const [pageList, setPageList] = useState(pages);

  const handleTogglePage = (id: number, checked: boolean) => {
    setPageList(pageList.map(page => 
      page.id === id ? { ...page, include: checked } : page
    ));
  };

  const handleChangePriority = (id: number, priority: string) => {
    setPageList(pageList.map(page =>
      page.id === id ? { ...page, priority } : page
    ));
  };

  const handleGenerateSitemap = () => {
    // TODO: Implémenter la génération du sitemap
    console.log("Génération du sitemap avec les paramètres :", sitemapConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch 
            id="enableSitemap"
            checked={sitemapEnabled}
            onCheckedChange={setSitemapEnabled}
          />
          <Label htmlFor="enableSitemap">Activer le Sitemap XML</Label>
        </div>
        
        <div className="space-x-2">
          <Button variant="outline" onClick={handleGenerateSitemap}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Régénérer
          </Button>
          <Button>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Télécharger le sitemap
          </Button>
        </div>
      </div>

      {sitemapEnabled ? (
        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration du Sitemap</CardTitle>
                <CardDescription>
                  Personnalisez les options de génération de votre sitemap XML
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeImages" 
                    checked={sitemapConfig.includeImages}
                    onCheckedChange={(checked) => 
                      setSitemapConfig({...sitemapConfig, includeImages: checked as boolean})
                    }
                  />
                  <Label htmlFor="includeImages">Inclure les images dans le sitemap</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeLastModified" 
                    checked={sitemapConfig.includeLastModified}
                    onCheckedChange={(checked) => 
                      setSitemapConfig({...sitemapConfig, includeLastModified: checked as boolean})
                    }
                  />
                  <Label htmlFor="includeLastModified">Inclure les dates de dernière modification</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="autoGenerate" 
                    checked={sitemapConfig.autoGenerate}
                    onCheckedChange={(checked) => 
                      setSitemapConfig({...sitemapConfig, autoGenerate: checked as boolean})
                    }
                  />
                  <Label htmlFor="autoGenerate">Générer automatiquement lors de modifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notifySearchEngines" 
                    checked={sitemapConfig.notifySearchEngines}
                    onCheckedChange={(checked) => 
                      setSitemapConfig({...sitemapConfig, notifySearchEngines: checked as boolean})
                    }
                  />
                  <Label htmlFor="notifySearchEngines">Notifier les moteurs de recherche des mises à jour</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Fréquence de mise à jour</Label>
                  <Select 
                    value={sitemapConfig.frequency} 
                    onValueChange={(value) => 
                      setSitemapConfig({...sitemapConfig, frequency: value})
                    }
                  >
                    <SelectTrigger id="frequency" className="w-[200px]">
                      <SelectValue placeholder="Fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Toujours</SelectItem>
                      <SelectItem value="hourly">Toutes les heures</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                      <SelectItem value="yearly">Annuelle</SelectItem>
                      <SelectItem value="never">Jamais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => console.log("Sauvegarde de la configuration du sitemap", sitemapConfig)}>
                  Enregistrer
                </Button>
              </CardFooter>
            </Card>
            
            <Alert variant="default">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Votre sitemap est accessible à l'adresse :</AlertTitle>
              <AlertDescription>
                <a href="https://www.itakecare.com/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  https://www.itakecare.com/sitemap.xml
                </a>
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="pages" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pages incluses dans le sitemap</CardTitle>
                <CardDescription>
                  Choisissez les pages à inclure et leur priorité dans le sitemap
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inclure</TableHead>
                      <TableHead>Nom de la page</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Priorité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageList.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <Checkbox 
                            checked={page.include}
                            onCheckedChange={(checked) => handleTogglePage(page.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>{page.name}</TableCell>
                        <TableCell>{page.url}</TableCell>
                        <TableCell>
                          <Select 
                            value={page.priority} 
                            onValueChange={(value) => handleChangePriority(page.id, value)}
                            disabled={!page.include}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Priorité" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1.0">1.0 (Haute)</SelectItem>
                              <SelectItem value="0.9">0.9</SelectItem>
                              <SelectItem value="0.8">0.8</SelectItem>
                              <SelectItem value="0.7">0.7</SelectItem>
                              <SelectItem value="0.6">0.6</SelectItem>
                              <SelectItem value="0.5">0.5 (Moyenne)</SelectItem>
                              <SelectItem value="0.4">0.4</SelectItem>
                              <SelectItem value="0.3">0.3</SelectItem>
                              <SelectItem value="0.2">0.2</SelectItem>
                              <SelectItem value="0.1">0.1 (Basse)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter>
                <Button onClick={() => console.log("Sauvegarde des pages du sitemap", pageList)}>
                  Enregistrer
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu du Sitemap XML</CardTitle>
                <CardDescription>
                  Voici à quoi ressemble votre sitemap XML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto h-[400px] text-xs">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://www.itakecare.com/</loc>
    <lastmod>2025-04-15T16:34:02+00:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://www.itakecare.com/lovable-uploads/bd59707a-2419-4827-b053-ae8e517c967b.png</image:loc>
      <image:title>iTakecare - Accueil</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://www.itakecare.com/about</loc>
    <lastmod>2025-04-10T11:22:33+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.itakecare.com/services</loc>
    <lastmod>2025-04-05T09:15:21+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.itakecare.com/durability</loc>
    <lastmod>2025-03-28T14:45:10+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.itakecare.com/solutions</loc>
    <lastmod>2025-04-02T16:30:45+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.itakecare.com/contact</loc>
    <lastmod>2025-04-01T10:12:33+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://www.itakecare.com/blog</loc>
    <lastmod>2025-04-16T08:45:22+00:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Articles de blog -->
  <url>
    <loc>https://www.itakecare.com/blog/leasing-materiel-reconditionne-empreinte-carbone</loc>
    <lastmod>2025-04-12T09:30:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>https://www.itakecare.com/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png</image:loc>
      <image:title>Comment le leasing de matériel reconditionné réduit l'empreinte carbone de votre entreprise</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://www.itakecare.com/blog/guide-choix-macbook-pro-equipe</loc>
    <lastmod>2025-04-05T14:20:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>https://www.itakecare.com/lovable-uploads/1c9b904d-1c96-4dff-994c-4daaf6fd3ec1.png</image:loc>
      <image:title>Guide complet: Choisir le bon MacBook Pro pour votre équipe</image:title>
    </image:image>
  </url>
</urlset>`}
                </pre>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => console.log("Téléchargement du sitemap")}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Télécharger le sitemap
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Alert variant="default" className="bg-yellow-50">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Sitemap désactivé</AlertTitle>
          <AlertDescription>
            Le sitemap XML est actuellement désactivé. Activez-le pour améliorer l'indexation de votre site par les moteurs de recherche.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SitemapSettings;
