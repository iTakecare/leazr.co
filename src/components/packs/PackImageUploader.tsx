import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/utils/imageUtils";
import { ensureBucket } from "@/services/fileStorage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PackImageUploaderProps {
  imageUrl?: string;
  onImageUpdate: (imageUrl: string | null) => void;
}

export const PackImageUploader: React.FC<PackImageUploaderProps> = ({
  imageUrl,
  onImageUpdate,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      // Ensure bucket exists
      await ensureBucket("pack-images");

      // Upload image
      const uploadedUrl = await uploadImage(file, "pack-images", "");
      
      if (uploadedUrl) {
        onImageUpdate(uploadedUrl);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, [onImageUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const removeImage = () => {
    onImageUpdate(null);
  };

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <Card className="relative">
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={imageUrl}
              alt="Pack image"
              className="h-full w-full object-cover"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <Card
          {...getRootProps()}
          className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Uploading image...
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4">
                  {isDragActive ? (
                    <Upload className="h-8 w-8 text-primary" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Drop the image here"
                      : "Drag & drop an image, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};