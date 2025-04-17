
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PageEditor = () => {
  const [selectedPage, setSelectedPage] = useState("");
  const [pageContent, setPageContent] = useState({
    title: "",
    metaTitle: "",
    metaDescription: "",
    content: "",
    slug: ""
  });
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  // Charger la liste des pages depuis Supabase
  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages_cms')
        .select('*')
        .order('title');
      
      if (error) throw error;
      
      setPages(data);
      
      // Sélectionner la première page par défaut
      if (data.length > 0 && !selectedPage) {
        setSelectedPage(data[0].slug);
        loadPageContent(data[0].slug);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des pages:", error);
      setError("Impossible de charger les pages. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  // Charger le contenu d'une page spécifique
  const loadPageContent = async (slug) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages_cms')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      
      setPageContent({
        title: data.title,
        metaTitle: data.meta_title || "",
        metaDescription: data.meta_description || "",
        content: data.content,
        slug: data.slug
      });
    } catch (error) {
      console.error("Erreur lors du chargement du contenu de la page:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le contenu de la page.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les modifications d'une page
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pages_cms')
        .update({
          title: pageContent.title,
          meta_title: pageContent.metaTitle,
          meta_description: pageContent.metaDescription,
          content: pageContent.content,
          updated_at: new Date()
        })
        .eq('slug', pageContent.slug);
      
      if (error) throw error;
      
      toast({
        title: "Modifications enregistrées",
        description: "Le contenu de la page a été mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des modifications:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer les modifications. Veuillez réessayer plus tard.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Charger les pages au chargement du composant
  useEffect(() => {
    fetchPages();
  }, []);

  // Charger le contenu quand la page sélectionnée change
  const handlePageSelect = (pageSlug) => {
    setSelectedPage(pageSlug);
    loadPageContent(pageSlug);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Label htmlFor="page-select">Sélectionnez une page :</Label>
          {loading ? (
            <div className="w-[180px] h-10 bg-muted rounded-md flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedPage} onValueChange={handlePageSelect}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionnez une page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.slug} value={page.slug}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer les modifications"
          )}
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
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

            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Aperçu du fichier associé :</p>
              <code className="text-xs block bg-background p-2 rounded overflow-auto max-h-48">
                {`src/pages/${pageContent.slug.charAt(0).toUpperCase() + pageContent.slug.slice(1)}Page.tsx`}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Les modifications apportées ici seront reflétées dans la page correspondante.
              </p>
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
      )}
    </div>
  );
};

export default PageEditor;
