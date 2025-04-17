
import React, { useState } from "react";
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

// Simulons des données de blog pour le prototype
const MOCK_POSTS = [
  { 
    id: 1, 
    title: "Comment le leasing de matériel reconditionné réduit l'empreinte carbone de votre entreprise",
    status: "published",
    author: "Marie Dupont",
    date: "12 avril 2025",
    category: "Développement durable" 
  },
  { 
    id: 2, 
    title: "Guide complet: Choisir le bon MacBook Pro pour votre équipe",
    status: "published",
    author: "Thomas Lambert",
    date: "5 avril 2025",
    category: "Matériel" 
  },
  { 
    id: 3, 
    title: "5 avantages fiscaux du leasing de matériel informatique",
    status: "draft",
    author: "Sophie Leroy",
    date: "En cours de rédaction",
    category: "Finance" 
  },
];

const CATEGORIES = [
  "Développement durable",
  "Matériel",
  "Finance",
  "Tendances",
  "Témoignages",
  "Maintenance"
];

const BlogManager = () => {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>(null);

  const handleNewPost = () => {
    setCurrentPost({
      id: null,
      title: "",
      content: "",
      excerpt: "",
      status: "draft",
      category: "",
      author: "",
      metaTitle: "",
      metaDescription: ""
    });
    setIsEditing(true);
  };

  const handleEditPost = (post: any) => {
    // Dans un cas réel, nous chargerions tout le contenu depuis la base de données
    setCurrentPost({
      ...post,
      content: "<p>Contenu de l'article...</p>",
      excerpt: "Extrait de l'article...",
      metaTitle: post.title,
      metaDescription: "Description de l'article pour les moteurs de recherche."
    });
    setIsEditing(true);
  };

  const handleSavePost = () => {
    // TODO: Implémenter la sauvegarde dans la base de données
    console.log("Sauvegarder l'article", currentPost);
    setIsEditing(false);
  };

  const handleDeletePost = (postId: number) => {
    // TODO: Implémenter la suppression dans la base de données
    console.log("Supprimer l'article", postId);
    setPosts(posts.filter(post => post.id !== postId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Articles du blog</h2>
        <Button onClick={handleNewPost}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel article
        </Button>
      </div>

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
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium">{post.title}</TableCell>
              <TableCell>{post.category}</TableCell>
              <TableCell>{post.author}</TableCell>
              <TableCell>{post.date}</TableCell>
              <TableCell>
                {post.status === "published" ? (
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
                <Button variant="ghost" size="icon">
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
          ))}
        </TableBody>
      </Table>

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
                <Label htmlFor="title">Titre</Label>
                <Input 
                  id="title" 
                  value={currentPost?.title || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
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
                    value={currentPost?.author || ""} 
                    onChange={(e) => setCurrentPost({...currentPost, author: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="excerpt">Extrait</Label>
                <Textarea 
                  id="excerpt" 
                  value={currentPost?.excerpt || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, excerpt: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <RichTextEditor 
                  value={currentPost?.content || ""} 
                  onChange={(value) => setCurrentPost({...currentPost, content: value})}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Titre SEO</Label>
                <Input 
                  id="metaTitle" 
                  value={currentPost?.metaTitle || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, metaTitle: e.target.value})}
                />
                <p className="text-sm text-gray-500">
                  Le titre qui apparaîtra dans les résultats de recherche. Idéalement entre 50 et 60 caractères.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Description SEO</Label>
                <Textarea 
                  id="metaDescription" 
                  value={currentPost?.metaDescription || ""} 
                  onChange={(e) => setCurrentPost({...currentPost, metaDescription: e.target.value})}
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
                      {currentPost?.image ? (
                        <img 
                          src={currentPost.image} 
                          alt="Aperçu" 
                          className="max-h-48 rounded"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                          <Plus className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Glissez-déposez une image ici ou
                    </p>
                    <Button variant="outline" size="sm">
                      Parcourir
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <div className="flex items-center gap-2">
              <Select 
                value={currentPost?.status || "draft"} 
                onValueChange={(value) => setCurrentPost({...currentPost, status: value})}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
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
