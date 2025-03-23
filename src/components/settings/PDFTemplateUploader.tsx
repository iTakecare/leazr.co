
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, Image as ImageIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Le reste du composant existant est conservé, mais on ajoute le support readOnly
const PDFTemplateUploader = ({ 
  templateImages = [], 
  onChange, 
  selectedPage = 0, 
  onPageSelect,
  readOnly = false 
}) => {
  const [images, setImages] = useState(templateImages || []);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [selectedPageInternal, setSelectedPage] = useState(selectedPage);

  // Synchroniser les images avec les props
  useEffect(() => {
    setImages(templateImages || []);
  }, [templateImages]);

  // Synchroniser la page sélectionnée avec les props
  useEffect(() => {
    setSelectedPage(selectedPage);
  }, [selectedPage]);

  // Gérer le changement de fichier
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Télécharger l'image
  const handleUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier à télécharger");
      return;
    }

    setUploading(true);

    try {
      const supabase = getSupabaseClient();
      
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_page_${newPageNumber}.${fileExt}`;
      const filePath = `template_images/${fileName}`;
      
      // Télécharger le fichier
      const { data, error } = await supabase.storage
        .from('pdf_templates')
        .upload(filePath, file);
        
      if (error) {
        console.error("Error uploading file:", error);
        toast.error(`Erreur lors du téléchargement: ${error.message}`);
        setUploading(false);
        return;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('pdf_templates')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        toast.error("Impossible d'obtenir l'URL publique de l'image");
        setUploading(false);
        return;
      }
      
      // Créer un nouvel objet d'image
      const newImage = {
        id: `page_${Date.now()}`,
        page: newPageNumber - 1,
        url: urlData.publicUrl,
        path: filePath
      };
      
      // Mettre à jour les images localement
      const updatedImages = [...images];
      
      // Vérifier si une image existe déjà pour cette page
      const existingIndex = updatedImages.findIndex(img => img.page === newPageNumber - 1);
      
      if (existingIndex >= 0) {
        // Remplacer l'image existante
        updatedImages[existingIndex] = newImage;
      } else {
        // Ajouter la nouvelle image
        updatedImages.push(newImage);
      }
      
      // Trier les images par numéro de page
      updatedImages.sort((a, b) => a.page - b.page);
      
      // Mettre à jour l'état local
      setImages(updatedImages);
      
      // Notifier le parent
      if (onChange) {
        onChange(updatedImages);
      }
      
      // Réinitialiser le formulaire
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Sélectionner la nouvelle page
      setSelectedPage(newPageNumber - 1);
      if (onPageSelect) {
        onPageSelect(newPageNumber - 1);
      }
      
      toast.success("Image téléchargée avec succès");
    } catch (error) {
      console.error("Error in upload process:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Supprimer une image
  const handleDeleteImage = async (imageId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette image ?")) {
      return;
    }
    
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      
      if (!imageToDelete) {
        return;
      }
      
      // Supprimer le fichier du stockage si nous avons un chemin
      if (imageToDelete.path) {
        const supabase = getSupabaseClient();
        
        const { error } = await supabase.storage
          .from('pdf_templates')
          .remove([imageToDelete.path]);
          
        if (error) {
          console.error("Error deleting file from storage:", error);
          // Continue anyway to remove from the UI
        }
      }
      
      // Mettre à jour les images localement
      const updatedImages = images.filter(img => img.id !== imageId);
      
      // Réindexer les pages si nécessaire
      const reindexedImages = updatedImages.map((img, index) => ({
        ...img,
        page: index
      }));
      
      // Mettre à jour l'état local
      setImages(reindexedImages);
      
      // Notifier le parent
      if (onChange) {
        onChange(reindexedImages);
      }
      
      // Ajuster la page sélectionnée si nécessaire
      const newSelectedPage = Math.min(selectedPageInternal, reindexedImages.length - 1);
      setSelectedPage(Math.max(0, newSelectedPage));
      if (onPageSelect) {
        onPageSelect(Math.max(0, newSelectedPage));
      }
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  // Dans la méthode de rendu, assurez-vous de désactiver les boutons en mode readOnly
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Télécharger des images de modèle</h3>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setSelectedPage(Math.max(0, selectedPageInternal - 1))}
            disabled={selectedPageInternal === 0 || images.length === 0}
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="py-2 px-3 bg-muted rounded-md text-sm font-medium">
            Page {selectedPageInternal + 1} / {Math.max(1, images.length)}
          </span>
          <Button 
            onClick={() => setSelectedPage(Math.min(images.length - 1, selectedPageInternal + 1))}
            disabled={selectedPageInternal >= images.length - 1 || images.length === 0}
            variant="outline"
            size="icon"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preview */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center min-h-[400px] bg-gray-50">
            {images.length > 0 && selectedPageInternal < images.length ? (
              <div className="relative w-full">
                <img 
                  src={images[selectedPageInternal].url} 
                  alt={`Template page ${selectedPageInternal + 1}`}
                  className="max-w-full max-h-[500px] mx-auto object-contain border rounded-md shadow-sm"
                  onError={(e) => {
                    console.error("Error loading image:", e.currentTarget.src);
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleDeleteImage(images[selectedPageInternal].id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune image de modèle disponible pour cette page</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload */}
        <div className="space-y-4">
          {!readOnly && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pageNumber">Numéro de page</Label>
                <Input 
                  id="pageNumber" 
                  type="number"
                  min="1"
                  value={newPageNumber} 
                  onChange={(e) => setNewPageNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Numéro de page"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">Fichier image (PNG, JPG, PDF)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={handleFileChange}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={handleUpload} 
                disabled={uploading || !file}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-current rounded-full"></div>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Télécharger l'image
                  </>
                )}
              </Button>
            </>
          )}
          
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Pages du modèle ({images.length})</h4>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <div 
                    key={image.id} 
                    className={`relative border rounded p-1 cursor-pointer ${selectedPageInternal === index ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                    onClick={() => {
                      setSelectedPage(index);
                      if (onPageSelect) onPageSelect(index);
                    }}
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-sm">
                      <img 
                        src={image.url} 
                        alt={`Template page ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Error loading thumbnail:", e.currentTarget.src);
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <span className="absolute top-0 left-0 bg-primary text-white text-xs px-1 rounded-bl rounded-tr">
                      {index + 1}
                    </span>
                  </div>
                ))}
                {!readOnly && (
                  <button
                    onClick={() => {
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) fileInput.click();
                    }}
                    className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="h-6 w-6 text-gray-400" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center border-2 border-dashed border-gray-200 rounded-md p-6 bg-gray-50">
                <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Aucune image de modèle</p>
                {!readOnly && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) fileInput.click();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une page
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFTemplateUploader;
