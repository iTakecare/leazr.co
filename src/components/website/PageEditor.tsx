
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/ui/rich-text-editor";

// Pages statiques du site
const STATIC_PAGES = [
  { id: "home", name: "Accueil" },
  { id: "about", name: "À propos" },
  { id: "services", name: "Services" },
  { id: "durability", name: "Durabilité" },
  { id: "solutions", name: "Solutions" },
  { id: "contact", name: "Contact" },
];

const PageEditor = () => {
  const [selectedPage, setSelectedPage] = useState(STATIC_PAGES[0].id);
  const [pageContent, setPageContent] = useState({
    title: "Page d'accueil",
    metaTitle: "iTakecare - Location d'équipement informatique reconditionné",
    metaDescription: "iTakecare propose la location d'équipement informatique reconditionné pour les entreprises.",
    content: "<p>Contenu de la page d'accueil</p>",
  });

  const handleSave = () => {
    // TODO: Implémenter la sauvegarde des données dans la base de données
    console.log("Sauvegarde de la page", selectedPage, pageContent);
  };

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
    // TODO: Charger les données de la page sélectionnée depuis la base de données
    // Pour l'instant, on simule avec des données statiques
    const pageData = {
      title: `Page ${pageId}`,
      metaTitle: `iTakecare - ${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`,
      metaDescription: `Description de la page ${pageId}`,
      content: `<p>Contenu de la page ${pageId}</p>`,
    };
    setPageContent(pageData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Label htmlFor="page-select">Sélectionnez une page :</Label>
          <Select value={selectedPage} onValueChange={handlePageSelect}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionnez une page" />
            </SelectTrigger>
            <SelectContent>
              {STATIC_PAGES.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  {page.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave}>Enregistrer les modifications</Button>
      </div>

      <Separator />

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la page</Label>
            <Input 
              id="title" 
              value={pageContent.title}
              onChange={(e) => setPageContent({...pageContent, title: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Contenu de la page</Label>
            <RichTextEditor 
              value={pageContent.content}
              onChange={(value) => setPageContent({...pageContent, content: value})}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="seo" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Titre SEO</Label>
            <Input 
              id="metaTitle" 
              value={pageContent.metaTitle}
              onChange={(e) => setPageContent({...pageContent, metaTitle: e.target.value})}
            />
            <p className="text-sm text-gray-500">
              Le titre qui apparaîtra dans les résultats de recherche. Idéalement entre 50 et 60 caractères.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Description SEO</Label>
            <Input 
              id="metaDescription" 
              value={pageContent.metaDescription}
              onChange={(e) => setPageContent({...pageContent, metaDescription: e.target.value})}
            />
            <p className="text-sm text-gray-500">
              La description qui apparaîtra dans les résultats de recherche. Idéalement entre 150 et 160 caractères.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PageEditor;
