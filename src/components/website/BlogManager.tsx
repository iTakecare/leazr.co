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
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
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
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  getAllBlogPostsForAdmin, 
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost,
  BlogPost
} from "@/services/blogService";
import { useNavigate } from "react-router-dom";

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
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBlogPosts = async () => {
    setIsLoading(true);
    const data = await getAllBlogPostsForAdmin();
    setPosts(data);
    setIsLoading(false);
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
      return;
    }

    try {
      if (currentPost.id) {
        await updateBlogPost(currentPost.id, currentPost);
        toast({
          title: "Succès",
          description: "L'article a été mis à jour avec succès",
        });
      } else {
        await createBlogPost(currentPost as Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>);
        toast({
          title: "Succès",
          description: "L'article a été créé avec succès",
        });
      }
      
      loadBlogPosts();
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'article:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de l'article",
        variant: "destructive"
      });
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
    setCurrentPost({ ...currentPost, title: newTitle });
    
    if (!currentPost.slug || currentPost.slug === handleSlugify(currentPost.title || '')) {
      handleSlugify(newTitle);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Articles du blog</h2>
        <Button onClick={handleNewPost}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel article
        </Button>
      </div>

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
                  Aucun article trouvé. Créez votre premier article !
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      {currentPost?.image_url ? (
                        <img 
                          src={currentPost.image_url} 
                          alt="Aperçu" 
                          className="max-h-48 rounded"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                          <Plus className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="URL de l'image"
                      value={currentPost?.image_url || ""}
                      onChange={(e) => setCurrentPost({...currentPost, image_url: e.target.value})}
                      className="mt-4"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Entrez l'URL de l'image de couverture pour cet article
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Avatar de l'auteur</Label>
                <Input
                  type="text"
                  placeholder="URL de l'avatar"
                  value={currentPost?.author_avatar || ""}
                  onChange={(e) => setCurrentPost({...currentPost, author_avatar: e.target.value})}
                />
                <p className="text-sm text-gray-500">
                  Entrez l'URL de l'image de l'auteur
                </p>
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
              <Button onClick={handleSavePost}>
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
