
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportType = "products" | "clients" | "offers";

interface ImportResult {
  success: boolean;
  totalImported: number;
  skipped: number;
  errors?: string[];
}

const DataImporter = () => {
  const [activeTab, setActiveTab] = useState<ImportType>("products");
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    setImportResult(null);
    
    try {
      // Vérifier que le fichier est un CSV
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        throw new Error("Le fichier doit être au format CSV");
      }
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const csvData = e.target?.result as string;
          
          // Traiter les données CSV
          const result = await processCSVData(csvData, activeTab);
          
          setImportResult(result);
          
          if (result.success) {
            toast.success(`Importation réussie: ${result.totalImported} éléments importés`);
          } else {
            toast.error("Erreur lors de l'importation");
          }
        } catch (err: any) {
          console.error("Erreur lors du traitement du CSV:", err);
          setError(err.message || "Erreur lors du traitement du fichier");
          toast.error("Erreur lors du traitement du fichier");
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setIsUploading(false);
        toast.error("Erreur lors de la lecture du fichier");
      };
      
      reader.readAsText(file);
      
    } catch (err: any) {
      console.error("Erreur lors de l'upload:", err);
      setError(err.message || "Erreur lors de l'upload du fichier");
      setIsUploading(false);
      toast.error("Erreur lors de l'upload du fichier");
    }
    
    // Réinitialiser l'input file
    event.target.value = "";
  };

  const processCSVData = async (csvData: string, type: ImportType): Promise<ImportResult> => {
    // Découper le CSV en lignes et colonnes
    const lines = csvData.split("\n");
    const headers = lines[0].split(",").map(header => header.trim());
    
    if (lines.length <= 1) {
      throw new Error("Le fichier CSV est vide ou ne contient que les en-têtes");
    }
    
    const results: ImportResult = {
      success: true,
      totalImported: 0,
      skipped: 0,
      errors: []
    };
    
    // Fonction pour transformer une ligne CSV en objet
    const parseCSVLine = (line: string): Record<string, any> => {
      const values = line.split(",").map(value => value.trim());
      const obj: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] || null;
      });
      
      return obj;
    };
    
    try {
      // Traiter chaque ligne de données (sauter l'en-tête)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Ignorer les lignes vides
        
        try {
          const data = parseCSVLine(line);
          
          // Insérer les données dans la table correspondante
          switch (type) {
            case "products":
              await importProduct(data);
              break;
            case "clients":
              await importClient(data);
              break;
            case "offers":
              await importOffer(data);
              break;
          }
          
          results.totalImported++;
        } catch (err: any) {
          console.error(`Erreur à la ligne ${i}:`, err);
          results.skipped++;
          results.errors?.push(`Ligne ${i}: ${err.message}`);
        }
      }
      
      return results;
    } catch (err: any) {
      console.error("Erreur lors du traitement des données:", err);
      return {
        success: false,
        totalImported: results.totalImported,
        skipped: results.skipped,
        errors: [...(results.errors || []), err.message]
      };
    }
  };

  const importProduct = async (data: Record<string, any>) => {
    // Valider les données minimales requises
    if (!data.name) {
      throw new Error("Le nom du produit est requis");
    }
    
    // Convertir les champs numériques
    const price = data.price ? parseFloat(data.price) : 0;
    const monthly_price = data.monthly_price ? parseFloat(data.monthly_price) : null;
    const stock = data.stock ? parseInt(data.stock, 10) : null;
    
    // Préparer les données pour insertion
    const productData = {
      name: data.name,
      description: data.description || null,
      price,
      monthly_price,
      stock,
      brand: data.brand || "Generic",
      category: data.category || "other",
      model: data.model || null,
      sku: data.sku || null,
      active: data.active === "true" || data.active === "1",
      image_url: data.image_url || null,
      specifications: data.specifications ? JSON.parse(data.specifications) : {}
    };
    
    // Insérer dans la base de données
    const { error } = await supabase
      .from('products')
      .insert([productData]);
    
    if (error) throw error;
  };

  const importClient = async (data: Record<string, any>) => {
    // Valider les données minimales requises
    if (!data.name) {
      throw new Error("Le nom du client est requis");
    }
    
    // Préparer les données pour insertion
    const clientData = {
      name: data.name,
      email: data.email || null,
      company: data.company || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      country: data.country || null,
      vat_number: data.vat_number || null,
      notes: data.notes || null,
      status: data.status || "active"
    };
    
    // Insérer dans la base de données
    const { error } = await supabase
      .from('clients')
      .insert([clientData]);
    
    if (error) throw error;
  };

  const importOffer = async (data: Record<string, any>) => {
    // Valider les données minimales requises
    if (!data.client_name) {
      throw new Error("Le nom du client est requis");
    }
    
    // Convertir les champs numériques
    const amount = data.amount ? parseFloat(data.amount) : 0;
    const monthly_payment = data.monthly_payment ? parseFloat(data.monthly_payment) : 0;
    const coefficient = data.coefficient ? parseFloat(data.coefficient) : 0;
    
    // Préparer les données pour insertion
    const offerData = {
      client_name: data.client_name,
      client_email: data.client_email || null,
      equipment_description: data.equipment_description || null,
      amount,
      monthly_payment,
      coefficient,
      status: data.status || "pending",
      user_id: data.user_id || null,
      client_id: data.client_id || null
    };
    
    // Insérer dans la base de données
    const { error } = await supabase
      .from('offers')
      .insert([offerData]);
    
    if (error) throw error;
  };

  const downloadTemplate = (type: ImportType) => {
    let csvContent = "";
    
    switch (type) {
      case "products":
        csvContent = "name,description,price,monthly_price,stock,brand,category,model,sku,active,image_url,specifications\n";
        csvContent += "Exemple Produit,Description du produit,1000,50,10,ExempleBrand,informatique,Modele123,SKU123,true,https://example.com/image.jpg,{}\n";
        break;
      case "clients":
        csvContent += "name,email,company,phone,address,city,postal_code,country,vat_number,notes,status\n";
        csvContent += "Exemple Client,client@example.com,Entreprise Exemple,0123456789,123 Rue Exemple,Paris,75000,France,FR12345678900,Notes client,active\n";
        break;
      case "offers":
        csvContent += "client_name,client_email,equipment_description,amount,monthly_payment,coefficient,status\n";
        csvContent += "Exemple Client,client@example.com,Description de l'équipement,10000,500,1.5,pending\n";
        break;
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `template_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importation de données</CardTitle>
        <CardDescription>
          Importez vos données existantes depuis des fichiers CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ImportType)}>
          <TabsList className="mb-4">
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="offers">Offres</TabsTrigger>
          </TabsList>
          
          {["products", "clients", "offers"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-medium mb-1">
                      Importer des {type === "products" ? "produits" : type === "clients" ? "clients" : "offres"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Format accepté: fichier CSV avec en-têtes
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate(type as ImportType)}
                    className="flex items-center gap-2 self-start"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger le modèle</span>
                  </Button>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 border rounded-md p-6 flex flex-col items-center justify-center">
                  <div className="mb-4 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <h4 className="text-base font-medium">Sélectionnez un fichier CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez ou cliquez pour sélectionner
                    </p>
                  </div>
                  
                  <label className="w-full">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button
                      variant="default"
                      className="w-full"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importation en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Sélectionner un fichier
                        </>
                      )}
                    </Button>
                  </label>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {importResult && (
                  <Alert variant={importResult.success ? "default" : "destructive"}>
                    {importResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {importResult.success ? "Importation réussie" : "Importation terminée avec des erreurs"}
                    </AlertTitle>
                    <AlertDescription>
                      <p>
                        {importResult.totalImported} éléments importés, {importResult.skipped} éléments ignorés.
                      </p>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-2">
                          <details>
                            <summary className="cursor-pointer text-sm font-medium">
                              Voir les erreurs ({importResult.errors.length})
                            </summary>
                            <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                              {importResult.errors.slice(0, 10).map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                              {importResult.errors.length > 10 && (
                                <li>...et {importResult.errors.length - 10} autres erreurs</li>
                              )}
                            </ul>
                          </details>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium mb-1">Instructions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Utilisez le modèle fourni pour formater vos données</li>
                    <li>Assurez-vous que toutes les colonnes requises sont présentes</li>
                    <li>Les champs numériques doivent utiliser un point comme séparateur décimal</li>
                    <li>Les booléens doivent être "true" ou "false"</li>
                    <li>Les dates doivent être au format YYYY-MM-DD</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DataImporter;
