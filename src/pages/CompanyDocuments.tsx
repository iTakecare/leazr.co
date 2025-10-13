import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getFileUploadClient } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export default function CompanyDocuments() {
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error("Seuls les fichiers PDF sont acceptés");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !companyId) {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }

    setIsUploading(true);
    try {
      const filePath = `company-${companyId}/documents/modalites_leasing_itakecare.pdf`;
      
      console.log('Uploading to:', filePath);
      
      const uploadClient = getFileUploadClient();
      const { error: uploadError } = await uploadClient.storage
        .from('platform-assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      toast.success("Document téléchargé avec succès");
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents de l'entreprise
          </CardTitle>
          <CardDescription>
            Gérez les documents de votre entreprise qui seront utilisés dans les emails automatiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="leasing-pdf" className="text-base font-medium">
                Modalités de Leasing (PDF)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Ce document sera joint automatiquement aux emails d'acceptation de leasing
              </p>
              <div className="flex items-center gap-4">
                <Input
                  id="leasing-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Téléchargement..." : "Télécharger"}
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Fichier sélectionné: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="font-medium mb-2">Information</h3>
            <p className="text-sm text-muted-foreground">
              Le document téléchargé sera stocké de manière sécurisée et isolée pour votre entreprise.
              Il sera automatiquement joint aux emails d'acceptation de leasing envoyés à vos clients.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
