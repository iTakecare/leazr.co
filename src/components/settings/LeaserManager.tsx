
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Building2, 
  Plus
} from "lucide-react";
import { Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import { getLeasers, addLeaser, updateLeaser, deleteLeaser } from "@/services/leaserService";
import { toast } from "sonner";
import LeaserList from "./LeaserList";
import LeaserForm from "./LeaserForm";

const LeaserManager = () => {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLeaser, setCurrentLeaser] = useState<Leaser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchLeasers();
  }, []);

  const fetchLeasers = async () => {
    setIsLoading(true);
    try {
      const fetchedLeasers = await getLeasers();
      setLeasers(fetchedLeasers.length > 0 ? fetchedLeasers : defaultLeasers);
    } catch (error) {
      console.error("Error fetching leasers:", error);
      setLeasers(defaultLeasers);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenSheet = (leaser?: Leaser) => {
    if (leaser) {
      // Vérifier que l'ID est bien un UUID (pour débogage)
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
        console.log("Mise à jour du leaser avec ID:", currentLeaser.id);
        
        const success = await updateLeaser(currentLeaser.id, leaserData);
        if (success) {
          await fetchLeasers();
          handleCloseSheet();
          toast.success("Leaser mis à jour avec succès");
        }
      } else {
        const addedLeaser = await addLeaser(leaserData);
        if (addedLeaser) {
          await fetchLeasers(); // Rafraîchir toute la liste pour être sûr
          handleCloseSheet();
          toast.success("Leaser ajouté avec succès");
        }
      }
    } catch (error: any) {
      console.error("Error saving leaser:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };
  
  const handleDeleteLeaser = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce leaser ?")) {
      try {
        console.log("Tentative de suppression du leaser avec ID:", id);
        const success = await deleteLeaser(id);
        if (success) {
          setLeasers(leasers.filter(leaser => leaser.id !== id));
          toast.success("Leaser supprimé avec succès");
        }
      } catch (error: any) {
        console.error("Error deleting leaser:", error);
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
