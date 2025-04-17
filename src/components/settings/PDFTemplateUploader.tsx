
import React from 'react';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { uploadFileDirectly, ensureBucketExists } from "@/services/directFileUploadService";

interface PDFTemplateUploaderProps {
  onFileUploaded?: (url: string, fileName: string) => void;
  allowedTypes?: string;
  bucketName?: string;
  folderPath?: string;
  label?: string;
  description?: string;
  buttonText?: string;
}

const PDFTemplateUploader: React.FC<PDFTemplateUploaderProps> = ({
  onFileUploaded,
  allowedTypes = "application/pdf",
  bucketName = "pdf-templates",
  folderPath = "",
  label = "Télécharger un modèle PDF",
  description = "Sélectionnez un fichier PDF à télécharger",
  buttonText = "Sélectionner un fichier"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (uploadSuccess || uploadError) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
        setUploadError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess, uploadError]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileSelected(file);
    setUploadSuccess(false);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!fileSelected) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    setUploadError(null);

    try {
      // Ensure bucket exists
      await ensureBucketExists(bucketName);
      
      // Use our new direct upload method
      const result = await uploadFileDirectly(fileSelected, bucketName, folderPath);
      
      if (result && result.url) {
        if (onFileUploaded) {
          onFileUploaded(result.url, fileSelected.name);
        }
        setUploadSuccess(true);
        toast.success("Fichier téléchargé avec succès");
      } else {
        setUploadError("Échec du téléchargement du fichier");
        toast.error("Échec du téléchargement du fichier");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      setUploadError("Erreur de téléchargement du fichier");
      toast.error("Erreur de téléchargement du fichier");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-upload">{label}</Label>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          </div>

          <div className="flex items-center gap-4">
            <Label 
              htmlFor="pdf-upload" 
              className="flex-1 cursor-pointer flex items-center justify-center gap-2 h-10 px-4 py-2 border rounded-md hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {buttonText}
            </Label>
            <Input
              id="pdf-upload"
              type="file"
              accept={allowedTypes}
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            
            <Button
              onClick={handleUpload}
              disabled={!fileSelected || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                "Télécharger"
              )}
            </Button>
          </div>

          {fileSelected && (
            <div className="flex items-center gap-2 p-2 border rounded bg-muted/50">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate flex-1">
                {fileSelected.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(fileSelected.size / 1024).toFixed(0)} KB
              </span>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Fichier téléchargé avec succès</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFTemplateUploader;
