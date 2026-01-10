import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  FileText,
  Eye,
  X,
  History
} from 'lucide-react';

interface CSVRow {
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_vat?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country?: string;
  dossier_number?: string;
  contract_number?: string;
  monthly_payment?: string;
  equipment_description?: string;
  leaser_name?: string;
  status?: string;
  dossier_date?: string;
  invoice_date?: string;
  payment_date?: string;
  contract_start_date?: string;
  contract_duration?: string;
  financed_amount?: string;
  [key: string]: string | undefined;
}

interface ImportReport {
  success: boolean;
  totalRows: number;
  clientsCreated: number;
  clientsLinked: number;
  offersCreated: number;
  contractsCreated: number;
  errors: Array<{ row: number; message: string }>;
}

// Template CSV content
const CSV_TEMPLATE = `client_name;client_company;client_email;client_phone;client_vat;client_address;client_city;client_postal_code;client_country;dossier_number;contract_number;monthly_payment;equipment_description;leaser_name;status;dossier_date;invoice_date;payment_date;contract_start_date;contract_duration;financed_amount
Jean Dupont;Dupont SPRL;jean@dupont.be;0470123456;BE0123456789;Rue de la Loi 1;Bruxelles;1000;BE;DOS-2024-001;GRK-123456;150.00;MacBook Pro 14";Grenke;active;01/01/2024;15/01/2024;01/02/2024;01/03/2024;48;6000.00
Marie Martin;Martin & Co;marie@martin.be;0471234567;;Avenue Louise 100;Bruxelles;1050;BE;DOS-2024-002;;200.00;2x iPhone 15 Pro;Atlance;active;15/02/2024;;;01/04/2024;36;6480.00`;

// Required columns
const REQUIRED_COLUMNS = ['client_name', 'dossier_number', 'monthly_payment', 'leaser_name'];

// Column labels for display
const COLUMN_LABELS: Record<string, string> = {
  client_name: 'Nom client',
  client_company: 'Entreprise',
  client_email: 'Email',
  client_phone: 'Téléphone',
  client_vat: 'N° TVA',
  client_address: 'Adresse',
  client_city: 'Ville',
  client_postal_code: 'Code postal',
  client_country: 'Pays',
  dossier_number: 'N° Dossier',
  contract_number: 'N° Contrat leaser',
  monthly_payment: 'Mensualité (€)',
  equipment_description: 'Équipement',
  leaser_name: 'Leaser',
  status: 'Statut',
  dossier_date: 'Date dossier',
  invoice_date: 'Date facture',
  payment_date: 'Date paiement',
  contract_start_date: 'Début contrat',
  contract_duration: 'Durée (mois)',
  financed_amount: 'Montant financé (€)'
};

const HistoricalContractsImport: React.FC = () => {
  const { user } = useAuth();
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Parse CSV content
  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect separator (semicolon or comma)
    const separator = lines[0].includes(';') ? ';' : ',';
    
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/["\s]/g, '_'));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Only add non-empty rows
      if (row.client_name?.trim()) {
        rows.push(row);
      }
    }

    return rows;
  };

  // Validate CSV data
  const validateData = (data: CSVRow[]): string[] => {
    const errors: string[] = [];
    
    if (data.length === 0) {
      errors.push('Le fichier CSV est vide ou mal formaté');
      return errors;
    }

    // Check for required columns
    const firstRow = data[0];
    const missingColumns = REQUIRED_COLUMNS.filter(col => !(col in firstRow));
    if (missingColumns.length > 0) {
      errors.push(`Colonnes requises manquantes: ${missingColumns.map(c => COLUMN_LABELS[c] || c).join(', ')}`);
    }

    // Validate each row
    data.forEach((row, index) => {
      if (!row.client_name?.trim()) {
        errors.push(`Ligne ${index + 2}: Nom client manquant`);
      }
      if (!row.dossier_number?.trim()) {
        errors.push(`Ligne ${index + 2}: Numéro de dossier manquant`);
      }
      if (!row.monthly_payment?.trim()) {
        errors.push(`Ligne ${index + 2}: Mensualité manquante`);
      }
    });

    return errors.slice(0, 10); // Limit to first 10 errors
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setReport(null);
    setValidationErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = parseCSV(content);
      const errors = validateData(data);
      
      setParsedData(data);
      setValidationErrors(errors);
      setShowPreview(data.length > 0);
      
      if (data.length > 0 && errors.length === 0) {
        toast.success(`${data.length} contrats détectés dans le fichier`);
      } else if (errors.length > 0) {
        toast.warning(`Fichier chargé avec ${errors.length} erreur(s) de validation`);
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  // Download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele-import-contrats.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Modèle CSV téléchargé');
  };

  // Clear current import
  const clearImport = () => {
    setParsedData([]);
    setFileName(null);
    setReport(null);
    setValidationErrors([]);
    setShowPreview(false);
  };

  // Handle import
  const handleImport = async () => {
    if (parsedData.length === 0 || validationErrors.length > 0) {
      toast.error('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    setLoading(true);
    setProgress(0);
    setReport(null);

    try {
      // Get user's company and billing entity
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Profil utilisateur non trouvé');
      }

      // Get default billing entity
      const { data: billingEntity } = await supabase
        .from('billing_entities')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('is_default', true)
        .single();

      if (!billingEntity) {
        throw new Error('Entité de facturation non configurée');
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Transform data for edge function
      const rows = parsedData.map(row => ({
        client_name: row.client_name || '',
        client_company: row.client_company || '',
        client_email: row.client_email || '',
        client_phone: row.client_phone || '',
        client_vat: row.client_vat || '',
        client_address: row.client_address || '',
        client_city: row.client_city || '',
        client_postal_code: row.client_postal_code || '',
        client_country: row.client_country || 'BE',
        dossier_number: row.dossier_number || '',
        leaser: row.leaser_name || '',
        monthly_payment: row.monthly_payment || '',
        financed_amount: row.financed_amount || row.monthly_payment || '',
        duration: row.contract_duration || '36',
        dossier_date: row.dossier_date || '',
        invoice_date: row.invoice_date || '',
        payment_date: row.payment_date || '',
        remarks: row.equipment_description || ''
      }));

      const year = new Date().getFullYear().toString();

      const { data, error } = await supabase.functions.invoke('import-historical-contracts', {
        body: {
          rows,
          billingEntityId: billingEntity.id,
          companyId: profile.company_id,
          year
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setReport(data);
      
      if (data.success || data.errors?.length === 0) {
        toast.success(`Import terminé ! ${data.contractsCreated} contrats créés.`);
      } else {
        toast.warning(`Import terminé avec ${data.errors?.length || 0} erreur(s)`);
      }

    } catch (err) {
      console.error('Import error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Import de contrats historiques
              </CardTitle>
              <CardDescription>
                Importez vos contrats existants depuis un fichier CSV
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Import CSV
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Template download section */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Modèle CSV</p>
                <p className="text-sm text-muted-foreground">
                  Téléchargez le modèle avec toutes les colonnes requises
                </p>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger le modèle
            </Button>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${fileName ? 'bg-muted/30' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {fileName ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-primary" />
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} contrat{parsedData.length > 1 ? 's' : ''} détecté{parsedData.length > 1 ? 's' : ''}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); clearImport(); }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? 'Déposez le fichier ici...' : 'Glissez votre fichier CSV ici'}
                </p>
                <p className="text-sm text-muted-foreground">
                  ou cliquez pour sélectionner un fichier
                </p>
              </div>
            )}
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Erreurs de validation :</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview toggle */}
          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">
                  {parsedData.length} contrat{parsedData.length > 1 ? 's' : ''} prêt{parsedData.length > 1 ? 's' : ''} à importer
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Masquer' : 'Voir'} l'aperçu
              </Button>
            </div>
          )}

          {/* Preview table */}
          {showPreview && parsedData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted">#</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Client</TableHead>
                      <TableHead className="sticky top-0 bg-muted">N° Dossier</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Leaser</TableHead>
                      <TableHead className="sticky top-0 bg-muted text-right">Mensualité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell>{row.client_name}</TableCell>
                        <TableCell className="font-mono text-sm">{row.dossier_number}</TableCell>
                        <TableCell>{row.leaser_name}</TableCell>
                        <TableCell className="text-right">{row.monthly_payment} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50 border-t">
                  ... et {parsedData.length - 10} autres contrats
                </div>
              )}
            </div>
          )}

          {/* Import button */}
          {parsedData.length > 0 && validationErrors.length === 0 && !report && (
            <Button 
              onClick={handleImport} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <History className="mr-2 h-4 w-4" />
                  Lancer l'import historique ({parsedData.length} contrats)
                </>
              )}
            </Button>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Traitement en cours... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Report */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {report.errors?.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Rapport d'import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-700">{report.totalRows}</div>
                <div className="text-xs text-blue-600">Lignes traitées</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <div className="text-2xl font-bold text-green-700">{report.clientsCreated}</div>
                <div className="text-xs text-green-600">Clients créés</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-700">{report.clientsLinked}</div>
                <div className="text-xs text-purple-600">Clients existants</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
                <div className="text-2xl font-bold text-indigo-700">{report.contractsCreated}</div>
                <div className="text-xs text-indigo-600">Contrats créés</div>
              </div>
            </div>

            {/* Errors */}
            {report.errors && report.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">{report.errors.length} erreur(s) rencontrée(s) :</p>
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {report.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>Ligne {err.row}: {err.message}</li>
                    ))}
                    {report.errors.length > 10 && (
                      <li className="text-muted-foreground">... et {report.errors.length - 10} autres erreurs</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Success message */}
            {report.errors?.length === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  Import terminé avec succès ! Tous les contrats ont été créés.
                </AlertDescription>
              </Alert>
            )}

            {/* New import button */}
            <Button 
              variant="outline" 
              onClick={clearImport}
              className="w-full"
            >
              Nouvel import
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colonnes du fichier CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {Object.entries(COLUMN_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                {REQUIRED_COLUMNS.includes(key) ? (
                  <Badge variant="default" className="h-5 px-1 text-xs">*</Badge>
                ) : (
                  <span className="w-5" />
                )}
                <code className="text-xs bg-muted px-1 rounded">{key}</code>
                <span className="text-muted-foreground">→ {label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Colonnes obligatoires. Séparateur : point-virgule (;) ou virgule (,). Format de date : JJ/MM/AAAA
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalContractsImport;
