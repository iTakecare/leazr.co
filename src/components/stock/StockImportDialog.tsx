import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parseStockExcel,
  importStockItems,
  StockColumnMapping,
  StockImportResult,
  STOCK_IMPORT_FIELDS,
  getFieldLabel,
  StockImportRow,
} from "@/services/stockImportService";

interface StockImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

const StockImportDialog: React.FC<StockImportDialogProps> = ({ open, onOpenChange }) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<StockColumnMapping[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StockImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiMapping, setAiMapping] = useState(false);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setMappings([]);
    setRows([]);
    setTotalRows(0);
    setProgress(0);
    setResult(null);
    setParseError(null);
    setAiMapping(false);
  };

  const runAiMapping = async (hdrs: string[], dataRows: any[][]) => {
    setAiMapping(true);
    try {
      const sampleRows = dataRows.slice(0, 8);
      const { data, error } = await supabase.functions.invoke('ai-column-mapping', {
        body: { headers: hdrs, sampleRows },
      });

      if (error) throw error;
      if (data?.mappings && Array.isArray(data.mappings)) {
        const aiMappings: StockColumnMapping[] = hdrs.map((h, i) => ({
          excelHeader: h,
          field: data.mappings[i]?.field || null,
        }));
        setMappings(aiMappings);
        toast.success("Mapping IA appliqué avec succès");
      }
    } catch (err: any) {
      console.error('AI mapping error:', err);
      toast.error("Mapping IA échoué, mapping par défaut utilisé");
    } finally {
      setAiMapping(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setParseError(null);
    setFileName(file.name);

    try {
      const parsed = await parseStockExcel(file);
      setHeaders(parsed.headers);
      setMappings(parsed.mappings);
      setRows(parsed.rows);
      setTotalRows(parsed.totalRows);
      setStep('preview');

      // Check if pattern-based mapping found a title — if not, trigger AI
      const hasTitleFromPatterns = parsed.mappings.some(m => m.field === 'title');
      const hasAnyMapping = parsed.mappings.some(m => m.field !== null);
      if (!hasTitleFromPatterns || !hasAnyMapping) {
        runAiMapping(parsed.headers, parsed.rows);
      }
    } catch (err: any) {
      setParseError(err.message || 'Erreur de lecture du fichier');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const updateMapping = (colIdx: number, field: keyof StockImportRow | 'none') => {
    setMappings(prev => prev.map((m, i) =>
      i === colIdx ? { ...m, field: field === 'none' ? null : field } : m
    ));
  };

  const hasTitleMapping = mappings.some(m => m.field === 'title');

  const handleImport = async () => {
    if (!companyId || !user) return;
    setStep('importing');
    setProgress(0);

    try {
      const res = await importStockItems(
        rows,
        mappings,
        companyId,
        user.id,
        (current, total) => setProgress(Math.round((current / total) * 100)),
      );
      setResult(res);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      if (res.success > 0) {
        toast.success(`${res.success} article(s) importé(s)`);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'import: " + (err.message || 'Erreur inconnue'));
      setStep('preview');
    }
  };

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer le stock depuis Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Déposez le fichier ici...' : 'Glissez-déposez un fichier Excel ou cliquez pour parcourir'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Formats acceptés : .xlsx, .xls</p>
            </div>
            {parseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{totalRows}</strong> ligne(s) détectée(s) dans <strong>{fileName}</strong>
              </p>
            </div>

            {/* Column mapping */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Mapping des colonnes</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runAiMapping(headers, rows)}
                  disabled={aiMapping}
                >
                  {aiMapping ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {aiMapping ? 'Détection IA...' : 'Détection IA'}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mappings.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground truncate" title={m.excelHeader}>
                      {m.excelHeader}
                    </span>
                    <Select
                      value={m.field || 'none'}
                      onValueChange={v => updateMapping(idx, v as any)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Ignorer —</SelectItem>
                        {STOCK_IMPORT_FIELDS.map(f => (
                          <SelectItem key={f} value={f}>{getFieldLabel(f)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {!hasTitleMapping && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  La colonne "Titre / Description" est obligatoire. Veuillez mapper au moins une colonne vers ce champ.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    {mappings.map((m, i) => (
                      <TableHead key={i} className="text-xs whitespace-nowrap">
                        {m.field ? getFieldLabel(m.field) : <span className="text-muted-foreground italic">{m.excelHeader}</span>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-xs text-muted-foreground">{ri + 2}</TableCell>
                      {mappings.map((m, ci) => (
                        <TableCell key={ci} className={`text-xs whitespace-nowrap ${!m.field ? 'text-muted-foreground/50' : ''}`}>
                          {row[ci] !== null && row[ci] !== undefined ? String(row[ci]).substring(0, 40) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalRows > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                ... et {totalRows - 5} ligne(s) supplémentaire(s)
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { reset(); }}>Annuler</Button>
              <Button onClick={handleImport} disabled={!hasTitleMapping}>
                Importer {totalRows} article(s)
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Import en cours...</p>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium">Import terminé</p>
                <p className="text-sm text-muted-foreground">
                  {result.success} importé(s) • {result.duplicates} doublon(s) ignoré(s) • {result.errors.length} erreur(s)
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium mb-1">Détail des erreurs :</p>
                {result.errors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Ligne {e.row} : {e.error}
                  </p>
                ))}
                {result.errors.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ... et {result.errors.length - 20} erreur(s) supplémentaire(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => { reset(); onOpenChange(false); }}>Fermer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StockImportDialog;
