import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, MapPin, Database, Check, X, Loader2 } from 'lucide-react';
import { uploadPostalCodeFile, getUploadedFilesStatus, deleteUploadedFile, type CountryCode, type UploadStatus } from '@/services/postalCodeUploadService';

export const PostalCodeImport = () => {
  const [loading, setLoading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);

  const loadStatuses = async () => {
    try {
      const statuses = await getUploadedFilesStatus();
      setUploadStatuses(statuses);
    } catch (error) {
      console.error('Error loading upload statuses:', error);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, country: CountryCode) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadPostalCodeFile(file, country);
      
      if (result.success) {
        toast.success(`Fichier uploadé pour ${country}`);
        await loadStatuses();
      } else {
        toast.error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload du fichier');
    } finally {
      setLoading(false);
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleImport = async (country: CountryCode) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-postal-codes', {
        body: { 
          country: country,
          useUploadedFile: true
        }
      });

      if (error) throw error;

      toast.success(`Import réussi pour ${country}: ${data.processed} codes postaux traités`);
      await loadStatuses();
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast.error('Erreur lors de l\'import des codes postaux');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (country: CountryCode) => {
    try {
      const success = await deleteUploadedFile(country);
      
      if (success) {
        toast.success(`Fichier supprimé pour ${country}`);
        await loadStatuses();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du fichier');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import des Codes Postaux
          </CardTitle>
          <CardDescription>
            Gérez l'import des codes postaux via upload de fichiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Uploadez vos fichiers de codes postaux au format texte (un code postal par ligne)
          </div>
          
          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(['BE', 'FR', 'LU'] as CountryCode[]).map((country) => {
              const status = uploadStatuses.find(s => s.country === country);
              return (
                <Card key={country}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{country}</span>
                      </div>
                      {status?.uploaded && (
                        <Badge variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Uploadé
                        </Badge>
                      )}
                    </div>
                    
                    {status?.uploaded && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {status.fileName}
                        <br />
                        {status.uploadedAt && new Date(status.uploadedAt).toLocaleDateString()}
                        {status.size && ` • ${Math.round(status.size / 1024)} KB`}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".txt"
                        onChange={(e) => handleFileUpload(e, country)}
                        className="hidden"
                        id={`file-upload-${country}`}
                      />
                      <label htmlFor={`file-upload-${country}`}>
                        <Button variant="outline" className="w-full" asChild>
                          <span className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            {status?.uploaded ? 'Remplacer' : 'Upload'} fichier
                          </span>
                        </Button>
                      </label>
                      
                      {status?.uploaded && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleImport(country)}
                            disabled={loading}
                            size="sm"
                            className="flex-1"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Database className="h-4 w-4 mr-2" />
                                Importer
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleDeleteFile(country)}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Les fichiers doivent être au format .txt</p>
                <p>• Un code postal par ligne</p>
                <p>• Format recommandé : "Code\tVille" (séparés par une tabulation)</p>
                <p>• Taille maximale : 50 MB par fichier</p>
                <p>• Les fichiers remplacent automatiquement les anciens pour le même pays</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};