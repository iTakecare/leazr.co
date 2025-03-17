
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CommissionLevel,
  CommissionRate,
  getCommissionLevels,
  getCommissionRates,
  createCommissionLevel,
  updateCommissionLevel,
  deleteCommissionLevel,
  createCommissionRate,
  updateCommissionRate,
  deleteCommissionRate,
  setDefaultCommissionLevel,
} from "@/services/commissionService";
import CommissionLevelForm from "./CommissionLevelForm";
import CommissionRateForm from "./CommissionRateForm";
import { supabase } from "@/integrations/supabase/client";

const CommissionManager = () => {
  const [activeTab, setActiveTab] = useState<"partner" | "ambassador">("partner");
  const [partnerLevels, setPartnerLevels] = useState<CommissionLevel[]>([]);
  const [ambassadorLevels, setAmbassadorLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<CommissionLevel | null>(null);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [editRateId, setEditRateId] = useState<string | null>(null);
  const [deleteLevelDialog, setDeleteLevelDialog] = useState(false);
  const [deleteRateDialog, setDeleteRateDialog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load commission levels
  useEffect(() => {
    loadCommissionLevels();
  }, []);

  // Load rates when a level is selected
  useEffect(() => {
    if (selectedLevel) {
      loadRates(selectedLevel.id);
    } else {
      setRates([]);
    }
  }, [selectedLevel]);

  const loadCommissionLevels = async () => {
    setLoading(true);
    try {
      const levels = await getCommissionLevels();
      
      const partnerLevels = levels.filter(level => level.type === 'partner');
      const ambassadorLevels = levels.filter(level => level.type === 'ambassador');
      
      setPartnerLevels(partnerLevels);
      setAmbassadorLevels(ambassadorLevels);
      
      // Select first level of current tab if none is selected
      if (!selectedLevel) {
        const currentTabLevels = activeTab === 'partner' ? partnerLevels : ambassadorLevels;
        if (currentTabLevels.length > 0) {
          setSelectedLevel(currentTabLevels[0]);
        }
      }
    } catch (error) {
      console.error("Error loading commission levels:", error);
      toast.error("Erreur lors du chargement des niveaux de commission");
    } finally {
      setLoading(false);
    }
  };

  const loadRates = async (levelId: string) => {
    try {
      const ratesData = await getCommissionRates(levelId);
      setRates(ratesData);
    } catch (error) {
      console.error("Error loading commission rates:", error);
      toast.error("Erreur lors du chargement des taux de commission");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "partner" | "ambassador");
    setSelectedLevel(null);
  };

  const handleSelectLevel = (level: CommissionLevel) => {
    setSelectedLevel(level);
  };

  const handleAddLevel = async (data: Partial<CommissionLevel>) => {
    try {
      const newLevel = await createCommissionLevel({
        name: data.name!,
        type: activeTab,
        is_default: data.is_default || false
      });
      
      if (newLevel) {
        toast.success("Niveau de commission créé avec succès");
        setIsAddLevelOpen(false);
        await loadCommissionLevels();
        setSelectedLevel(newLevel);
      }
    } catch (error) {
      console.error("Error creating commission level:", error);
      toast.error("Erreur lors de la création du niveau de commission");
    }
  };

  const handleEditLevel = async (data: Partial<CommissionLevel>) => {
    if (!selectedLevel) return;
    
    try {
      const updatedLevel = await updateCommissionLevel(selectedLevel.id, {
        name: data.name!,
        is_default: data.is_default
      });
      
      if (updatedLevel) {
        toast.success("Niveau de commission mis à jour avec succès");
        setIsEditLevelOpen(false);
        await loadCommissionLevels();
      }
    } catch (error) {
      console.error("Error updating commission level:", error);
      toast.error("Erreur lors de la mise à jour du niveau de commission");
    }
  };

  const handleDeleteLevel = async () => {
    if (!selectedLevel) return;
    
    try {
      const success = await deleteCommissionLevel(selectedLevel.id);
      
      if (success) {
        toast.success("Niveau de commission supprimé avec succès");
        setDeleteLevelDialog(false);
        await loadCommissionLevels();
        setSelectedLevel(null);
      }
    } catch (error) {
      console.error("Error deleting commission level:", error);
      toast.error("Erreur lors de la suppression du niveau de commission");
    }
  };

  const handleSetDefault = async (level: CommissionLevel) => {
    try {
      const success = await setDefaultCommissionLevel(level.id, level.type);
      
      if (success) {
        toast.success(`${level.name} défini comme niveau par défaut`);
        await loadCommissionLevels();
      }
    } catch (error) {
      console.error("Error setting default commission level:", error);
      toast.error("Erreur lors de la définition du niveau par défaut");
    }
  };

  const handleAddRate = async (data: Omit<CommissionRate, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedLevel) return;
    
    try {
      const newRate = await createCommissionRate({
        level_id: selectedLevel.id,
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        rate: data.rate
      });
      
      if (newRate) {
        toast.success("Taux de commission ajouté avec succès");
        setIsAddRateOpen(false);
        await loadRates(selectedLevel.id);
      }
    } catch (error) {
      console.error("Error creating commission rate:", error);
      toast.error("Erreur lors de la création du taux de commission");
    }
  };

  const handleEditRate = async (id: string, data: Partial<CommissionRate>) => {
    try {
      const updatedRate = await updateCommissionRate(id, {
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        rate: data.rate
      });
      
      if (updatedRate) {
        toast.success("Taux de commission mis à jour avec succès");
        setEditRateId(null);
        if (selectedLevel) {
          await loadRates(selectedLevel.id);
        }
      }
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast.error("Erreur lors de la mise à jour du taux de commission");
    }
  };

  const handleDeleteRate = async (id: string) => {
    try {
      const success = await deleteCommissionRate(id);
      
      if (success) {
        toast.success("Taux de commission supprimé avec succès");
        setDeleteRateDialog(null);
        if (selectedLevel) {
          await loadRates(selectedLevel.id);
        }
      }
    } catch (error) {
      console.error("Error deleting commission rate:", error);
      toast.error("Erreur lors de la suppression du taux de commission");
    }
  };

  // Get levels based on active tab
  const currentLevels = activeTab === 'partner' ? partnerLevels : ambassadorLevels;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="partner" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="partner">Partenaires</TabsTrigger>
          <TabsTrigger value="ambassador">Ambassadeurs</TabsTrigger>
        </TabsList>
        
        {["partner", "ambassador"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Barèmes de commissionnement</h2>
              <Dialog open={isAddLevelOpen} onOpenChange={setIsAddLevelOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Ajouter un niveau</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un niveau de commission</DialogTitle>
                  </DialogHeader>
                  <CommissionLevelForm 
                    onSubmit={handleAddLevel} 
                    onCancel={() => setIsAddLevelOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Niveaux</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : currentLevels.length === 0 ? (
                      <div className="text-center p-4 text-muted-foreground">
                        Aucun niveau de commission défini
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {currentLevels.map((level) => (
                          <li 
                            key={level.id} 
                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                              selectedLevel?.id === level.id 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => handleSelectLevel(level)}
                          >
                            <div className="flex items-center gap-2">
                              <span>{level.name}</span>
                              {level.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Par défaut
                                </Badge>
                              )}
                            </div>
                            {!level.is_default && selectedLevel?.id === level.id && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(level);
                                }}
                              >
                                <span className="text-xs">Définir par défaut</span>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-2">
                {selectedLevel ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{selectedLevel.name}</CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedLevel.is_default ? "Niveau par défaut" : "Niveau standard"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={isEditLevelOpen} onOpenChange={setIsEditLevelOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Modifier le niveau de commission</DialogTitle>
                            </DialogHeader>
                            <CommissionLevelForm 
                              initialData={{
                                name: selectedLevel.name,
                                is_default: selectedLevel.is_default
                              }}
                              onSubmit={handleEditLevel} 
                              onCancel={() => setIsEditLevelOpen(false)} 
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <AlertDialog 
                          open={deleteLevelDialog} 
                          onOpenChange={setDeleteLevelDialog}
                        >
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={selectedLevel.is_default}
                            onClick={() => setDeleteLevelDialog(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera définitivement le niveau de commission
                                "{selectedLevel.name}" et tous ses taux associés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteLevel}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-medium">Taux de commission</h3>
                        <Dialog open={isAddRateOpen} onOpenChange={setIsAddRateOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un taux
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Ajouter un taux de commission</DialogTitle>
                            </DialogHeader>
                            <CommissionRateForm 
                              onSubmit={handleAddRate} 
                              onCancel={() => setIsAddRateOpen(false)} 
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {rates.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground border rounded-md">
                          Aucun taux de commission défini pour ce niveau.
                          Ajoutez des taux pour définir le barème.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {rates
                            .sort((a, b) => b.min_amount - a.min_amount) // Sort by min_amount descending
                            .map((rate) => (
                              <div 
                                key={rate.id} 
                                className="border rounded-md p-4"
                              >
                                {editRateId === rate.id ? (
                                  <CommissionRateForm
                                    initialData={{
                                      min_amount: rate.min_amount,
                                      max_amount: rate.max_amount,
                                      rate: rate.rate
                                    }}
                                    onSubmit={(data) => handleEditRate(rate.id, data)}
                                    onCancel={() => setEditRateId(null)}
                                    inline
                                  />
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">
                                        {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                                      </div>
                                      <div className="text-lg font-bold text-primary">
                                        {rate.rate}%
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => setEditRateId(rate.id)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <AlertDialog 
                                        open={deleteRateDialog === rate.id} 
                                        onOpenChange={(open) => setDeleteRateDialog(open ? rate.id : null)}
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-destructive"
                                          onClick={() => setDeleteRateDialog(rate.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Cette action supprimera définitivement ce taux de commission.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => handleDeleteRate(rate.id)}
                                              className="bg-destructive text-destructive-foreground"
                                            >
                                              Supprimer
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-medium mb-2">Aucun niveau sélectionné</h3>
                        <p className="text-muted-foreground mb-4">
                          Sélectionnez un niveau dans la liste ou créez-en un nouveau
                        </p>
                      </div>
                      <Button onClick={() => setIsAddLevelOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un niveau
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CommissionManager;
