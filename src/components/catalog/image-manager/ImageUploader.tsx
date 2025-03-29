
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, RefreshCw } from "lucide-react";

interface ImageUploaderProps {
  isUploading: boolean;
  isLoadingImages: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRetry: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  isUploading,
  isLoadingImages,
  handleFileChange,
  handleRetry
}) => {
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="image-upload" className="cursor-pointer">
        <div className="flex items-center gap-2 px-4 py-2 border rounded bg-background hover:bg-accent">
          <Upload className="w-4 h-4" />
          <span>Télécharger des images</span>
        </div>
      </Label>
      <Input
        id="image-upload"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleRetry}
        disabled={isUploading || isLoadingImages}
      >
        {isLoadingImages ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Actualiser
      </Button>
    </div>
  );
};

export default ImageUploader;
