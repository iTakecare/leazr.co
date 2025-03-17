
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCommissionLevels,
  getCommissionLevelWithRates,
  CommissionLevel,
  CommissionRate,
  createCommissionLevel,
  updateCommissionLevel,
  deleteCommissionLevel,
  createCommissionRate as createCommissionRateService,
  updateCommissionRate as updateCommissionRateService,
  deleteCommissionRate,
} from "@/services/commissionService";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import CommissionLevelForm from "./CommissionLevelForm";
import CommissionRateForm from "./CommissionRateForm";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CommissionManagerProps {}

const CommissionManager: React.FC<CommissionManagerProps> = () => {
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [openLevelDialog, setOpenLevelDialog] = useState(false);
  const [openEditLevelDialog, setOpenEditLevelDialog] = useState(false);
  const [openRateDialog, setOpenRateDialog] = useState(false);
  const [openEditRateDialog, setOpenEditRateDialog] = useState(false);
  const [selectedRate, setSelectedRate] = useState<CommissionRate | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<CommissionLevel | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast: useToastFunc } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const levelsData = await getCommissionLevels();
        setLevels(levelsData);
      } catch (error) {
        console.error("Error fetching commission levels:", error);
        useToastFunc({
          variant: "destructive",
          title: "Erreur",
          description:
            "Erreur lors du chargement des niveaux de commission. Veuillez réessayer.",
        });
      }
    };

    fetchLevels();
  }, [useToastFunc]);

  useEffect(() => {
    const fetchRates = async () => {
      if (selectedLevelId) {
        try {
          const levelWithRates = await getCommissionLevelWithRates(
            selectedLevelId
          );
          setRates(levelWithRates.rates || []);
        } catch (error) {
          console.error("Error fetching commission rates:", error);
          useToastFunc({
            variant: "destructive",
            title: "Erreur",
            description:
              "Erreur lors du chargement des taux de commission. Veuillez réessayer.",
          });
        }
      } else {
        setRates([]);
      }
    };

    fetchRates();
  }, [selectedLevelId, useToastFunc]);

  const handleLevelCreate = async (data: Partial<CommissionLevel>) => {
    setIsSubmitting(true);
    try {
      // Ensure 'type' is set to a default value if not provided
      const completeData = {
        ...data,
        type: data.type || 'standard'
      };
      
      const newLevel = await createCommissionLevel(completeData);
      setLevels([...levels, newLevel]);
      setOpenLevelDialog(false);
      useToastFunc({
        title: "Succès",
        description: "Niveau de commission créé avec succès.",
      });
    } catch (error) {
      console.error("Error creating commission level:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la création du niveau de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLevelUpdate = async (
    id: string,
    data: Partial<CommissionLevel>
  ) => {
    setIsSubmitting(true);
    try {
      const updatedLevel = await updateCommissionLevel(id, data);
      setLevels(
        levels.map((level) => (level.id === updatedLevel.id ? updatedLevel : level))
      );
      setOpenEditLevelDialog(false);
      useToastFunc({
        title: "Succès",
        description: "Niveau de commission mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating commission level:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la mise à jour du niveau de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLevelDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteCommissionLevel(id);
      setLevels(levels.filter((level) => level.id !== id));
      if (selectedLevelId === id) {
        setSelectedLevelId(null);
      }
      useToastFunc({
        title: "Succès",
        description: "Niveau de commission supprimé avec succès.",
      });
    } catch (error) {
      console.error("Error deleting commission level:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la suppression du niveau de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateCreate = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (!selectedLevelId) {
        throw new Error("No commission level selected.");
      }

      const newRate = await createCommissionRateService({
        ...data,
        commission_level_id: selectedLevelId,
      });

      setRates([...rates, newRate]);
      setOpenRateDialog(false);
      useToastFunc({
        title: "Succès",
        description: "Taux de commission créé avec succès.",
      });
    } catch (error) {
      console.error("Error creating commission rate:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la création du taux de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateUpdate = async (id: string, data: any) => {
    setIsSubmitting(true);
    try {
      const updatedRate = await updateCommissionRateService(id, data);
      setRates(
        rates.map((rate) => (rate.id === updatedRate.id ? updatedRate : rate))
      );
      setOpenEditRateDialog(false);
      useToastFunc({
        title: "Succès",
        description: "Taux de commission mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating commission rate:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la mise à jour du taux de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteCommissionRate(id);
      setRates(rates.filter((rate) => rate.id !== id));
      useToastFunc({
        title: "Succès",
        description: "Taux de commission supprimé avec succès.",
      });
    } catch (error) {
      console.error("Error deleting commission rate:", error);
      useToastFunc({
        variant: "destructive",
        title: "Erreur",
        description:
          "Erreur lors de la suppression du taux de commission. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Niveaux de commission</h2>
        <Dialog open={openLevelDialog} onOpenChange={setOpenLevelDialog}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un niveau
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Créer un niveau de commission</DialogTitle>
              <DialogDescription>
                Ajouter un nouveau niveau de commission à votre liste.
              </DialogDescription>
            </DialogHeader>
            <CommissionLevelForm
              onSubmit={handleLevelCreate}
              onCancel={() => setOpenLevelDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <Separator />
      <Table>
        <TableCaption>
          Liste des niveaux de commission disponibles.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => (
            <TableRow key={level.id}>
              <TableCell className="font-medium">{level.name}</TableCell>
              <TableCell>{level.type}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedLevel(level);
                    setOpenEditLevelDialog(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="ml-2">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera le niveau de commission ainsi que
                        tous les taux associés. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isSubmitting}
                        onClick={() => handleLevelDelete(level.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => setSelectedLevelId(level.id)}
                >
                  Voir les taux
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>
              Total: {levels.length} niveau(x) de commission
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      {selectedLevel && (
        <Dialog
          open={openEditLevelDialog}
          onOpenChange={setOpenEditLevelDialog}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier le niveau de commission</DialogTitle>
              <DialogDescription>
                Modifier les informations du niveau de commission sélectionné.
              </DialogDescription>
            </DialogHeader>
            <CommissionLevelForm
              initialData={selectedLevel}
              onSubmit={(data) =>
                handleLevelUpdate(selectedLevel.id, data)
              }
              onCancel={() => {
                setOpenEditLevelDialog(false);
                setSelectedLevel(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedLevelId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">
              Taux de commission pour le niveau sélectionné
            </h3>
            <Dialog open={openRateDialog} onOpenChange={setOpenRateDialog}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un taux
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Créer un taux de commission</DialogTitle>
                  <DialogDescription>
                    Ajouter un nouveau taux de commission pour le niveau
                    sélectionné.
                  </DialogDescription>
                </DialogHeader>
                <CommissionRateForm
                  commissionLevel={selectedLevelId}
                  onSubmit={handleRateCreate}
                  onCancel={() => setOpenRateDialog(false)}
                  isSubmitting={isSubmitting}
                />
              </DialogContent>
            </Dialog>
          </div>
          <Separator />
          <Table>
            <TableCaption>
              Liste des taux de commission pour le niveau sélectionné.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Montant minimum</TableHead>
                <TableHead>Montant maximum</TableHead>
                <TableHead>Taux (%)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>{rate.min_amount}</TableCell>
                  <TableCell>{rate.max_amount}</TableCell>
                  <TableCell>{rate.rate}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedRate(rate);
                        setOpenEditRateDialog(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Êtes-vous sûr(e) ?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action supprimera le taux de commission. Cette
                            action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isSubmitting}
                            onClick={() => handleRateDelete(rate.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>
                  Total: {rates.length} taux(x) de commission
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {selectedRate && (
        <Dialog
          open={openEditRateDialog}
          onOpenChange={setOpenEditRateDialog}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier le taux de commission</DialogTitle>
              <DialogDescription>
                Modifier les informations du taux de commission sélectionné.
              </DialogDescription>
            </DialogHeader>
            <CommissionRateForm
              commissionLevel={selectedLevelId}
              initialData={selectedRate}
              onSubmit={(data) => handleRateUpdate(selectedRate.id, data)}
              onCancel={() => {
                setOpenEditRateDialog(false);
                setSelectedRate(null);
              }}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CommissionManager;
