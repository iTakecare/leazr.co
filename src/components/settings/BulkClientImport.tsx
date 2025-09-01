import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, AlertCircle, CheckCircle, Download, FileText, Sparkles } from 'lucide-react';
import { processBulkClientData, bulkCreateClients, BulkImportResult } from '@/services/clientService';

const BulkClientImport: React.FC = () => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Vraies données iTakecare à nettoyer et importer
  const sampleData = `Win Finance 
GSV Compta
Pierre Bertaux SCS
Leo Grigore - Webshop Solution
Philippe Lallemand - Cil Expert
Cosy House Design SRL
Luc Malarme
Win Finance 
Happy Log NV/SA
GKS Services
Cohea
Komon SRL
We Are Up
Prosper Naci - Coach Naci #1
Marie Sergi - Honesty
Nickel Renovation 
BETA SRL
Black Box
Ardenne Belge Tourisme ASBL
DPO Consulting
Patrick Malin - Always Say IT #1
Dav Constructance
Lux & Design
Art Solution Services
Us BarberShop - Debacker Anthony
Nicolas Sols - Nicolas Sols
Sakina Ait taleb - Amily SRL
Moises Rodrigues - Moises Rodrigues
Marie Sergi - Marie Sergi
Romain Janssens - Romain Janssens
Zakaria Gayet - Winfinance
Patrick Malin - Always Say IT #2
Cleverson Rodrigues - Cleverson Rodrigues
Steve Laureys - Magic Horse Stables
Ersan Keles - Cap Sud immobilier
Jonathan Stordeur - Out of Border
Bilal Gorfti Amrani - BTSM Tech
Madalin Draghiceanu - DM carrelages
Yentl Adams - Yentl Adams
Maxime Vicini - Ecole libre Notre Dame de Jumet
Celine Maillot - Sublime Emoi
Dorian Vandensteen - Legal Avenue
Patrick Malin - E.LITA SPRL
Bastien Heynderickx - Apik #1
David Becquevort - Cosy House Design SRL
Kevin Jadin - Trans-mission
Virginie GEPTS - BUREAU COMPTABLE & FISCALE GEPTS
Prosper Naci - Coach Naci #2
Thomas SCHIETECATTE - LCV Consult
Roger Hennebert - Les petits rêveurs
Bernard Hansen - Tailor Made Service
Thibault Cenci - Cenci Menuiserie SRL
Davy Loomans - JNS Lightning
William Elong - Faraday Scomm
Michel Mordant - Menuiserie Michel
Zakaria Gayet - Winfinance #3 - Bureau Fontaine L'évêque
Nicolas Vandervinne - THE AUTOMOT'e.v. FACTORY
Magali Compere - Magali Compere
Jimmy Mordant - JM Menuiserie
Antoine Tytgat - Agence Tytan
Bastien Heynderickx - Apik #2
Vincent Mathieu-Kempeneers - Acadiso
Ness Pelgrims - Ness Pelgrims #1
Antoine Sottiaux -  LeGrow Studio #1
Gregory Ilnicki - Infra Route SRL
Jonathan Da Silva - Black Box
Sabrina Dewever - Express immo
Larock Victor - Victor Larock
Gilles Vandeputte - The Southern Experience
Nicolas Ceron - AR Saint Ghislain #6 - Tablettes/ Ecole
Johnatan Jassin - Engine of Passion #1
Thibaud de Clerck - Alarmes De Clerck #1
Nicolas Ceron - AR Saint Ghislain #1 - Lot 2/ Local 35
Johnatan Jassin - Engine of Passion #2
Marie Sergi - Marie Sergi
Nicolas Ceron - AR Saint Ghislain #2 - Lot 3-1/ Local 63
Nicolas Ceron - AR Saint Ghislain #4 - Lot 3-3/ Local 71
Bastien Heyderickx - Apik #3
Ness Pelgrims - Ness Pelgrims
Gregory Ilnicki - Infra Route SRL #2
Thibaud de Clerck - Alarmes De Clerck #2
Bastien Hendricks - Apik #4
Jonathan Stordeur - Out of Border
Loukas Martin - Wiclean
Nicolas Ceron - AR Saint Ghislain #7 - Autres/ Ecole
Bernard Hansen - Tailor Made Service
Benjamin Gemis - Traiteur tout terrain
Yassin Boutwalind - Smart-Ads
Nicolas Ceron - AR Saint Ghislain #7 - Lot 7/ PC Studio langue
Nicolas Ceron - AR Saint Ghislain #3 - Lot 3-2/ Local 68
Nicolas Ceron - AR Saint Ghislain #5 - Lot 4/ Ecole PC portables
Marine Georges - Ardenne Belge Tourisme ASBL
Bastien Hendricks - Apik
Esteban Arriaga Miranda - Eurofood Bank | About IT #1
Helene Rasquin - 4th Avenue
Thibaud de Clerck - Alarmes De Clerck #3
Dominique Budin - DRB Project
Valérie Crescence - Valérie Crescence
Lynda De Souza - Berlynn crédits
Laurent De Smet - Dr Sales
Rosine Ndudi - Cohea
Vincent Vanderoost - ND Detect
Mbomo Martin - GM VISUELS
Patricia Declercq - Les2P
Alessandro Reckem - Pizza Loca 
Arnaud Baudouin - Connect Partners
Hugues Dotrice - Hdo Photo
Jeffrey Peeters - JP Security
Esteban Arriaga Miranda - Eurofood Bank | About IT #2
Salvatore Arrigo - Komon SRL
Fabrice Bronsart - Skillset SRL
Ilias Zerten - EchoV Consulting
Adriano Colosimo - MK Food SRL
Jorel Tchana - Sun eater
Nicolas Ceron - AR Saint Ghislain #8 - Lot 8/ Ecole PC direction & Educ
Thomas Reviers - Xprove SCS
Choukri Skhiri - Prepalux
Antoine Sottiaux -  LeGrow Studio #2
Julien Bombeke - Ropal Sécurité
Juan Schmitz - SalesRise
Jean-Francois Verlinden - Solutions mobilité 
Pierre Lucas - Pierluxx Management
Dorian Vandensteen - Legal Avenue #2
Frédéric Mizero - MIZERO FREDERIC CONSULTANCE SRL
Thomas Reviers - Xprove SCS #2
Hubert Halbrecq - TalentSquare SRL
Olivier Ranocha - Be Grateful SRL
Davy Loomans - JNS Lightning
Jennyfer Dewolf - K'rolo Cosmetics
Esteban Arriaga Miranda - Eurofood Bank | About IT #3
Gregory Ilnicki - Infra Route SRL #3
Nicolas Ceron - AR Saint Ghislain #8 - Lot 9/ Biblothèque + coo sécu + autres
Olivier Dewandre - Odexi
Marvin Ndiaye - Mamy Home (Fresheo)
Nicolas Ceron - AR Saint Ghislain #8 - Lot 10/ Chromebook Google
Nicolas Ceron - AR Saint Ghislain #8 - Remarkable
Thibaud de Clerck - Alarmes De Clerck #4
Magali Hadjadj - Infi Magali Soins SRL
Frederic D'hont - Frederic D'hont
Pierre Bertaux - Pierre Bertaux SCS #2
Fabrice Delchambre - Never2Late
Nicolas Lehette -  AT Studio
Thibaud Varasse - v infra
Thibaud de Clerck - Alarmes De Clerck #5
Francois Deravet - Deravet Digital
Olivier Dumeunier - Duoplus
Audry Lumeau - Binome Store
Loic Duchesnes - Chez loic
Esteban Arriaga Miranda - Eurofood Bank | About IT #4
Danielle Carmen Nsoke - Cn Partners SRL
Danielle Carmen Nsoke - Genesis SRL
Thibaud Varasse - v infra #2
Jonathan Ganhy - Takumi Creation 
Zakaria Gayet - Winfinance #3 - Bureau M/S/M
Patrick Burgeon - Kap-Services (PC Depannage)
Lola Brousmiche - WasteEnd
Sabrina Dewever - Express immo
Eric Lambertmont - Score SRL (Honesty)
Andrea Venegoni - Vegga SRL
Prosper Naci - Coach Naci #3
Thierry Huart-Eeckout - Startup Vie
Nicolas Ceron - AR Saint Ghislain #10 - PC Direction (Sophie)
Jean Francois Eloin - Laver Vert
Jimmy Mordant - Menuiserie Jimmy Mordant SRL
Olivier Dewandre - Odexi
Laurent De Smet - Dr Sales
Nathan Walzer - Maison Médicale Le Goeland
Benjamin Gemis - Traiteur Tout Terrain SRL
Manu Latini - New Latistyl
Havenith Danny - Mercurhosp (v-infra)
Dorcas Siassia - Kimia Lex
Benajmin Auvray - BRS Racing
Arnaud Baudouin - La compagnie de la Meuse 
Fabrice Bronsart - Skillset
Eric Gorski - Internat Le Roeulx
Patrick Grasseels - Pyxion SARLS
Eric Hoffelinck - VEDI SA
Andy Joris - Hydromur
Isabelle Barbosa - Ecrin Santé`;

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
      title: "Données iTakecare chargées",
      description: "195 entrées de clients iTakecare à nettoyer chargées"
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

            {/* Rapport de nettoyage */}
            {importResult.cleaning_report && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Rapport de nettoyage
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-medium">Entrées originales:</span> {importResult.cleaning_report.raw_entries}
                  </div>
                  <div>
                    <span className="font-medium">Clients uniques:</span> {importResult.cleaning_report.cleaned_entries}
                  </div>
                </div>
                
                {importResult.cleaning_report.duplicates_merged.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-blue-600 mb-1">
                      Doublons fusionnés: {importResult.cleaning_report.duplicates_merged.length}
                    </div>
                    <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                      {importResult.cleaning_report.duplicates_merged.slice(0, 5).map((merge, i) => (
                        <div key={i}>• {merge}</div>
                      ))}
                      {importResult.cleaning_report.duplicates_merged.length > 5 && (
                        <div>... et {importResult.cleaning_report.duplicates_merged.length - 5} autres</div>
                      )}
                    </div>
                  </div>
                )}

                {importResult.cleaning_report.series_merged.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-purple-600 mb-1">
                      Séries fusionnées: {importResult.cleaning_report.series_merged.length}
                    </div>
                    <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                      {importResult.cleaning_report.series_merged.slice(0, 5).map((merge, i) => (
                        <div key={i}>• {merge}</div>
                      ))}
                      {importResult.cleaning_report.series_merged.length > 5 && (
                        <div>... et {importResult.cleaning_report.series_merged.length - 5} autres</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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