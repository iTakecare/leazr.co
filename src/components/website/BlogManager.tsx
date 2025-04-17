import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Plus, Pencil, Trash2, Eye, Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  getAllBlogPostsForAdmin, 
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost,
  addDemoBlogPost,
  BlogPost
} from "@/services/blogService";
import { uploadImage } from "@/utils/imageUtils";
import { uploadImage as uploadImageAdvanced } from "@/services/fileUploadService";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CATEGORIES = [
  "Développement durable",
  "Matériel",
  "Finance",
  "Tendances",
  "Témoignages",
  "Maintenance"
];

const BlogManager = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBlogPosts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Tentative de chargement des articles du blog...");
      const data = await getAllBlogPostsForAdmin();
      console.log("Blog posts loaded:", data);
      setPosts(data);
      
      if (data.length === 0) {
        console.log("Aucun article trouvé dans la réponse");
      }
    } catch (error: any) {
      console.error("Error loading blog posts:", error);
      setError(`Impossible de charger les articles du blog: ${error.message}`);
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles du blog",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlogPosts();
  }, []);

  const handleNewPost = () => {
    setCurrentPost({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: CATEGORIES[0],
      is_published: false,
      is_featured: false,
      author_name: "",
      author_role: "",
      meta_title: "",
      meta_description: ""
    });
    setIsEditing(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setCurrentPost({
      ...post
    });
    setIsEditing(true);
  };

  const handleSavePost = async () => {
    if (!currentPost || !currentPost.title || !currentPost.content || !currentPost.category) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      console.error("Validation échouée:", { 
        title: currentPost?.title, 
        content: currentPost?.content?.substring(0, 50) + "...",
        category: currentPost?.category
      });
      return;
    }

    if (!currentPost.slug) {
      const newSlug = handleSlugify(currentPost.title);
      console.log(`Génération du slug automatique: "${currentPost.title}" -> "${newSlug}"`);
      setCurrentPost(prev => ({
        ...prev,
        slug: newSlug
      }));
    }

    try {
      setIsUploading(true);
      console.log("Début de la sauvegarde de l'article...");
      console.log("Données de l'article:", JSON.stringify({
        ...currentPost,
        content: currentPost.content?.substring(0, 100) + "..."
      }, null, 2));
      
      let result = null;
      
      if (currentPost.id) {
        console.log("Mise à jour de l'article existant:", currentPost.id);
        result = await updateBlogPost(currentPost.id, currentPost);
        
        if (result) {
          console.log("Article mis à jour avec succès:", result.id);
          toast({
            title: "Succès",
            description: "L'article a été mis à jour avec succès",
          });
        } else {
          console.error("Échec de la mise à jour de l'article");
          toast({
            title: "Erreur",
            description: "La mise à jour de l'article a échoué",
            variant: "destructive"
          });
        }
      } else {
        console.log("Création d'un nouvel article");
        const postToCreate = {
          ...currentPost,
          slug: currentPost.slug || handleSlugify(currentPost.title)
        } as Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
        
        result = await createBlogPost(postToCreate);
        
        if (result) {
          console.log("Article créé avec succès:", result.id);
          toast({
            title: "Succès",
            description: "L'article a été créé avec succès",
          });
        } else {
          console.error("Échec de la création de l'article");
          toast({
            title: "Erreur",
            description: "La création de l'article a échoué",
            variant: "destructive"
          });
        }
      }
      
      if (result) {
        await loadBlogPosts();
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement de l'article:", error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue lors de l'enregistrement: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const success = await deleteBlogPost(postId);
      
      if (success) {
        toast({
          title: "Succès",
          description: "L'article a été supprimé avec succès",
        });
        
        loadBlogPosts();
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression de l'article",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'article:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'article",
        variant: "destructive"
      });
    }
  };

  const handleSlugify = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with dashes
      .replace(/--+/g, '-')     // Remove multiple dashes
      .trim();
  };

  const handleViewPost = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPost) return;
    
    const newTitle = e.target.value;
    const newSlug = currentPost.slug === '' || 
                   (currentPost.slug && currentPost.title && 
                    currentPost.slug === handleSlugify(currentPost.title)) 
                   ? handleSlugify(newTitle) 
                   : currentPost.slug;
    
    setCurrentPost({ 
      ...currentPost, 
      title: newTitle,
      slug: newSlug
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPost) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const file = files[0];
      
      console.log("Téléchargement du fichier image:", file.name, "taille:", file.size);
      toast({
        title: "Information",
        description: "Téléchargement de l'image en cours...",
      });
      
      let imageUrl: string | null = null;
      let uploadError: any = null;
      
      try {
        console.log("Tentative d'utilisation du service fileUploadService...");
        const result = await uploadImageAdvanced(file, 'blog-images');
        if (result?.url) {
          imageUrl = result.url;
          console.log("Image téléchargée avec succès via le service avancé:", imageUrl);
        } else {
          console.warn("Le service avancé n'a pas retourné d'URL");
        }
      } catch (advancedError: any) {
        console.warn("Erreur avec le service avancé:", advancedError);
        uploadError = advancedError;
      }
      
      if (!imageUrl) {
        console.log("Tentative d'utilisation du service basique...");
        try {
          imageUrl = await uploadImage(file, 'blog-images');
          if (imageUrl) {
            console.log("Image téléchargée avec succès via le service basique:", imageUrl);
          } else {
            console.warn("Le service basique n'a pas retourné d'URL");
          }
        } catch (basicError: any) {
          console.error("Erreur avec le service basique:", basicError);
          uploadError = uploadError || basicError;
        }
      }
      
      if (!imageUrl) {
        try {
          console.log("Tentative d'upload direct via fetch...");
          
          const formData = new FormData();
          formData.append('file', file);
          
          const url = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/blog-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw`
            },
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            const bucketName = 'blog-images';
            const filePath = data.Key.split(`${bucketName}/`)[1];
            
            const imageUrl = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
            console.log("Image téléchargée avec succès via fetch direct:", imageUrl);
          } else {
            console.error("Échec de l'upload direct:", await response.text());
          }
        } catch (fetchError: any) {
          console.error("Erreur lors de l'upload direct:", fetchError);
          uploadError = uploadError || fetchError;
        }
      }
      
      if (imageUrl) {
        console.log("Image téléchargée avec succès, URL finale:", imageUrl);
        
        setCurrentPost(prevState => {
          if (!prevState) return null;
          return { ...prevState, image_url: imageUrl };
        });
        
        toast({
          title: "Succès",
          description: "L'image a été téléchargée avec succès",
        });
      } else {
        const errorMessage = uploadError ? `${uploadError.message}` : "Échec du téléchargement de l'image";
        console.error(errorMessage);
        toast({
          title: "Erreur",
          description: `Échec de l'upload: ${errorMessage}`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Erreur lors du téléchargement de l'image:", error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue lors du téléchargement: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddDemoPost = async () => {
    try {
      setIsLoading(true);
      const newPost = await addDemoBlogPost();
      
      if (newPost) {
        toast({
          title: "Succès",
          description: "L'article de démonstration a été créé avec succès",
        });
        loadBlogPosts();
      } else {
        throw new Error("Échec de la création de l'article démo");
      }
    } catch (error: any) {
      console.error("Erreur lors de la création de l'article de démonstration:", error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Articles du blog</h2>
        <div className="flex gap-2">
          {posts.length === 0 && (
            <Button variant="outline" onClick={handleAddDemoPost} disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un article démo
            </Button>
          )}
          <Button onClick={handleNewPost}>
            <Plus className="mr-2 h-4 w-4" /> Nouvel article
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="py-8 text-center">Chargement des articles...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Aucun article trouvé. Créez votre premier article ou ajoutez un article de démonstration !
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.category}</TableCell>
                  <TableCell>{post.author_name || "Non spécifié"}</TableCell>
                  <TableCell>
                    {new Date(post.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {post.is_published ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Publié
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Brouillon
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPost(post)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewPost(post.slug)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {currentPost?.id ? "Modifier l'article" : "Nouvel article"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations de l'article et cliquez sur Enregistrer quand vous avez terminé.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList>
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="media">Média</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input 
                  id="title" 
                  value={currentPost?.title || ""} 
                  onChange={handleTitleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug URL *</Label>
                <Input 
                  id="slug" 
                  value={currentPost?.slug || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, slug: e.target.value})}
                />
                <p className="text-sm text-gray-500">
                  Identifiant unique utilisé dans l'URL de l'article (ex: mon-article)
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select 
                    value={currentPost?.category || ""} 
                    onValueChange={(value) => setCurrentPost({...currentPost, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="author">Auteur</Label>
                  <Input 
                    id="author" 
                    value={currentPost?.author_name || ""} 
                    onChange={(e) => setCurrentPost({...currentPost, author_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="author_role">Fonction de l'auteur</Label>
                <Input 
                  id="author_role" 
                  value={currentPost?.author_role || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, author_role: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="excerpt">Extrait</Label>
                <Textarea 
                  id="excerpt" 
                  value={currentPost?.excerpt || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, excerpt: e.target.value})}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Court résumé de l'article qui apparaîtra dans les listes d'articles
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Contenu *</Label>
                <RichTextEditor 
                  value={currentPost?.content || ""} 
                  onChange={(value) => setCurrentPost({...currentPost, content: value})}
                  className="min-h-[300px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="read_time">Temps de lecture</Label>
                <Input 
                  id="read_time" 
                  value={currentPost?.read_time || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, read_time: e.target.value})}
                  placeholder="Ex: 5 minutes de lecture"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Titre SEO</Label>
                <Input 
                  id="metaTitle" 
                  value={currentPost?.meta_title || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, meta_title: e.target.value})}
                />
                <p className="text-sm text-gray-500">
                  Le titre qui apparaîtra dans les résultats de recherche. Idéalement entre 50 et 60 caractères.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Description SEO</Label>
                <Textarea 
                  id="metaDescription" 
                  value={currentPost?.meta_description || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, meta_description: e.target.value})}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  La description qui apparaîtra dans les résultats de recherche. Idéalement entre 150 et 160 caractères.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Image principale</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      {currentPost?.image_url ? (
                        <img 
                          src={currentPost.image_url} 
                          alt="Aperçu" 
                          className="max-h-48 rounded"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                          <Upload className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="image">Télécharger une image</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Formats acceptés: JPG, PNG, GIF, WEBP (max 5MB)
                      </p>
                      
                      {isUploading && (
                        <div className="text-center text-sm text-blue-500">
                          Upload en cours...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Label htmlFor="is_published" className="text-sm">Publié</Label>
                <input
                  type="checkbox"
                  id="is_published"
                  checked={currentPost?.is_published || false}
                  onChange={(e) => setCurrentPost({...currentPost, is_published: e.target.checked})}
                  className="rounded"
                />
              </div>
              <div className="flex items-center gap-2 mr-4">
                <Label htmlFor="is_featured" className="text-sm">En vedette</Label>
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={currentPost?.is_featured || false}
                  onChange={(e) => setCurrentPost({...currentPost, is_featured: e.target.checked})}
                  className="rounded"
                />
              </div>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button onClick={handleSavePost} disabled={isUploading}>
                {isUploading ? "Upload en cours..." : "Enregistrer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
