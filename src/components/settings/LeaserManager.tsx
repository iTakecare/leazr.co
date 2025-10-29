
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Building2, 
  Plus,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Leaser } from "@/types/equipment";
import { getLeasers, addLeaser, updateLeaser, deleteLeaser } from "@/services/leaserService";
import { toast } from "sonner";
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";
import LeaserList from "./LeaserList";
import LeaserForm from "./LeaserForm";

const LeaserManager = () => {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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
  
  const handleOpenSheet = (leaser?: Leaser) => {
    if (leaser) {
      setCurrentLeaser(leaser);
      setIsEditMode(true);
    } else {
      setCurrentLeaser(null);
      setIsEditMode(false);
    }
    setIsOpen(true);
  };
  
  const handleCloseSheet = () => {
    setIsOpen(false);
    setCurrentLeaser(null);
  };
  
  const handleSaveLeaser = async (leaserData: Omit<Leaser, "id">) => {
    try {
      console.log("🔄 LeaserManager - Début de la sauvegarde", { isEditMode, leaserData });
      
      if (isEditMode && currentLeaser) {
        const success = await updateLeaser(currentLeaser.id, leaserData);
        console.log("✏️ LeaserManager - Résultat update:", success);
        if (success) {
          await refreshLeasers();
          handleCloseSheet();
          toast.success("Leaser mis à jour avec succès");
        }
      } else {
        const addedLeaser = await addLeaser(leaserData);
        console.log("➕ LeaserManager - Résultat ajout:", addedLeaser);
        if (addedLeaser) {
          console.log("🔄 LeaserManager - Refresh des leasers...");
          await refreshLeasers();
          console.log("❌ LeaserManager - Fermeture du formulaire...");
          handleCloseSheet();
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
  
  return (
    <>
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
              <Button onClick={() => handleOpenSheet()} className="flex items-center gap-2">
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
            onEdit={handleOpenSheet}
            onDelete={handleDeleteLeaser}
          />
        </CardContent>
      </Card>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? 'Modifier le leaser' : 'Ajouter un leaser'}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? 'Modifiez les informations et les tranches du leaser.'
                : 'Ajoutez un nouvel organisme de financement.'}
            </SheetDescription>
          </SheetHeader>
          
          <LeaserForm
            currentLeaser={currentLeaser}
            isEditMode={isEditMode}
            onSave={handleSaveLeaser}
            onCancel={handleCloseSheet}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default LeaserManager;
