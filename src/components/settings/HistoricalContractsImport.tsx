import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  History,
  RefreshCw,
  Link2,
  UserPlus
} from 'lucide-react';

// Parse European number format (1.234,56 or 1234.56)
function parseEuropeanNumber(value: string): number {
  if (!value) return 0;
  let cleaned = value.replace(/[\s€]/g, '');
  // Si contient une virgule, c'est le format européen
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

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
  invoice_number?: string;
  monthly_payment?: string;
  equipment_title?: string;
  equipment_qty?: string;
  equipment_price?: string;
  equipment_selling_price?: string;
  leaser_name?: string;
  status?: string;
  dossier_date?: string;
  request_date?: string;
  offer_date?: string;
  invoice_date?: string;
  payment_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_duration?: string;
  financed_amount?: string;
  billing_entity_name?: string;
  [key: string]: string | undefined;
}

interface EquipmentItem {
  title: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
}

interface GroupedContract {
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  client_vat: string;
  client_address: string;
  client_city: string;
  client_postal_code: string;
  client_country: string;
  dossier_number: string;
  contract_number: string;
  invoice_number: string;
  monthly_payment: string;
  leaser_name: string;
  status: string;
  dossier_date: string;
  request_date: string;
  invoice_date: string;
  payment_date: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_duration: string;
  financed_amount: string;
  billing_entity_name: string;
  equipments: EquipmentItem[];
}

interface ImportReport {
  success: boolean;
  totalRows: number;
  clientsCreated: number;
  clientsLinked: number;
  offersCreated: number;
  contractsCreated: number;
  contractsUpdated: number;
  equipmentsCreated: number;
  invoicesCreated: number;
  errors: Array<{ row: number; message: string }>;
}

interface CRMClient {
  id: string;
  name: string;
  company: string | null;
  vat_number: string | null;
}

interface ClientMatch {
  matched: boolean;
  client: CRMClient | null;
  matchType: 'vat' | 'name' | 'company' | null;
}

// Helper to normalize VAT numbers for comparison
const normalizeVat = (vat: string | null | undefined): string => {
  if (!vat) return '';
  return vat.replace(/[\s\.\-]/g, '').toUpperCase();
};

// Helper to canonicalize names for comparison
const canonicalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
};

// Template CSV content with simplified example (only company name)
const CSV_TEMPLATE = `client_company;dossier_number;contract_number;invoice_number;monthly_payment;equipment_title;equipment_qty;equipment_price;equipment_selling_price;leaser_name;status;contract_start_date;contract_end_date;contract_duration;financed_amount;invoice_date;payment_date;billing_entity_name
Dupont SPRL;DOS-2024-001;GRK-123456;FAC-2024-001;150.00;MacBook Pro 14";1;2500.00;2875.00;Grenke;active;01/03/2024;01/03/2028;48;6000.00;01/03/2024;15/03/2024;iTakecare SRL
Dupont SPRL;DOS-2024-001;;;;iPhone 15 Pro;2;1200.00;1380.00;;;;;;
Martin & Co;DOS-2024-002;;FAC-2024-002;200.00;iMac 27";1;3000.00;3450.00;Atlance;active;01/04/2024;01/04/2027;36;6480.00;01/04/2024;;iTakecare PP`;

// Required columns - now either client_name OR client_company is acceptable
const REQUIRED_COLUMNS = ['dossier_number'];

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
  invoice_number: 'N° Facture',
  monthly_payment: 'Mensualité (€)',
  equipment_title: 'Équipement',
  equipment_qty: 'Quantité',
  equipment_price: 'Prix achat (€)',
  equipment_selling_price: 'Prix vente (€)',
  leaser_name: 'Leaser',
  status: 'Statut',
  dossier_date: 'Date dossier',
  invoice_date: 'Date facture',
  payment_date: 'Date paiement',
  contract_start_date: 'Début contrat',
  contract_end_date: 'Fin contrat',
  contract_duration: 'Durée (mois)',
  financed_amount: 'Montant financé (€)',
  billing_entity_name: 'Entité de facturation'
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
  const [updateMode, setUpdateMode] = useState(false);
  const [existingClients, setExistingClients] = useState<CRMClient[]>([]);
  const [clientMatches, setClientMatches] = useState<Record<string, ClientMatch>>({});

  // Fetch existing clients from CRM on mount
  useEffect(() => {
    const fetchClients = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, company, vat_number')
          .eq('company_id', profile.company_id);
        
        if (clients) {
          setExistingClients(clients);
        }
      }
    };
    
    fetchClients();
  }, [user?.id]);

  // Match a CSV row to an existing CRM client
  const matchClient = useCallback((row: CSVRow): ClientMatch => {
    // First try to match by VAT number
    if (row.client_vat?.trim()) {
      const normalizedVat = normalizeVat(row.client_vat);
      const match = existingClients.find(c => normalizeVat(c.vat_number) === normalizedVat);
      if (match) {
        return { matched: true, client: match, matchType: 'vat' };
      }
    }
    
    // Then try to match by company name
    if (row.client_company?.trim()) {
      const canonicalCompany = canonicalizeName(row.client_company);
      const match = existingClients.find(c => 
        canonicalizeName(c.company) === canonicalCompany ||
        canonicalizeName(c.name) === canonicalCompany
      );
      if (match) {
        return { matched: true, client: match, matchType: 'company' };
      }
    }
    
    // Finally try to match by client name
    if (row.client_name?.trim()) {
      const canonicalName = canonicalizeName(row.client_name);
      const match = existingClients.find(c => 
        canonicalizeName(c.name) === canonicalName ||
        canonicalizeName(c.company) === canonicalName
      );
      if (match) {
        return { matched: true, client: match, matchType: 'name' };
      }
    }
    
    return { matched: false, client: null, matchType: null };
  }, [existingClients]);

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
      
      // Accept rows with either client_name OR client_company
      if (row.client_name?.trim() || row.client_company?.trim()) {
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

    // Validate each row - now client_name OR client_company is acceptable
    data.forEach((row, index) => {
      const hasClientIdentifier = row.client_name?.trim() || row.client_company?.trim();
      if (!hasClientIdentifier) {
        errors.push(`Ligne ${index + 2}: Nom client ou entreprise manquant`);
      }
      if (!row.dossier_number?.trim()) {
        errors.push(`Ligne ${index + 2}: Numéro de dossier manquant`);
      }
    });

    return errors.slice(0, 10); // Limit to first 10 errors
  };

  // Compute client matches when parsedData or existingClients change
  useEffect(() => {
    if (parsedData.length === 0 || existingClients.length === 0) {
      setClientMatches({});
      return;
    }

    const matches: Record<string, ClientMatch> = {};
    
    // Group by dossier number and compute match for each unique client
    parsedData.forEach(row => {
      const dossierNum = row.dossier_number || '';
      if (!matches[dossierNum]) {
        matches[dossierNum] = matchClient(row);
      }
    });
    
    setClientMatches(matches);
  }, [parsedData, existingClients, matchClient]);

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
      
      const uniqueContracts = new Set(data.map(r => r.dossier_number)).size;
      
      if (data.length > 0 && errors.length === 0) {
        toast.success(`${uniqueContracts} contrat(s) détecté(s) dans le fichier`);
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
    setClientMatches({});
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
      // Get user's company and billing entities
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Profil utilisateur non trouvé');
      }

      // Get all billing entities for the company
      const { data: billingEntities } = await supabase
        .from('billing_entities')
        .select('id, name, is_default')
        .eq('company_id', profile.company_id);

      if (!billingEntities || billingEntities.length === 0) {
        throw new Error('Entité de facturation non configurée');
      }

      // Get default billing entity for fallback
      const defaultBillingEntity = billingEntities.find(e => e.is_default) || billingEntities[0];

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Group rows by dossier_number for multi-equipment support
      const groupedContracts: Record<string, GroupedContract> = {};
      
      parsedData.forEach(row => {
        const dossierNum = row.dossier_number || '';
        
        if (!groupedContracts[dossierNum]) {
          // First row with this dossier number - initialize contract
          groupedContracts[dossierNum] = {
            client_name: row.client_name || '',
            client_company: row.client_company || '',
            client_email: row.client_email || '',
            client_phone: row.client_phone || '',
            client_vat: row.client_vat || '',
            client_address: row.client_address || '',
            client_city: row.client_city || '',
            client_postal_code: row.client_postal_code || '',
            client_country: row.client_country || 'BE',
            dossier_number: dossierNum,
            contract_number: row.contract_number || '',
            invoice_number: row.invoice_number || '',
            monthly_payment: row.monthly_payment || '',
            leaser_name: row.leaser_name || '',
            status: row.status || 'active',
            dossier_date: row.dossier_date || '',
            request_date: row.request_date || row.offer_date || '',
            invoice_date: row.invoice_date || '',
            payment_date: row.payment_date || '',
            contract_start_date: row.contract_start_date || '',
            contract_end_date: row.contract_end_date || '',
            contract_duration: row.contract_duration || '36',
            financed_amount: row.financed_amount || '',
            billing_entity_name: row.billing_entity_name || '',
            equipments: []
          };
        }
        
        // Add equipment to the contract
        if (row.equipment_title?.trim()) {
          const purchasePrice = parseEuropeanNumber(row.equipment_price || '0');
          const sellingPrice = parseEuropeanNumber(row.equipment_selling_price || '') || purchasePrice;
          groupedContracts[dossierNum].equipments.push({
            title: row.equipment_title,
            quantity: parseInt(row.equipment_qty || '1', 10),
            purchase_price: purchasePrice,
            selling_price: sellingPrice
          });
        }
      });

      // Map contracts with their billing entity IDs
      const contractsToImport = Object.values(groupedContracts).map(contract => {
        // Find billing entity by name (case-insensitive)
        const matchedEntity = billingEntities?.find(e => 
          e.name.toLowerCase().trim() === contract.billing_entity_name.toLowerCase().trim()
        );
        
        return {
          ...contract,
          billingEntityId: matchedEntity?.id || defaultBillingEntity.id
        };
      });
      
      const year = new Date().getFullYear().toString();

      const { data, error } = await supabase.functions.invoke('import-historical-contracts', {
        body: {
          contracts: contractsToImport,
          defaultBillingEntityId: defaultBillingEntity.id,
          companyId: profile.company_id,
          year,
          updateMode
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setReport(data);
      
      if (data.success || data.errors?.length === 0) {
        const createdMsg = data.contractsCreated > 0 ? `${data.contractsCreated} créé(s)` : '';
        const updatedMsg = data.contractsUpdated > 0 ? `${data.contractsUpdated} mis à jour` : '';
        const parts = [createdMsg, updatedMsg].filter(Boolean).join(', ');
        toast.success(`Import terminé ! ${parts} avec ${data.equipmentsCreated || 0} équipements.`);
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
              (() => {
                // Count unique dossiers for display
                const uniqueDossiers = new Set(parsedData.map(r => r.dossier_number)).size;
                const totalEquipments = parsedData.filter(r => r.equipment_title?.trim()).length;
                return (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {uniqueDossiers} contrat{uniqueDossiers > 1 ? 's' : ''} détecté{uniqueDossiers > 1 ? 's' : ''} 
                      {totalEquipments > 0 && ` • ${totalEquipments} équipement${totalEquipments > 1 ? 's' : ''}`}
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
                );
              })()
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
            (() => {
              // Group by dossier for preview
              const grouped: Record<string, { client: string; company: string; leaser: string; monthly: string; equipments: string[] }> = {};
              parsedData.forEach(row => {
                const key = row.dossier_number || '';
                if (!grouped[key]) {
                  grouped[key] = {
                    client: row.client_name || '',
                    company: row.client_company || '',
                    leaser: row.leaser_name || '',
                    monthly: row.monthly_payment || '',
                    equipments: []
                  };
                }
                if (row.equipment_title?.trim()) {
                  const qty = parseInt(row.equipment_qty || '1', 10);
                  grouped[key].equipments.push(`${qty}x ${row.equipment_title}`);
                }
              });
              const entries = Object.entries(grouped);
              
              // Count matches
              const matchedCount = Object.values(clientMatches).filter(m => m.matched).length;
              const newCount = entries.length - matchedCount;
              
              return (
                <div className="space-y-3">
                  {/* Match summary */}
                  {existingClients.length > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-medium">{matchedCount} lié(s) au CRM</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-700 font-medium">{newCount} nouveau(x) client(s)</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-muted">#</TableHead>
                            <TableHead className="sticky top-0 bg-muted">N° Dossier</TableHead>
                            <TableHead className="sticky top-0 bg-muted">Client</TableHead>
                            <TableHead className="sticky top-0 bg-muted">Matching CRM</TableHead>
                            <TableHead className="sticky top-0 bg-muted">Équipements</TableHead>
                            <TableHead className="sticky top-0 bg-muted">Leaser</TableHead>
                            <TableHead className="sticky top-0 bg-muted text-right">Mensualité</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.slice(0, 10).map(([dossier, data], idx) => {
                            const match = clientMatches[dossier];
                            const clientDisplay = data.company || data.client;
                            
                            return (
                              <TableRow key={dossier}>
                                <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                                <TableCell className="font-mono text-sm">{dossier}</TableCell>
                                <TableCell className="max-w-[150px] truncate" title={clientDisplay}>
                                  {clientDisplay}
                                </TableCell>
                                <TableCell>
                                  {match?.matched ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <Link2 className="h-3 w-3 mr-1" />
                                      {match.client?.company || match.client?.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      Nouveau client
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {data.equipments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {data.equipments.map((eq, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {eq}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>{data.leaser}</TableCell>
                                <TableCell className="text-right">{data.monthly} €</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {entries.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50 border-t">
                        ... et {entries.length - 10} autres contrats
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* Update mode toggle */}
          {parsedData.length > 0 && validationErrors.length === 0 && !report && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-amber-600" />
                <div>
                  <Label htmlFor="update-mode" className="font-medium cursor-pointer">
                    Mode mise à jour
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mettre à jour les contrats existants au lieu de créer des doublons
                  </p>
                </div>
              </div>
              <Switch 
                id="update-mode"
                checked={updateMode}
                onCheckedChange={setUpdateMode}
              />
            </div>
          )}

          {/* Import button */}
          {parsedData.length > 0 && validationErrors.length === 0 && !report && (
            (() => {
              const uniqueContracts = new Set(parsedData.map(r => r.dossier_number)).size;
              return (
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
                      {updateMode ? 'Mettre à jour' : 'Importer'} ({uniqueContracts} contrat{uniqueContracts > 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              );
            })()
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-700">{report.totalRows}</div>
                <div className="text-xs text-blue-600">Contrats traités</div>
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
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200 text-center">
                <div className="text-2xl font-bold text-cyan-700">{report.contractsUpdated || 0}</div>
                <div className="text-xs text-cyan-600">Contrats MAJ</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
                <div className="text-2xl font-bold text-orange-700">{report.equipmentsCreated || 0}</div>
                <div className="text-xs text-orange-600">Équipements</div>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 text-center">
                <div className="text-2xl font-bold text-teal-700">{report.invoicesCreated || 0}</div>
                <div className="text-xs text-teal-600">Factures créées</div>
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
                {key === 'dossier_number' ? (
                  <Badge variant="default" className="h-5 px-1 text-xs">*</Badge>
                ) : key === 'client_company' ? (
                  <Badge variant="secondary" className="h-5 px-1 text-xs">~</Badge>
                ) : (
                  <span className="w-5" />
                )}
                <code className="text-xs bg-muted px-1 rounded">{key}</code>
                <span className="text-muted-foreground">→ {label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            <span className="inline-flex items-center gap-1"><Badge variant="default" className="h-4 px-1 text-xs">*</Badge> Obligatoire</span>
            <span className="inline-flex items-center gap-1 ml-4"><Badge variant="secondary" className="h-4 px-1 text-xs">~</Badge> Recommandé pour le matching CRM</span>
            <br />
            Séparateur : point-virgule (;) ou virgule (,). Format de date : JJ/MM/AAAA
            <br />
            💡 <strong>Matching automatique</strong> : Le système lie automatiquement les clients existants par N° TVA, nom d'entreprise ou nom client.
            <br />
            💡 La date de fin de contrat est calculée automatiquement si non fournie (date début + durée).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalContractsImport;
