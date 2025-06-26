
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bug, 
  FileCheck, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  debugOfferDocuments, 
  testDocumentDownload, 
  correctFileMetadata 
} from "@/services/offers/offerDocuments";

interface OfferDocumentDebuggerProps {
  offerId: string;
}

const OfferDocumentDebugger: React.FC<OfferDocumentDebuggerProps> = ({ offerId }) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [correctingFile, setCorrectingFile] = useState<string | null>(null);

  const handleDebugDocuments = async () => {
    try {
      setIsDebugging(true);
      toast.info("Analyse des documents en cours...");
      
      const results = await debugOfferDocuments(offerId);
      setDebugResults(results);
      
      toast.success(`Analyse terminée: ${results.totalDocuments} documents analysés`);
    } catch (error) {
      console.error("Erreur lors du debug:", error);
      toast.error("Erreur lors de l'analyse des documents");
    } finally {
      setIsDebugging(false);
    }
  };

  const handleTestDownload = async (filePath: string) => {
    try {
      toast.info("Test de téléchargement en cours...");
      const result = await testDocumentDownload(filePath);
      
      if (result.success) {
        toast.success(`Content-Type reçu: ${result.actualContentType}`);
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error("Erreur test téléchargement:", error);
      toast.error("Erreur lors du test");
    }
  };

  const handleCorrectFile = async (filePath: string, correctMimeType: string) => {
    try {
      setCorrectingFile(filePath);
      toast.info("Correction des métadonnées en cours...");
      
      const success = await correctFileMetadata(filePath, correctMimeType);
      
      if (success) {
        toast.success("Métadonnées corrigées avec succès");
        // Relancer l'analyse pour voir les changements
        await handleDebugDocuments();
      } else {
        toast.error("Échec de la correction");
      }
    } catch (error) {
      console.error("Erreur correction:", error);
      toast.error("Erreur lors de la correction");
    } finally {
      setCorrectingFile(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bug className="mr-2 h-5 w-5" />
          Débogueur de Documents
        </CardTitle>
        <CardDescription>
          Outils de diagnostic pour vérifier et corriger les types MIME des documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={handleDebugDocuments} 
            disabled={isDebugging}
            className="w-full"
          >
            {isDebugging ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <FileCheck className="mr-2 h-4 w-4" />
                Analyser tous les documents
              </>
            )}
          </Button>

          {debugResults && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Résultats de l'analyse:</strong>
                  <br />
                  • Total: {debugResults.totalDocuments} documents
                  <br />
                  • Corrects: {debugResults.correctDocuments}
                  <br />
                  • Corrigés: {debugResults.correctedDocuments}
                  <br />
                  • Échecs: {debugResults.failedCorrections}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {debugResults.details.map((detail: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">{detail.fileName}</span>
                        {detail.correctionNeeded ? (
                          detail.correctionSuccess ? (
                            <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Corrigé
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 text-red-600 border-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Problème
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        <strong>MIME stocké:</strong> {detail.storedMimeType}
                      </div>
                      <div>
                        <strong>MIME HTTP:</strong> {detail.actualMimeType || 'Non testé'}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestDownload(detail.filePath)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Tester
                      </Button>
                      
                      {detail.correctionNeeded && !detail.correctionSuccess && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCorrectFile(detail.filePath, detail.storedMimeType)}
                          disabled={correctingFile === detail.filePath}
                        >
                          {correctingFile === detail.filePath ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <FileCheck className="mr-1 h-3 w-3" />
                          )}
                          Corriger
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferDocumentDebugger;
