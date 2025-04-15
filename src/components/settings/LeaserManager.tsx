
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
  AlertCircle
} from "lucide-react";
import { Leaser } from "@/types/equipment";
import { getLeasers, addLeaser, updateLeaser, deleteLeaser, insertDefaultLeasers } from "@/services/leaserService";
import { toast } from "sonner";
import LeaserList from "./LeaserList";
import LeaserForm from "./LeaserForm";
import { v4 as uuidv4, validate as isUUID } from 'uuid';

const LeaserManager = () => {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLeaser, setCurrentLeaser] = useState<Leaser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    initializeLeasers();
  }, []);

  const initializeLeasers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Insérer les leasers par défaut si nécessaire
      await insertDefaultLeasers();
      
      // Récupérer les leasers
      const fetchedLeasers = await getLeasers();
      console.log("Leasers récupérés:", fetchedLeasers);
      
      // Vérifier que tous les leasers ont des IDs valides
      const validLeasers = fetchedLeasers.map(leaser => {
        // Si l'ID n'est pas un UUID valide, en générer un nouveau
        if (!isUUID(leaser.id)) {
          console.log(`ID leaser non valide détecté: ${leaser.id}, génération d'un nouveau UUID`);
          return {
            ...leaser,
            id: uuidv4()
          };
        }
        return leaser;
      });
      
      setLeasers(validLeasers);
    } catch (error: any) {
      console.error("Erreur lors de l'initialisation des leasers:", error);
      setError(`Erreur lors du chargement des leasers: ${error.message}`);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenSheet = (leaser?: Leaser) => {
    if (leaser) {
      // Vérifier que l'ID est un UUID valide
      if (!isUUID(leaser.id)) {
        console.error(`Tentative d'éditer un leaser avec un ID non valide: ${leaser.id}`);
        toast.error("Identifiant du leaser non valide");
        return;
      }
      
      console.log(`Édition du leaser - ID: ${leaser.id}, Name: ${leaser.name}`);
      
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
        // Vérifier que l'ID du leaser est un UUID valide
        if (!isUUID(currentLeaser.id)) {
          throw new Error(`ID du leaser non valide: ${currentLeaser.id}`);
        }
        
        console.log("Mise à jour du leaser avec ID:", currentLeaser.id);
        
        const success = await updateLeaser(currentLeaser.id, leaserData);
        if (success) {
          // Mettre à jour le leaser dans la liste locale
          setLeasers(prevLeasers => 
            prevLeasers.map(l => 
              l.id === currentLeaser.id ? { ...l, ...leaserData } : l
            )
          );
          handleCloseSheet();
          toast.success("Leaser mis à jour avec succès");
          
          // Si le leaser est défini comme par défaut, mettre à jour les autres leasers
          if (leaserData.is_default) {
            initializeLeasers(); // Recharger tous les leasers pour refléter les changements
          }
        }
      } else {
        const addedLeaser = await addLeaser(leaserData);
        if (addedLeaser) {
          // Ajouter le nouveau leaser à la liste locale
          setLeasers(prevLeasers => [...prevLeasers, addedLeaser]);
          handleCloseSheet();
          toast.success("Leaser ajouté avec succès");
          
          // Si le leaser est défini comme par défaut, mettre à jour les autres leasers
          if (leaserData.is_default) {
            initializeLeasers(); // Recharger tous les leasers pour refléter les changements
          }
        }
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde du leaser:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };
  
  const handleDeleteLeaser = async (id: string) => {
    // Vérifier que l'ID est un UUID valide
    if (!isUUID(id)) {
      toast.error(`ID du leaser non valide: ${id}`);
      return;
    }
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce leaser ?")) {
      try {
        console.log("Tentative de suppression du leaser avec ID:", id);
        const success = await deleteLeaser(id);
        if (success) {
          setLeasers(leasers.filter(leaser => leaser.id !== id));
          toast.success("Leaser supprimé avec succès");
        }
      } catch (error: any) {
        console.error("Erreur lors de la suppression du leaser:", error);
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
            <Button onClick={() => handleOpenSheet()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un leaser</span>
            </Button>
          </div>
          <CardDescription>
            Gérez les organismes de financement et leurs tranches de coefficients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <LeaserList 
            leasers={leasers}
            isLoading={isLoading}
            onEdit={handleOpenSheet}
            onDelete={handleDeleteLeaser}
            onRefresh={initializeLeasers}
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
