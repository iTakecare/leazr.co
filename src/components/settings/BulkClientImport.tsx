import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, AlertCircle, CheckCircle, Download, FileText } from 'lucide-react';
import { processBulkClientData, bulkCreateClients, BulkImportResult } from '@/services/clientService';

const BulkClientImport: React.FC = () => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Données de test préremplies
  const sampleData = `Marie Sergi - Marie Sergi
Leo Grigore - Webshop Solution
Jonathan Da Silva - Black Box
Jonathan Da Silva - Black Box
Jonathan Da Silva - Black Box
Tom Mermans - MO Productions
Tom Mermans - Tom Mermans
Thibault Collin - Thibault Collin
Laura Minne - Laura Minne
Thierry Henrard - Thierry Henrard
Gaetan Bernier - Gaetan Bernier
Vincent Dessy - Vincent Dessy
Tom Mermans - MO Productions
Laura Minne - Laura Minne
Thierry Henrard - Thierry Henrard
Gaetan Bernier - Gaetan Bernier
Vincent Dessy - Vincent Dessy
Luc Delaere - Luc Delaere
Chloé Van Tomme - Chloé Van Tomme
Mélanie Mory - Mélanie Mory
Anick Delhaye - Anick Delhaye
Stijn Vereecken - Stijn Vereecken
Gilles Janssens - Gilles Janssens
Geoffroy Dewandre - Geoffroy Dewandre
Tom Mermans - MO Productions
Laura Minne - Laura Minne
Thierry Henrard - Thierry Henrard
Gaetan Bernier - Gaetan Bernier
Vincent Dessy - Vincent Dessy
Luc Delaere - Luc Delaere
Chloé Van Tomme - Chloé Van Tomme
Mélanie Mory - Mélanie Mory
Anick Delhaye - Anick Delhaye
Stijn Vereecken - Stijn Vereecken
Gilles Janssens - Gilles Janssens
Geoffroy Dewandre - Geoffroy Dewandre
Fabrice Lebrun - Fabrice Lebrun
Marie Sergi - Marie Sergi
Leo Grigore - Webshop Solution
Jonathan Da Silva - Black Box
Tom Mermans - MO Productions
Thibault Collin - Thibault Collin
Laura Minne - Laura Minne
Thierry Henrard - Thierry Henrard
Gaetan Bernier - Gaetan Bernier
Vincent Dessy - Vincent Dessy
Luc Delaere - Luc Delaere
Chloé Van Tomme - Chloé Van Tomme
Mélanie Mory - Mélanie Mory
Anick Delhaye - Anick Delhaye
Stijn Vereecken - Stijn Vereecken
Gilles Janssens - Gilles Janssens
Geoffroy Dewandre - Geoffroy Dewandre
Fabrice Lebrun - Fabrice Lebrun
Vincent Michiels - Vincent Michiels
Philippe Van Geyte - Philippe Van Geyte
Gregory Lorent - Gregory Lorent
Valérie Vande Moortel - Valérie Vande Moortel
Didier Gérard - Didier Gérard
David Lauwers - David Lauwers
Pierre Delcroix - Pierre Delcroix
Jérôme Vandenberghe - Jérôme Vandenberghe
Cedric Motte - Cedric Motte
Francis Vancauwelaert - Francis Vancauwelaert
Nicolas Vande Kerckhove - Nicolas Vande Kerckhove
Julien Delvigne - Julien Delvigne
Bernard Debruyne - Bernard Debruyne
Quentin Leclercq - Quentin Leclercq
Jonathan Vercauteren - Jonathan Vercauteren
Thibault Michiels - Thibault Michiels
Emmanuel Vanden Berghe - Emmanuel Vanden Berghe
Dirk Van Herreweghe - Dirk Van Herreweghe
Joris De Brouwer - Joris De Brouwer
Kristof Vandierendonck - Kristof Vandierendonck
Pieter-Jan Lievens - Pieter-Jan Lievens
Bram Van der Auwera - Bram Van der Auwera
Sebastien Van de Velde - Sebastien Van de Velde
Michael Reynaert - Michael Reynaert
Frederic Dumont - Frederic Dumont
Philippe Verstraete - Philippe Verstraete
Koen Vandamme - Koen Vandamme
Maxime Dewolf - Maxime Dewolf
Steven Deconinck - Steven Deconinck
Christophe Vandenberghe - Christophe Vandenberghe
Rudy Vercauteren - Rudy Vercauteren
Bart Dhaene - Bart Dhaene
Werner Van Hoecke - Werner Van Hoecke
Patrick Vanhove - Patrick Vanhove
Jan Vercauteren - Jan Vercauteren
Guy Van de Velde - Guy Van de Velde
Alain Deconinck - Alain Deconinck
Tom Vandamme - Tom Vandamme
Peter Van Herreweghe - Peter Van Herreweghe
Filip Vercauteren - Filip Vercauteren
Marc Debruyne - Marc Debruyne`;

  const handlePreview = () => {
    if (!rawData.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir des données à importer",
        variant: "destructive"
      });
      return;
    }

    const lines = rawData.split('\n').filter(line => line.trim());
    const processed = processBulkClientData(lines);
    setPreviewData(processed);
    
    toast({
      title: "Aperçu généré",
      description: `${processed.length} clients uniques détectés sur ${lines.length} entrées`
    });
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord générer un aperçu",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    try {
      const result = await bulkCreateClients(
        previewData,
        10, // Batch size
        (processed, total) => {
          setProgress((processed / total) * 100);
        }
      );
      
      setImportResult(result);
      
      if (result.success > 0) {
        toast({
          title: "Import réussi",
          description: `${result.success} clients créés avec succès`
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Import partiellement réussi",
          description: `${result.failed} clients n'ont pas pu être créés`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const loadSampleData = () => {
    setRawData(sampleData);
    toast({
      title: "Données d'exemple chargées",
      description: "93 entrées de clients iTakecare chargées"
    });
  };

  const downloadReport = () => {
    if (!importResult) return;

    const report = {
      summary: {
        total: importResult.total,
        success: importResult.success,
        failed: importResult.failed,
        timestamp: new Date().toISOString()
      },
      errors: importResult.errors,
      created_clients: importResult.created_clients.map(c => ({
        id: c.id,
        name: c.name,
        contact_name: c.contact_name
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import en masse de clients
          </CardTitle>
          <CardDescription>
            Importez plusieurs clients à la fois en utilisant le format "Prénom Nom - Entreprise"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadSampleData} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Charger données iTakecare
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Données à importer (une entrée par ligne)
            </label>
            <Textarea
              placeholder="Exemple:&#10;Marie Sergi - Marie Sergi&#10;Leo Grigore - Webshop Solution&#10;Jonathan Da Silva - Black Box"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Aperçu ({rawData.split('\n').filter(line => line.trim()).length} entrées)
            </Button>
            
            {previewData.length > 0 && (
              <Button onClick={handleImport} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Import en cours...' : `Importer ${previewData.length} clients`}
              </Button>
            )}
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{Math.round(progress)}% terminé</p>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Aperçu des clients ({previewData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {previewData.slice(0, 10).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{client.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Contact: {client.contact_name}
                    </span>
                  </div>
                  <Badge variant="secondary">{client.status}</Badge>
                </div>
              ))}
              {previewData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... et {previewData.length - 10} autres clients
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Résultats de l'import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-muted-foreground">Succès</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-muted-foreground">Échecs</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Erreurs rencontrées:</strong>
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm">
                        • {error.client}: {error.error}
                      </div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... et {importResult.errors.length - 5} autres erreurs
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={downloadReport} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le rapport complet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkClientImport;