import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Upload, FileSpreadsheet, Download, Check, X, Building2, Plus, Edit2, Trash2, AlertCircle, Users, FileText, Calendar } from "lucide-react";

interface BillingEntity {
  id: string;
  name: string;
  legal_form: string;
  vat_number: string;
  partner_id: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  valid_from: string;
  valid_until?: string;
  is_default: boolean;
}

interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  clientMatch: {
    found: boolean;
    clientId?: string;
    clientName?: string;
    matchType?: 'vat' | 'name' | 'new';
  };
  errors: string[];
  warnings: string[];
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

const CSV_TEMPLATE_HEADERS = [
  "client_name", "client_first_name", "client_last_name", "client_contact_name", "client_company",
  "client_email", "client_phone", "client_vat", "client_address", "client_city", "client_postal_code",
  "client_country", "client_billing_address", "client_billing_city", "client_billing_postal_code",
  "client_billing_country", "client_delivery_address", "client_delivery_city", "client_delivery_postal_code",
  "client_delivery_country", "client_delivery_same_as_billing", "client_notes", "client_status",
  "client_business_sector", "dossier_number", "leaser", "type", "duration", "source", "dossier_date",
  "invoice_date", "payment_date", "financed_amount", "equipment_cost", "margin", "margin_rate",
  "coefficient", "monthly_payment", "computers", "smartphones", "tablets", "remarks"
];

export default function ImportHistoricalData() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2022");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [showEntityDialog, setShowEntityDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<BillingEntity | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Entity form state
  const [entityForm, setEntityForm] = useState({
    name: "",
    legal_form: "societe",
    vat_number: "",
    partner_id: "",
    address: "",
    city: "",
    postal_code: "",
    country: "BE",
    valid_from: "",
    valid_until: "",
    is_default: false
  });

  // Fetch company ID and billing entities
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        // Fetch billing entities
        const { data: entities } = await supabase
          .from('billing_entities')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('valid_from', { ascending: true });
        
        if (entities) {
          setBillingEntities(entities as BillingEntity[]);
        }
      }
    };
    
    fetchData();
  }, [user]);

  const handleDownloadTemplate = () => {
    const csvContent = CSV_TEMPLATE_HEADERS.join(";") + "\n" +
      "Win Finance;Jean;Grenon;Jean Grenon;Win Finance SPRL;contact@winfinance.be;+32 81 123456;BE0123456789;Rue de Namur 123;Namur;5000;BE;Rue de Namur 123;Namur;5000;BE;;;;true;Client fidèle depuis 2020;active;Finance - courtage;2022-001;Grenke;leasing;36;Google;2022-01-15;2022-01-20;2022-02-01;10787.54;5639.75;5147.79;47.72;3.05;329.02;3;1;0;Renouvellement prévu";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template-import-historique.csv';
    link.click();
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    setIsLoading(true);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      // Generate preview with client matching
      const preview: ImportPreviewRow[] = rows.map((data, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate required fields
        if (!data.client_name) errors.push("Nom client requis");
        if (!data.financed_amount) errors.push("Montant financé requis");
        if (!data.monthly_payment) errors.push("Mensualité requise");
        if (!data.leaser) errors.push("Leaser requis");
        if (!data.type) errors.push("Type requis");
        if (!data.duration) errors.push("Durée requise");
        
        // Warnings
        if (!data.client_vat) warnings.push("N° TVA manquant - matching par nom");
        
        return {
          rowNumber: index + 1,
          data,
          clientMatch: {
            found: false,
            matchType: 'new' as const
          },
          errors,
          warnings
        };
      });
      
      setPreviewData(preview);
      toast.success(`${rows.length} lignes chargées`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error("Erreur lors de la lecture du fichier CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedEntityId || !csvFile || !companyId) {
      toast.error("Sélectionnez une entité de facturation");
      return;
    }
    
    setIsImporting(true);
    
    try {
      const text = await csvFile.text();
      const rows = parseCSV(text);
      
      const { data, error } = await supabase.functions.invoke('import-historical-contracts', {
        body: {
          rows,
          billingEntityId: selectedEntityId,
          companyId,
          year: selectedYear
        }
      });
      
      if (error) throw error;
      
      setImportReport(data);
      
      if (data.success) {
        toast.success(`Import réussi: ${data.offersCreated} offres, ${data.contractsCreated} contrats`);
      } else {
        toast.error(`Import terminé avec ${data.errors.length} erreurs`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveEntity = async () => {
    if (!companyId) return;
    
    try {
      const entityData = {
        ...entityForm,
        company_id: companyId,
        valid_until: entityForm.valid_until || null
      };
      
      if (editingEntity) {
        const { error } = await supabase
          .from('billing_entities')
          .update(entityData)
          .eq('id', editingEntity.id);
        
        if (error) throw error;
        toast.success("Entité mise à jour");
      } else {
        const { error } = await supabase
          .from('billing_entities')
          .insert(entityData);
        
        if (error) throw error;
        toast.success("Entité créée");
      }
      
      // Refresh entities
      const { data: entities } = await supabase
        .from('billing_entities')
        .select('*')
        .eq('company_id', companyId)
        .order('valid_from', { ascending: true });
      
      if (entities) {
        setBillingEntities(entities as BillingEntity[]);
      }
      
      setShowEntityDialog(false);
      setEditingEntity(null);
      setEntityForm({
        name: "",
        legal_form: "societe",
        vat_number: "",
        partner_id: "",
        address: "",
        city: "",
        postal_code: "",
        country: "BE",
        valid_from: "",
        valid_until: "",
        is_default: false
      });
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!confirm("Supprimer cette entité ?")) return;
    
    try {
      const { error } = await supabase
        .from('billing_entities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setBillingEntities(prev => prev.filter(e => e.id !== id));
      toast.success("Entité supprimée");
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEditEntity = (entity: BillingEntity) => {
    setEditingEntity(entity);
    setEntityForm({
      name: entity.name,
      legal_form: entity.legal_form || "societe",
      vat_number: entity.vat_number || "",
      partner_id: entity.partner_id || "",
      address: entity.address || "",
      city: entity.city || "",
      postal_code: entity.postal_code || "",
      country: entity.country || "BE",
      valid_from: entity.valid_from,
      valid_until: entity.valid_until || "",
      is_default: entity.is_default
    });
    setShowEntityDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import données historiques</h1>
          <p className="text-muted-foreground">Importez vos contrats 2022-2024 avec liaison au CRM</p>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le template CSV
        </Button>
      </div>

      {/* Billing Entities Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Entités de facturation
              </CardTitle>
              <CardDescription>
                Gérez les entités juridiques pour la facturation (personne physique, société)
              </CardDescription>
            </div>
            <Dialog open={showEntityDialog} onOpenChange={setShowEntityDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingEntity(null); setEntityForm({ name: "", legal_form: "societe", vat_number: "", partner_id: "", address: "", city: "", postal_code: "", country: "BE", valid_from: "", valid_until: "", is_default: false }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une entité
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingEntity ? "Modifier l'entité" : "Nouvelle entité de facturation"}</DialogTitle>
                  <DialogDescription>
                    Définissez les informations de l'entité juridique
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom de l'entité</Label>
                      <Input 
                        value={entityForm.name} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="iTakecare SRL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Forme juridique</Label>
                      <Select value={entityForm.legal_form} onValueChange={(v) => setEntityForm(prev => ({ ...prev, legal_form: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personne_physique">Personne physique</SelectItem>
                          <SelectItem value="societe">Société</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>N° TVA</Label>
                      <Input 
                        value={entityForm.vat_number} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, vat_number: e.target.value }))}
                        placeholder="BE0795642894"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Partner ID (Grenke)</Label>
                      <Input 
                        value={entityForm.partner_id} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, partner_id: e.target.value }))}
                        placeholder="ABC123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valide du</Label>
                      <Input 
                        type="date"
                        value={entityForm.valid_from} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, valid_from: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valide jusqu'au (optionnel)</Label>
                      <Input 
                        type="date"
                        value={entityForm.valid_until} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, valid_until: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input 
                      value={entityForm.address} 
                      onChange={(e) => setEntityForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Rue de l'Exemple 123"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Code postal</Label>
                      <Input 
                        value={entityForm.postal_code} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, postal_code: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input 
                        value={entityForm.city} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pays</Label>
                      <Input 
                        value={entityForm.country} 
                        onChange={(e) => setEntityForm(prev => ({ ...prev, country: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEntityDialog(false)}>Annuler</Button>
                  <Button onClick={handleSaveEntity}>
                    {editingEntity ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {billingEntities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune entité de facturation configurée</p>
              <p className="text-sm">Créez vos entités avant d'importer les données</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Forme juridique</TableHead>
                  <TableHead>N° TVA</TableHead>
                  <TableHead>Partner ID</TableHead>
                  <TableHead>Période de validité</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingEntities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>
                      <Badge variant={entity.legal_form === 'societe' ? 'default' : 'secondary'}>
                        {entity.legal_form === 'societe' ? 'Société' : 'Personne physique'}
                      </Badge>
                    </TableCell>
                    <TableCell>{entity.vat_number || '-'}</TableCell>
                    <TableCell>{entity.partner_id || '-'}</TableCell>
                    <TableCell>
                      {new Date(entity.valid_from).toLocaleDateString('fr-BE')}
                      {entity.valid_until ? ` → ${new Date(entity.valid_until).toLocaleDateString('fr-BE')}` : ' → Aujourd\'hui'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditEntity(entity)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteEntity(entity.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import par année
          </CardTitle>
          <CardDescription>
            Sélectionnez l'année et l'entité de facturation, puis uploadez votre fichier CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedYear} onValueChange={setSelectedYear}>
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="2022">2022</TabsTrigger>
              <TabsTrigger value="2023">2023</TabsTrigger>
              <TabsTrigger value="2024">2024</TabsTrigger>
              <TabsTrigger value="2025">2025</TabsTrigger>
            </TabsList>
            
            {["2022", "2023", "2024", "2025"].map(year => (
              <TabsContent key={year} value={year} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entité de facturation pour {year}</Label>
                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une entité" />
                      </SelectTrigger>
                      <SelectContent>
                        {billingEntities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name} ({entity.legal_form === 'societe' ? 'Société' : 'PP'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fichier CSV</Label>
                    <Input 
                      type="file" 
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Preview Section */}
                {previewData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Prévisualisation ({previewData.length} lignes)</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {previewData.filter(r => r.clientMatch.matchType === 'new').length} nouveaux clients
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {previewData.filter(r => r.errors.length > 0).length} erreurs
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>N° TVA</TableHead>
                            <TableHead>Match CRM</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Mensualité</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row) => (
                            <TableRow key={row.rowNumber} className={row.errors.length > 0 ? 'bg-destructive/10' : ''}>
                              <TableCell>{row.rowNumber}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{row.data.client_name}</div>
                                  {row.data.client_company && (
                                    <div className="text-sm text-muted-foreground">{row.data.client_company}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{row.data.client_vat || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={row.clientMatch.found ? 'default' : 'secondary'}>
                                  {row.clientMatch.found ? (
                                    <><Check className="h-3 w-3 mr-1" /> {row.clientMatch.matchType === 'vat' ? 'TVA' : 'Nom'}</>
                                  ) : (
                                    <><Plus className="h-3 w-3 mr-1" /> Nouveau</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>{row.data.financed_amount} €</TableCell>
                              <TableCell>{row.data.monthly_payment} €/mois</TableCell>
                              <TableCell>
                                {row.errors.length > 0 ? (
                                  <Badge variant="destructive">
                                    <X className="h-3 w-3 mr-1" />
                                    {row.errors.length} erreur(s)
                                  </Badge>
                                ) : row.warnings.length > 0 ? (
                                  <Badge variant="outline" className="text-yellow-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {row.warnings.length} avertissement(s)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setPreviewData([]); setCsvFile(null); }}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleImport} 
                        disabled={isImporting || !selectedEntityId || previewData.every(r => r.errors.length > 0)}
                      >
                        {isImporting ? (
                          <>Importation en cours...</>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Importer {previewData.filter(r => r.errors.length === 0).length} lignes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Import Report */}
      {importReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importReport.success ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              Rapport d'import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{importReport.totalRows}</div>
                  <div className="text-sm text-muted-foreground">Lignes traitées</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{importReport.clientsCreated}</div>
                  <div className="text-sm text-muted-foreground">Clients créés</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{importReport.offersCreated}</div>
                  <div className="text-sm text-muted-foreground">Offres créées</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">{importReport.contractsCreated}</div>
                  <div className="text-sm text-muted-foreground">Contrats créés</div>
                </CardContent>
              </Card>
            </div>

            {importReport.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-destructive mb-2">Erreurs ({importReport.errors.length})</h4>
                <ScrollArea className="h-[200px] border rounded p-4">
                  {importReport.errors.map((err, idx) => (
                    <div key={idx} className="text-sm py-1">
                      <span className="font-mono">Ligne {err.row}:</span> {err.message}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
