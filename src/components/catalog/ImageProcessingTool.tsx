
import React, { useState, useRef, useEffect } from "react";
import { removeBackground } from "@/utils/imageProcessor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Camera, Upload, Image as ImageIcon, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface ImageProcessingToolProps {
  productName: string;
  productBrand: string;
  onImageProcessed: (file: File) => void;
}

const ImageProcessingTool: React.FC<ImageProcessingToolProps> = ({
  productName,
  productBrand,
  onImageProcessed
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (imgRef.current && e.target?.result) {
          imgRef.current.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!selectedImage || !canvasRef.current || !imgRef.current) {
      toast.error("Please select an image first");
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      
      // Attend que l'image soit complètement chargée
      if (!img.complete) {
        await new Promise(resolve => {
          img.onload = resolve;
        });
      }
      
      // Ajuster la taille du canvas à celle de l'image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Appliquer le traitement d'image
      await removeBackground(canvas, img);
      
      // Convertir le canvas en Blob puis en File
      canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], "processed-" + selectedImage.name, { 
            type: "image/png" 
          });
          
          setProcessedImage(URL.createObjectURL(blob));
          onImageProcessed(processedFile);
        }
      }, "image/png");
      
      toast.success("Image processed successfully!");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performImageSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      // Simulation de recherche d'image - Remplacer par une API réelle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Exemples de résultats (simulés)
      const mockResults = [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1000&auto=format&fit=crop',
      ];
      
      setSearchResults(mockResults);
      toast.success("Image search completed");
    } catch (error) {
      console.error("Error searching images:", error);
      toast.error("Failed to search images. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (imageUrl: string) => {
    try {
      setIsProcessing(true);
      
      // Télécharger l'image depuis l'URL
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `search-result-${Date.now()}.jpg`, { type: blob.type });
      
      setSelectedImage(file);
      
      if (imgRef.current) {
        imgRef.current.src = URL.createObjectURL(file);
        
        // Attendre que l'image soit chargée avant de procéder
        if (!imgRef.current.complete) {
          await new Promise(resolve => {
            imgRef.current!.onload = resolve;
          });
        }
        
        // Passer à l'onglet de traitement
        setActiveTab("process");
      }
      
      toast.success("Image selected. You can now process it.");
    } catch (error) {
      console.error("Error selecting image:", error);
      toast.error("Failed to select image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="upload" className="flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="search" className="flex items-center">
          <Search className="h-4 w-4 mr-2" />
          Search
        </TabsTrigger>
        <TabsTrigger value="process" className="flex items-center" disabled={!selectedImage}>
          <RotateCw className="h-4 w-4 mr-2" />
          Process
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="mt-0">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input 
                id="image-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="mt-1"
              />
            </div>
            
            {selectedImage && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Image:</p>
                <div className="border border-border rounded-md p-2 bg-muted/20">
                  <p className="text-sm">{selectedImage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(selectedImage.size / 1024)} KB
                  </p>
                </div>
                <img
                  ref={imgRef}
                  src=""
                  alt="Preview"
                  className="mt-2 max-h-40 rounded-md object-contain hidden"
                />
                
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setActiveTab("process")}>
                    Continue to Processing
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </TabsContent>
      
      <TabsContent value="search" className="mt-0">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={`Search for ${productName || 'product'} images...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={performImageSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Search Results:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {searchResults.map((url, index) => (
                    <div 
                      key={index} 
                      className="border border-border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={() => selectSearchResult(url)}
                    >
                      <img 
                        src={url} 
                        alt={`Search result ${index+1}`} 
                        className="w-full aspect-square object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </TabsContent>
      
      <TabsContent value="process" className="mt-0">
        <CardContent className="p-4">
          {selectedImage ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Original Image:</p>
                  <div className="border border-border rounded-md overflow-hidden bg-muted/20 p-2">
                    <img
                      ref={imgRef}
                      src={selectedImage ? URL.createObjectURL(selectedImage) : ""}
                      alt="Original"
                      className="max-h-40 w-full object-contain"
                    />
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Processed Image:</p>
                  <div className="border border-border rounded-md overflow-hidden bg-muted/20 p-2 relative" style={{ minHeight: "150px" }}>
                    {processedImage ? (
                      <img
                        src={processedImage}
                        alt="Processed"
                        className="max-h-40 w-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">
                          Processed image will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedImage(null);
                    setProcessedImage(null);
                    setActiveTab("upload");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={processImage} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4 mr-2" />
                      Process Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                Please select an image first
              </p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setActiveTab("upload")}
              >
                Go to Upload
              </Button>
            </div>
          )}
        </CardContent>
      </TabsContent>
    </Tabs>
  );
};

export default ImageProcessingTool;
