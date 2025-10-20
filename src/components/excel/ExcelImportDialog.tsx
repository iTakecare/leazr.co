import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExcelImportService, ImportResult, ExcelRowData, ColumnDetectionResult } from "@/services/excelImportService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ExcelImportDialogProps {
  onImportComplete?: () => void;
  children?: React.ReactNode;
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({ 
  onImportComplete, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ExcelRowData[]>([]);
  const [fullData, setFullData] = useState<ExcelRowData[]>([]);
  const [columnDetection, setColumnDetection] = useState<ColumnDetectionResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { companyId } = useMultiTenant();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Format de fichier non supporté. Utilisez un fichier Excel (.xlsx ou .xls)");
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress(25);
      
      console.log(`📂 Début de l'analyse du fichier: ${file.name}`);
      
      // Parse Excel file with column detection
      const result = await ExcelImportService.parseExcelFile(file);
      
      console.log(`📊 ${result.data.length} lignes parsées`);
      console.log('🔍 Détection des colonnes:', result.columnDetection);
      
      setUploadProgress(50);
      
      // Check if column detection is valid
      if (!result.columnDetection.isValid) {
        console.error(`❌ Colonnes manquantes: ${result.columnDetection.missingRequired.join(', ')}`);
        toast.error(`Colonnes requises manquantes: ${result.columnDetection.missingRequired.join(', ')}`);
        setIsProcessing(false);
        setUploadProgress(0);
        return;
      }

      // Store data and column detection
      setFullData(result.data);
      setPreviewData(result.data.slice(0, 5));
      setColumnDetection(result.columnDetection);
      setShowPreview(true);
      setUploadProgress(100);
      
      console.log(`✅ Fichier analysé avec succès: ${result.data.length} lignes`);
      toast.success(`${result.data.length} lignes détectées. Vérifiez l'aperçu avant d'importer.`);
      
    } catch (error: any) {
      console.error("Erreur lors de l'analyse du fichier:", error);
      toast.error(`Erreur lors de l'analyse du fichier: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!companyId || fullData.length === 0) {
      console.error("❌ Données manquantes pour l'import:", { companyId, dataLength: fullData.length });
      toast.error("Données manquantes pour l'import");
      return;
    }

    try {
      console.log(`🚀 Début de l'import de ${fullData.length} lignes`);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Utilisateur non authentifié:", userError);
        toast.error("Utilisateur non authentifié");
        return;
      }

      console.log(`👤 Utilisateur authentifié: ${user.id}`);
      
      setIsProcessing(true);
      setUploadProgress(0);
      
      // Utiliser les données déjà parsées au lieu de re-parser le fichier
      console.log('📋 Utilisation des données déjà parsées:', fullData.slice(0, 2));
      
      // Import offers
      const result = await ExcelImportService.importOffers(fullData, companyId, user.id);
      
      setImportResult(result);
      setUploadProgress(100);
      
      if (result.success > 0) {
        toast.success(`${result.success} offres importées avec succès`);
        onImportComplete?.();
      }
      
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erreurs lors de l'import`);
      }
      
    } catch (error: any) {
      console.error("Erreur lors de l'import:", error);
      toast.error(`Erreur lors de l'import: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setPreviewData([]);
    setFullData([]);
    setColumnDetection(null);
    setShowPreview(false);
    setImportResult(null);
    setUploadProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetDialog, 300); // Reset after animation
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleClose();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import de données Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!showPreview && !importResult && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Sélectionnez votre fichier Excel</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Le fichier doit contenir les colonnes: Client, Montant HT (obligatoires)
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Analyse du fichier...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {showPreview && !importResult && columnDetection && (
            <div className="space-y-4">
              {/* Column Detection Results */}
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="font-medium mb-2">Colonnes détectées automatiquement:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(columnDetection.mappings).map(([field, mapping]) => (
                      <div key={field} className="flex justify-between">
                        <span className="font-medium">{mapping.label}:</span>
                        <span className={mapping.detected ? "text-green-600" : "text-red-600"}>
                          {mapping.detected || "Non trouvé"}
                          {mapping.required && !mapping.detected && " (Requis)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aperçu des 5 premières lignes. Vérifiez que les données sont correctes avant d'importer.
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Client</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Marge/Montant</th>
                      <th className="p-2 text-left">Taux/Coefficient</th>
                      <th className="p-2 text-left">Mensualité</th>
                      <th className="p-2 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                     {previewData.map((row, index) => (
                       <tr key={index} className="border-b">
                         <td className="p-2">{row['Client'] || row['Leaser']}</td>
                         <td className="p-2">{row['Email']}</td>
                         <td className="p-2 font-mono">
                           {typeof row['Marge en €'] === 'number' 
                             ? `${row['Marge en €'].toFixed(2)}€` 
                             : `${row['Marge en €']}€`}
                         </td>
                         <td className="p-2 font-mono">
                           {typeof row['Taux de marge'] === 'number' 
                             ? row['Taux de marge'].toFixed(2)
                             : row['Taux de marge']}
                         </td>
                         <td className="p-2 font-mono">
                           {typeof row['Mensualité client offres'] === 'number' 
                             ? `${row['Mensualité client offres'].toFixed(2)}€` 
                             : `${row['Mensualité client offres']}€`}
                         </td>
                         <td className="p-2">{row['Statut']}</td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetDialog} disabled={isProcessing}>
                  Annuler
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? "Import en cours..." : "Confirmer l'import"}
                </Button>
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Import des offres...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>
          )}

          {/* Results Section */}
          {importResult && (
            <div className="space-y-4">
              <Alert className={importResult.success > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {importResult.success > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="font-medium mb-2">Résultats de l'import:</div>
                  <ul className="text-sm space-y-1">
                    <li>✅ {importResult.success} offres créées avec succès</li>
                    {importResult.errors.length > 0 && (
                      <li>❌ {importResult.errors.length} erreurs</li>
                    )}
                    {importResult.duplicates > 0 && (
                      <li>⚠️ {importResult.duplicates} doublons ignorés</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Détail des erreurs:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        Ligne {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetDialog}>
                  Nouvel import
                </Button>
                <Button onClick={handleClose}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};