
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
import { getLeasers, addLeaser, updateLeaser, deleteLeaser, insertDefaultLeasers } from "@/services/leaserService";
import { toast } from "sonner";
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
    initializeLeasers();
  }, []);

  const initializeLeasers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('LeaserManager: Initializing leasers...');
      
      // First try to get existing leasers
      const existingLeasers = await getLeasers();
      console.log('LeaserManager: Existing leasers found:', existingLeasers.length);
      
      // If no leasers found, insert defaults
      if (existingLeasers.length === 0) {
        console.log('LeaserManager: No leasers found, inserting defaults...');
        const insertSuccess = await insertDefaultLeasers();
        
        if (insertSuccess) {
          // Wait a moment then fetch again
          await new Promise(resolve => setTimeout(resolve, 1000));
          const fetchedLeasers = await getLeasers();
          console.log('LeaserManager: Fetched leasers after insertion:', fetchedLeasers.length);
          setLeasers(fetchedLeasers);
        } else {
          setError('Impossible d\'insérer les leasers par défaut');
        }
      } else {
        setLeasers(existingLeasers);
      }
    } catch (error: any) {
      console.error('LeaserManager: Error during initialization:', error);
      setError(`Erreur lors du chargement des leasers: ${error.message}`);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLeasers = async () => {
    setIsRefreshing(true);
    try {
      console.log('LeaserManager: Manual refresh...');
      
      const fetchedLeasers = await getLeasers();
      console.log('LeaserManager: Refreshed leasers:', fetchedLeasers.length);
      
      // If still no leasers, try to insert defaults
      if (fetchedLeasers.length === 0) {
        console.log('LeaserManager: Still no leasers, trying to insert defaults...');
        const insertSuccess = await insertDefaultLeasers();
        
        if (insertSuccess) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const newLeasers = await getLeasers();
          setLeasers(newLeasers);
          toast.success(`Leasers par défaut insérés - ${newLeasers.length} leasers trouvés`);
        } else {
          toast.error("Impossible d'insérer les leasers par défaut");
        }
      } else {
        setLeasers(fetchedLeasers);
        toast.success(`Liste des leasers actualisée - ${fetchedLeasers.length} leasers trouvés`);
      }
      
      setError(null);
    } catch (error: any) {
      console.error('LeaserManager: Error during refresh:', error);
      toast.error(`Erreur lors de l'actualisation: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleOpenSheet = (leaser?: Leaser) => {
    if (leaser) {
      console.log(`LeaserManager: Editing leaser - ID: ${leaser.id}, Name: ${leaser.name}`);
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
      if (isEditMode && currentLeaser) {
        console.log("LeaserManager: Updating leaser with ID:", currentLeaser.id);
        
        const success = await updateLeaser(currentLeaser.id, leaserData);
        if (success) {
          await refreshLeasers();
          handleCloseSheet();
          toast.success("Leaser mis à jour avec succès");
        }
      } else {
        console.log("LeaserManager: Creating new leaser");
        const addedLeaser = await addLeaser(leaserData);
        if (addedLeaser) {
          await refreshLeasers();
          handleCloseSheet();
          toast.success("Leaser ajouté avec succès");
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
        console.log("LeaserManager: Deleting leaser with ID:", id);
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshLeasers}
                  className="ml-2"
                >
                  Réessayer
                </Button>
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
