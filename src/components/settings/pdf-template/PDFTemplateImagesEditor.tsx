
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash, Image, Upload } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface ImageItem {
  id: string;
  page: number;
  url?: string;
  data?: string;
  description?: string;
}

interface PDFTemplateImagesEditorProps {
  images: ImageItem[];
  onUpdate: (images: ImageItem[]) => void;
}

const PDFTemplateImagesEditor: React.FC<PDFTemplateImagesEditorProps> = ({ images, onUpdate }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newImage, setNewImage] = useState<Partial<ImageItem>>({
    page: images.length,
    description: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleAddImage = async () => {
    if (!imageFile) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    try {
      // Convertir l'image en base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onload = () => {
        const imageData = reader.result as string;
        
        // Créer un nouvel objet image
        const newImageItem: ImageItem = {
          id: uuidv4(),
          page: newImage.page || 0,
          data: imageData,
          description: newImage.description || `Page ${newImage.page || 0 + 1}`
        };
        
        // Mettre à jour la liste des images
        onUpdate([...images, newImageItem]);
        
        // Réinitialiser le formulaire
        setIsAddDialogOpen(false);
        setNewImage({
          page: images.length + 1,
          description: ""
        });
        setImageFile(null);
        
        toast.success("Image ajoutée avec succès");
      };
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'image:", error);
      toast.error("Erreur lors de l'ajout de l'image");
    }
  };

  const handleDeleteImage = (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette image ?")) {
      return;
    }
    
    onUpdate(images.filter(img => img.id !== id));
    toast.success("Image supprimée avec succès");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Images du modèle</h3>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle image</DialogTitle>
                <DialogDescription>
                  Sélectionnez une image pour votre modèle PDF.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="image-page" className="text-right">
                    Numéro de page
                  </Label>
                  <Input
                    id="image-page"
                    type="number"
                    min="0"
                    value={newImage.page || 0}
                    onChange={(e) => setNewImage({...newImage, page: parseInt(e.target.value)})}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="image-description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="image-description"
                    value={newImage.description || ""}
                    onChange={(e) => setNewImage({...newImage, description: e.target.value})}
                    className="col-span-3"
                    placeholder="Description de l'image"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="image-file" className="text-right">
                    Fichier
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="image-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setImageFile(files[0]);
                        }
                      }}
                    />
                    
                    {imageFile && (
                      <div className="mt-2 p-2 border rounded bg-gray-50">
                        <p className="text-sm text-muted-foreground">
                          {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddImage} disabled={!imageFile}>
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {images.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-gray-50">
            <Image className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">Aucune image</h3>
            <p className="mt-1 text-sm text-gray-500">
              Ajoutez des images pour personnaliser l'arrière-plan de vos pages.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Ajouter une image
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aperçu</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.sort((a, b) => a.page - b.page).map((image) => (
                <TableRow key={image.id}>
                  <TableCell>
                    <div className="w-16 h-16 bg-gray-100 border flex items-center justify-center overflow-hidden">
                      {image.data ? (
                        <img
                          src={image.data}
                          alt={image.description || `Page ${image.page}`}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : image.url ? (
                        <img
                          src={image.url}
                          alt={image.description || `Page ${image.page}`}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <Image className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{image.page}</TableCell>
                  <TableCell>{image.description || `Page ${image.page}`}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateImagesEditor;
