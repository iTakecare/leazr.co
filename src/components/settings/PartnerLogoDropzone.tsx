import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PreviewFile {
  file: File;
  preview: string;
  name: string;
}

interface PartnerLogoDropzoneProps {
  onUpload: (files: { file: File; name: string }[]) => Promise<void>;
  isUploading?: boolean;
}

export const PartnerLogoDropzone = ({ onUpload, isUploading }: PartnerLogoDropzoneProps) => {
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPreviews = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
    }));
    setPreviewFiles((prev) => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeFile = (index: number) => {
    setPreviewFiles((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const updateFileName = (index: number, newName: string) => {
    setPreviewFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name: newName } : item))
    );
  };

  const handleUpload = async () => {
    const filesToUpload = previewFiles.map(({ file, name }) => ({ file, name }));
    await onUpload(filesToUpload);
    
    // Clean up previews
    previewFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    setPreviewFiles([]);
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed p-8 cursor-pointer transition-colors hover:border-primary/50",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {isDragActive
                ? "Déposez les logos ici"
                : "Glissez vos logos ici ou cliquez pour parcourir"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PNG, JPG, JPEG, SVG, WEBP (max. 5MB par fichier)
            </p>
          </div>
        </div>
      </Card>

      {previewFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {previewFiles.length} logo{previewFiles.length > 1 ? "s" : ""} sélectionné{previewFiles.length > 1 ? "s" : ""}
            </h3>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Upload en cours..." : "Uploader tous les logos"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previewFiles.map((item, index) => (
              <Card key={index} className="p-3 space-y-2">
                <div className="relative aspect-[2/1] bg-muted rounded-md overflow-hidden">
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="object-contain w-full h-full p-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Nom du partenaire</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateFileName(index, e.target.value)}
                    placeholder="Ex: Microsoft"
                    className="h-8 text-sm"
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
