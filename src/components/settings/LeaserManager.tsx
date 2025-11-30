
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Plus,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Leaser } from "@/types/equipment";
import { getLeasers, addLeaser, updateLeaser, deleteLeaser } from "@/services/leaserService";
import { toast } from "sonner";
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";
import LeaserList from "./LeaserList";
import LeaserForm from "./LeaserForm";

const LeaserManager = () => {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLeaser, setCurrentLeaser] = useState<Leaser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadLeasers();
  }, []);

  const loadLeasers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedLeasers = await getLeasers();
      setLeasers(fetchedLeasers);
      toast.success(`${fetchedLeasers.length} leasers chargés avec succès`);
    } catch (error: any) {
      console.error('LeaserManager: Error loading leasers:', error);
      setError(`Erreur lors du chargement des leasers: ${error.message}`);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLeasers = async () => {
    setIsRefreshing(true);
    try {
      await loadLeasers();
    } catch (error: any) {
      console.error('LeaserManager: Error during refresh:', error);
      toast.error(`Erreur lors de l'actualisation: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceRefreshCache = () => {
    console.log("🔄 Forçage du rafraîchissement du cache pour l'isolation des leasers");
    forceRefreshCRMCache();
  };
  
  const handleOpenForm = (leaser?: Leaser) => {
    if (leaser) {
      setCurrentLeaser(leaser);
      setIsEditMode(true);
    } else {
      setCurrentLeaser(null);
      setIsEditMode(false);
    }
    setViewMode('form');
  };
  
  const handleCloseForm = () => {
    setViewMode('list');
    setCurrentLeaser(null);
    setIsEditMode(false);
  };
  
  const handleSaveLeaser = async (leaserData: Omit<Leaser, "id">) => {
    try {
      console.log("🔄 LeaserManager - Début de la sauvegarde", { isEditMode, leaserData });
      
      if (isEditMode && currentLeaser) {
        const success = await updateLeaser(currentLeaser.id, leaserData);
        console.log("✏️ LeaserManager - Résultat update:", success);
        if (success) {
          await refreshLeasers();
          handleCloseForm();
          toast.success("Leaser mis à jour avec succès");
        }
      } else {
        const addedLeaser = await addLeaser(leaserData);
        console.log("➕ LeaserManager - Résultat ajout:", addedLeaser);
        if (addedLeaser) {
          console.log("🔄 LeaserManager - Refresh des leasers...");
          await refreshLeasers();
          console.log("❌ LeaserManager - Fermeture du formulaire...");
          handleCloseForm();
          console.log("✅ LeaserManager - Succès !");
          toast.success("Leaser ajouté avec succès");
        } else {
          console.warn("⚠️ LeaserManager - addedLeaser est null/undefined");
        }
      }
    } catch (error: any) {
      console.error("LeaserManager: Error saving leaser:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };
  
  const handleDeleteLeaser = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce leaser ?")) {
      try {
        const success = await deleteLeaser(id);
        if (success) {
          await refreshLeasers();
          toast.success("Leaser supprimé avec succès");
        }
      } catch (error: any) {
        console.error("LeaserManager: Error deleting leaser:", error);
        toast.error(`Erreur: ${error.message}`);
      }
    }
  };

  // Vue formulaire pleine page
  if (viewMode === 'form') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCloseForm}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {isEditMode ? 'Modifier le leaser' : 'Ajouter un leaser'}
              </CardTitle>
              <CardDescription>
                {isEditMode 
                  ? 'Modifiez les informations et les tranches du leaser.'
                  : 'Ajoutez un nouvel organisme de financement.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LeaserForm
            currentLeaser={currentLeaser}
            isEditMode={isEditMode}
            onSave={handleSaveLeaser}
            onCancel={handleCloseForm}
          />
        </CardContent>
      </Card>
    );
  }

  // Vue liste
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Leasers</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshLeasers}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un leaser</span>
            </Button>
          </div>
        </div>
        <CardDescription>
          Gérez les organismes de financement et leurs tranches de coefficients. ({leasers.length} leasers)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshLeasers}
                >
                  Réessayer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleForceRefreshCache}
                >
                  Forcer le cache
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <LeaserList 
          leasers={leasers}
          isLoading={isLoading}
          onEdit={handleOpenForm}
          onDelete={handleDeleteLeaser}
        />
      </CardContent>
    </Card>
  );
};

export default LeaserManager;
