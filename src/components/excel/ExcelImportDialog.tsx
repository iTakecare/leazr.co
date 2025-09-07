import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExcelImportService, ImportResult, ExcelRowData } from "@/services/excelImportService";
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
  const [fullData, setFullData] = useState<ExcelRowData[]>([]); // Stocker toutes les données
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
      
      // Parse Excel file
      const parsedData = await ExcelImportService.parseExcelFile(file);
      
      console.log(`📊 ${parsedData.length} lignes parsées`);
      console.log('🔍 Échantillon des données parsées:', parsedData.slice(0, 2));
      
      setUploadProgress(50);
      
      // Validate format using the first row to get headers
      const headers = Object.keys(parsedData[0] || {});
      const missingHeaders = ExcelImportService.validateExcelFormat(headers);
      
      if (missingHeaders.length > 0) {
        console.error(`❌ Colonnes manquantes: ${missingHeaders.join(', ')}`);
        toast.error(`Colonnes manquantes: ${missingHeaders.join(', ')}`);
        setIsProcessing(false);
        setUploadProgress(0);
        return;
      }

      // Stocker toutes les données et l'aperçu
      setFullData(parsedData);
      setPreviewData(parsedData.slice(0, 5)); // Show first 5 rows for preview
      setShowPreview(true);
      setUploadProgress(100);
      
      console.log(`✅ Fichier analysé avec succès: ${parsedData.length} lignes`);
      toast.success(`${parsedData.length} lignes détectées. Vérifiez l'aperçu avant d'importer.`);
      
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
          {showPreview && !importResult && (
            <div className="space-y-4">
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
                      <th className="p-2 text-left">Montant HT</th>
                      <th className="p-2 text-left">Coefficient</th>
                      <th className="p-2 text-left">Statut</th>
                      <th className="p-2 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                     {previewData.map((row, index) => (
                       <tr key={index} className="border-b">
                         <td className="p-2">{row['Client']}</td>
                         <td className="p-2">{row['Email']}</td>
                         <td className="p-2 font-mono">
                           {typeof row['Montant HT'] === 'number' 
                             ? `${row['Montant HT'].toFixed(2)}€` 
                             : `${row['Montant HT']}€`}
                         </td>
                         <td className="p-2 font-mono">
                           {typeof row['Coefficient'] === 'number' 
                             ? row['Coefficient'].toFixed(2)
                             : row['Coefficient']}
                         </td>
                         <td className="p-2">{row['Statut']}</td>
                         <td className="p-2">{row['Source']}</td>
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