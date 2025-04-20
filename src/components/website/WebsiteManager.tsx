
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageEditor from "./PageEditor";
import BlogManager from "./BlogManager";
import SeoSettings from "./SeoSettings";
import SitemapSettings from "./SitemapSettings";
import SocialSettings from "./SocialSettings";
import RedirectionManager from "./RedirectionManager";
import TranslationManager from "./TranslationManager";
import { Globe } from "lucide-react";

const WebsiteManager = () => {
  const [activeTab, setActiveTab] = useState("pages");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion du Site Web</h1>
        <p className="text-gray-500">Gérez les pages, les paramètres SEO et le contenu de votre site</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="social">Réseaux Sociaux</TabsTrigger>
          <TabsTrigger value="redirections">Redirections</TabsTrigger>
          <TabsTrigger value="translations">Traductions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Pages</CardTitle>
              <CardDescription>
                Modifiez les titres, textes et images des pages statiques du site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PageEditor />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="blog">
          <Card>
            <CardHeader>
              <CardTitle>Gestion du Blog</CardTitle>
              <CardDescription>
                Gérez les articles, catégories et tags du blog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlogManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres SEO</CardTitle>
              <CardDescription>
                Configurez les balises meta, titres et descriptions pour le référencement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeoSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle>Gestion du Sitemap</CardTitle>
              <CardDescription>
                Configurez le sitemap XML et le fichier robots.txt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SitemapSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Réseaux Sociaux</CardTitle>
              <CardDescription>
                Configurez les métadonnées pour le partage sur les réseaux sociaux
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SocialSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="redirections">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Redirections</CardTitle>
              <CardDescription>
                Configurez les redirections 301, 302 et autres règles d'URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RedirectionManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="translations">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Traductions</CardTitle>
              <CardDescription>
                Gérez les traductions du site en français, anglais, néerlandais et allemand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TranslationManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebsiteManager;
