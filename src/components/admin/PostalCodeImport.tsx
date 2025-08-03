import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Database, MapPin, CheckCircle, AlertCircle, Loader2, Upload, File, Trash2 } from 'lucide-react';
import { uploadPostalCodeFile, getUploadedFilesStatus, deleteUploadedFile, type CountryCode, type UploadStatus } from '@/services/postalCodeUploadService';

interface PostalCodeStats {
  country_code: string;
  country_name: string;
  postal_code_count: number;
  last_updated: string;
}

interface ImportStatus {
  country: string;
  isImporting: boolean;
  progress: number;
  status: 'idle' | 'importing' | 'success' | 'error';
  message?: string;
}

const COUNTRIES = [
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' }
];

export const PostalCodeImport: React.FC = () => {
  const [stats, setStats] = useState<PostalCodeStats[]>([]);
  const [importStatuses, setImportStatuses] = useState<Map<string, ImportStatus>>(new Map());
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [uploading, setUploading] = useState<Set<CountryCode>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_postal_code_stats');
      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error loading postal code stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUploadStatuses = async () => {
    try {
      const statuses = await getUploadedFilesStatus();
      setUploadStatuses(statuses);
    } catch (error) {
      console.error('Error loading upload statuses:', error);
    }
  };

  useEffect(() => {
    loadStats();
    loadUploadStatuses();
  }, []);

  const handleImport = async (countryCode: string, useUploadedFile = false) => {
    const newStatus: ImportStatus = {
      country: countryCode,
      isImporting: true,
      progress: 0,
      status: 'importing'
    };

    setImportStatuses(prev => new Map(prev).set(countryCode, newStatus));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportStatuses(prev => {
          const current = prev.get(countryCode);
          if (current && current.progress < 90) {
            const updated = { ...current, progress: current.progress + 10 };
            return new Map(prev).set(countryCode, updated);
          }
          return prev;
        });
      }, 2000);

      const { data, error } = await supabase.functions.invoke('import-postal-codes', {
        body: { country: countryCode, useUploadedFile }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      const successStatus: ImportStatus = {
        country: countryCode,
        isImporting: false,
        progress: 100,
        status: 'success',
        message: `Import réussi: ${data.processed} codes postaux importés`
      };

      setImportStatuses(prev => new Map(prev).set(countryCode, successStatus));
      toast.success(`Import terminé pour ${COUNTRIES.find(c => c.code === countryCode)?.name}`);
      
      // Reload stats
      await loadStats();

    } catch (error: any) {
      const errorStatus: ImportStatus = {
        country: countryCode,
        isImporting: false,
        progress: 0,
        status: 'error',
        message: error.message || 'Erreur lors de l\'import'
      };

      setImportStatuses(prev => new Map(prev).set(countryCode, errorStatus));
      toast.error(`Erreur lors de l'import pour ${COUNTRIES.find(c => c.code === countryCode)?.name}`);
    }
  };

  const handleFileUpload = async (file: File, country: CountryCode) => {
    setUploading(prev => new Set(prev).add(country));
    
    try {
      const result = await uploadPostalCodeFile(file, country);
      
      if (result.success) {
        toast.success(`Fichier uploadé pour ${COUNTRIES.find(c => c.code === country)?.name}`);
        await loadUploadStatuses();
      } else {
        toast.error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(prev => {
        const newSet = new Set(prev);
        newSet.delete(country);
        return newSet;
      });
    }
  };

  const handleDeleteUploadedFile = async (country: CountryCode) => {
    try {
      const success = await deleteUploadedFile(country);
      
      if (success) {
        toast.success(`Fichier supprimé pour ${COUNTRIES.find(c => c.code === country)?.name}`);
        await loadUploadStatuses();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du fichier');
    }
  };

  const getCountryStats = (countryCode: string) => {
    return stats.find(s => s.country_code === countryCode);
  };

  const getImportStatus = (countryCode: string) => {
    return importStatuses.get(countryCode);
  };

  const getUploadStatus = (countryCode: CountryCode) => {
    return uploadStatuses.find(s => s.country === countryCode);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Chargement des statistiques...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import des codes postaux
          </CardTitle>
          <CardDescription>
            Importez tous les codes postaux pour la Belgique, la France et le Luxembourg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="download" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Téléchargement automatique
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload de fichiers
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="download" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground mb-4">
                Import automatique depuis GeoNames (nécessite une connexion internet)
              </div>
              
              {COUNTRIES.map(country => {
                const countryStats = getCountryStats(country.code);
                const importStatus = getImportStatus(country.code);

                return (
                  <div key={country.code} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <h3 className="font-semibold">{country.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code pays: {country.code}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {countryStats && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {countryStats.postal_code_count.toLocaleString()} codes
                          </Badge>
                        )}
                        
                        {importStatus?.status === 'success' && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Importé
                          </Badge>
                        )}
                        
                        {importStatus?.status === 'error' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Erreur
                          </Badge>
                        )}
                      </div>
                    </div>

                    {importStatus?.isImporting && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Import en cours...</span>
                          <span className="text-sm">{importStatus.progress}%</span>
                        </div>
                        <Progress value={importStatus.progress} className="h-2" />
                      </div>
                    )}

                    {importStatus?.message && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {importStatus.message}
                      </p>
                    )}

                    {countryStats && (
                      <div className="text-sm text-muted-foreground mb-4">
                        Dernière mise à jour: {new Date(countryStats.last_updated).toLocaleDateString('fr-FR')}
                      </div>
                    )}

                    <Button
                      onClick={() => handleImport(country.code, false)}
                      disabled={importStatus?.isImporting}
                      className="w-full sm:w-auto"
                      variant={countryStats ? "outline" : "default"}
                    >
                      {importStatus?.isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Import en cours...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          {countryStats ? 'Réimporter' : 'Importer'}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </TabsContent>
            
            <TabsContent value="upload" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground mb-4">
                Uploadez vos propres fichiers GeoNames (.txt format)
              </div>
              
              {COUNTRIES.map(country => {
                const countryStats = getCountryStats(country.code);
                const importStatus = getImportStatus(country.code);
                const uploadStatus = getUploadStatus(country.code as CountryCode);
                const isUploading = uploading.has(country.code as CountryCode);

                return (
                  <div key={country.code} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <h3 className="font-semibold">{country.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code pays: {country.code}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {uploadStatus?.uploaded && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <File className="h-3 w-3" />
                            Fichier uploadé
                          </Badge>
                        )}
                        
                        {countryStats && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {countryStats.postal_code_count.toLocaleString()} codes
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {uploadStatus?.uploaded ? (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{uploadStatus.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploadé le {uploadStatus.uploadedAt && new Date(uploadStatus.uploadedAt).toLocaleDateString('fr-FR')}
                                {uploadStatus.size && ` • ${Math.round(uploadStatus.size / 1024)} KB`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleImport(country.code, true)}
                              disabled={importStatus?.isImporting}
                              size="sm"
                              variant="default"
                            >
                              {importStatus?.isImporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Database className="h-4 w-4 mr-1" />
                                  Importer
                                </>
                              )}
                            </Button>
                            
                            <Button
                              onClick={() => handleDeleteUploadedFile(country.code as CountryCode)}
                              size="sm"
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor={`file-${country.code}`} className="text-sm font-medium">
                            Fichier GeoNames pour {country.name}
                          </Label>
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              id={`file-${country.code}`}
                              type="file"
                              accept=".txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(file, country.code as CountryCode);
                                }
                              }}
                              disabled={isUploading}
                              className="flex-1"
                            />
                            {isUploading && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Format: fichier .txt GeoNames (max 50MB)
                          </p>
                        </div>
                      )}

                      {importStatus?.isImporting && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm">Import en cours...</span>
                            <span className="text-sm">{importStatus.progress}%</span>
                          </div>
                          <Progress value={importStatus.progress} className="h-2" />
                        </div>
                      )}

                      {importStatus?.message && (
                        <p className="text-sm text-muted-foreground">
                          {importStatus.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques globales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map(stat => (
                <div key={stat.country_code} className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stat.postal_code_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.country_name}
                  </div>
                </div>
              ))}
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {stats.reduce((total, stat) => total + stat.postal_code_count, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total codes postaux
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};