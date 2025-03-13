import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Info } from 'lucide-react';
import { toast } from 'sonner';

// Composants importés
import ConnectionForm from './woocommerce/ConnectionForm';
import ImportOptions from './woocommerce/ImportOptions';
import ImportActions from './woocommerce/ImportActions';
import ImportProgress from './woocommerce/ImportProgress';
import ImportStatistics from './woocommerce/ImportStatistics';
import ErrorsList from './woocommerce/ErrorsList';
import StatusBadge from './woocommerce/StatusBadge';
import RLSWarning from './woocommerce/RLSWarning';
import SchemaUpdateInfo from './woocommerce/SchemaUpdateInfo';

// Services et types
import { 
  fetchProductsFromWooCommerce, 
  importProductsToSupabase,
  checkDatabaseSchema,
  updateDatabaseSchema,
  checkRLSPermissions,
  SchemaCheckResult
} from './woocommerce/ImportService';
import { 
  WooCommerceProduct, 
  FetchingOptions,
  ImportStatus,
  ConnectionStatus
} from './woocommerce/types';

const WooCommerceImporter = () => {
  // Options d'importation
  const [fetchingOptions, setFetchingOptions] = useState<FetchingOptions>({
    includeImages: true,
    includeVariations: true,
    includeDescriptions: true,
    importCategories: true,
    overwriteExisting: false,
    bypassRLS: true
  });
  
  // États de l'interface
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [importedImages, setImportedImages] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('untested');
  
  // Vérification du schéma de la base de données
  const [schemaHasCategory, setSchemaHasCategory] = useState(false);
  const [schemaHasDescription, setSchemaHasDescription] = useState(false);
  const [updatingSchema, setUpdatingSchema] = useState(false);
  const [schemaUpdateSuccess, setSchemaUpdateSuccess] = useState(false);
  const [hasRLSPermissions, setHasRLSPermissions] = useState(false);
  
  // Vérifier si le schéma a les colonnes nécessaires au chargement
  const checkSchema = useCallback(async () => {
    try {
      // Vérifier le schéma de la base de données
      const { hasCategory, hasDescription } = await checkDatabaseSchema();
      console.log('Résultat vérification schéma:', { hasCategory, hasDescription });
      setSchemaHasCategory(hasCategory);
      setSchemaHasDescription(hasDescription);
      
      // Vérifier les permissions RLS
      const hasPermissions = await checkRLSPermissions();
      console.log('A les permissions RLS:', hasPermissions);
      setHasRLSPermissions(hasPermissions);
      
      // Si pas de permissions RLS, activer automatiquement l'option de bypass
      if (!hasPermissions) {
        setFetchingOptions(prev => ({ ...prev, bypassRLS: true }));
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du schéma:', error);
      toast.error("Erreur lors de la vérification du schéma");
    }
  }, []);

  useEffect(() => {
    checkSchema();
  }, [checkSchema]);
  
  // Mettre à jour le schéma de la base de données
  const handleUpdateSchema = async () => {
    if (!fetchingOptions.bypassRLS && !hasRLSPermissions) {
      toast.error("Vous devez activer l'option 'Contourner la sécurité RLS' pour mettre à jour le schéma");
      return;
    }
    
    setUpdatingSchema(true);
    setErrors([]);
    setImportStage("Mise à jour du schéma de la base de données...");
    
    try {
      console.log('Début de la mise à jour du schéma...');
      const result = await updateDatabaseSchema();
      console.log('Résultat mise à jour schéma:', result);
      
      if (result.success) {
        setSchemaHasCategory(true);
        setSchemaHasDescription(true);
        setSchemaUpdateSuccess(true);
        toast.success("Schéma de la base de données mis à jour avec succès");
      } else {
        setErrors(prev => [...prev, `Erreur lors de la mise à jour du schéma: ${result.error || 'Erreur inconnue'}`]);
        toast.error(`Erreur lors de la mise à jour du schéma: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Error updating database schema:', error);
      setErrors(prev => [...prev, `Erreur lors de la mise à jour du schéma: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      toast.error(`Erreur lors de la mise à jour du schéma: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUpdatingSchema(false);
      setImportStage('');
      
      // Vérifier à nouveau le schéma après la mise à jour
      setTimeout(() => {
        checkSchema();
      }, 1000);
    }
  };
  
  // Récupérer les produits depuis WooCommerce
  const fetchProducts = async () => {
    setImportStatus('fetching');
    setErrors([]);
    setProducts([]);
    
    try {
      setImportStage("Récupération des produits WooCommerce...");
      
      // Récupérer tous les produits
      const fetchedProducts = await fetchProductsFromWooCommerce();
      
      setProducts(fetchedProducts);
      setImportStage(`${fetchedProducts.length} produits trouvés`);
      
    } catch (error) {
      console.error('Error fetching WooCommerce products:', error);
      setErrors([`Erreur lors de la récupération des produits: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      setImportStatus('error');
    } finally {
      if (importStatus !== 'error') {
        setImportStatus('idle');
      }
    }
  };
  
  // Importer les produits dans la base de données
  const importProducts = async () => {
    if (products.length === 0) {
      setErrors(['Aucun produit à importer']);
      return;
    }
    
    setImportStatus('importing');
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setImportProgress(0);
    setImportedImages(0);
    
    try {
      await importProductsToSupabase(
        products,
        fetchingOptions,
        { hasCategory: schemaHasCategory, hasDescription: schemaHasDescription },
        {
          onStageChange: setImportStage,
          onProgressUpdate: setImportProgress,
          onImageImported: () => setImportedImages(prev => prev + 1),
          onSuccess: setSuccessCount,
          onError: setErrorCount,
          onErrorMessage: (message) => setErrors(prev => [...prev, message])
        }
      );
      
      setImportStatus('completed');
      setImportStage('Importation terminée');
      
    } catch (error) {
      console.error('Error importing products:', error);
      setErrors(prev => [...prev, `Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      setImportStatus('error');
      toast.error(`Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    if (importStatus === 'fetching' || importStatus === 'importing') {
      if (!confirm('Êtes-vous sûr de vouloir annuler l\'importation en cours ?')) {
        return;
      }
    }
    
    setImportStatus('idle');
    setProducts([]);
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setImportProgress(0);
    setImportStage('');
  };

  // Handler pour le test de connexion
  const handleConnectionTest = (success: boolean) => {
    setConnectionStatus(success ? 'success' : 'error');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-gray-500" />
          Import du catalogue WooCommerce
        </h2>
        
        <StatusBadge status={importStatus} />
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Cet outil permet d&apos;importer les produits de votre boutique WooCommerce directement dans le catalogue iTakecare.
              Les identifiants d&apos;API sont préremplis pour faciliter l&apos;importation.
            </p>
          </div>
        </div>
      </div>
      
      {/* Avertissement RLS */}
      <RLSWarning hasRLSPermissions={hasRLSPermissions} />
      
      {/* Information sur le schéma */}
      <SchemaUpdateInfo 
        schemaHasCategory={schemaHasCategory}
        schemaHasDescription={schemaHasDescription}
        onUpdateSchema={handleUpdateSchema}
        updatingSchema={updatingSchema}
        updateSuccess={schemaUpdateSuccess}
      />
      
      {/* Formulaire des identifiants */}
      <ConnectionForm 
        disabled={importStatus === 'fetching' || importStatus === 'importing' || updatingSchema}
        onTestConnection={handleConnectionTest}
        connectionStatus={connectionStatus}
        setErrors={setErrors}
      />
      
      {/* Options d'importation */}
      <ImportOptions 
        options={fetchingOptions}
        setOptions={setFetchingOptions}
        disabled={importStatus === 'fetching' || importStatus === 'importing' || updatingSchema}
        schemaHasCategory={schemaHasCategory}
        schemaHasDescription={schemaHasDescription}
      />

      {/* Actions et statistiques */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Actions et statistiques</h3>

        <div className="space-y-4">
          {/* Actions */}
          <ImportActions 
            onFetchProducts={fetchProducts}
            onImportProducts={importProducts}
            onReset={resetForm}
            productsCount={products.length}
            importStatus={importStatus}
            disabled={updatingSchema}
          />

          {/* Statistiques */}
          <ImportStatistics 
            productsCount={products.length}
            successCount={successCount}
            errorCount={errorCount}
            importedImages={importedImages}
            includeImages={fetchingOptions.includeImages}
            completed={importStatus === 'completed'}
          />

          {/* Barre de progression */}
          <ImportProgress 
            progress={importProgress}
            stage={importStage}
            isActive={importStatus === 'importing' || importStatus === 'fetching' || updatingSchema}
          />

          {/* Liste des erreurs */}
          <ErrorsList errors={errors} />
        </div>
      </div>
    </div>
  );
};

export default WooCommerceImporter;
