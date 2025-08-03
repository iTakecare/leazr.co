import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Database, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    loadStats();
  }, []);

  const handleImport = async (countryCode: string) => {
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
        body: { country: countryCode }
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

  const getCountryStats = (countryCode: string) => {
    return stats.find(s => s.country_code === countryCode);
  };

  const getImportStatus = (countryCode: string) => {
    return importStatuses.get(countryCode);
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
            Importez tous les codes postaux pour la Belgique, la France et le Luxembourg depuis GeoNames
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  onClick={() => handleImport(country.code)}
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