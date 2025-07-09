import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Check, X, RefreshCw } from "lucide-react";
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
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";

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

  useEffect(() => {
    loadCommissionLevels();
  }, []);

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
      const partnerLevelsData = await getCommissionLevels('partner');
      const ambassadorLevelsData = await getCommissionLevels('ambassador');
      
      setPartnerLevels(partnerLevelsData);
      setAmbassadorLevels(ambassadorLevelsData);
      
      if (partnerLevelsData.length === 0 && ambassadorLevelsData.length === 0) {
        toast.info("Aucune donnée de commission trouvée pour cette entreprise");
      }
      
      if (!selectedLevel) {
        const currentTabLevels = activeTab === 'partner' ? partnerLevelsData : ambassadorLevelsData;
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

  const handleForceRefreshCache = () => {
    console.log("🔄 Forçage du rafraîchissement du cache pour l'isolation des commissions");
    forceRefreshCRMCache();
  };

  const loadRates = async (levelId: string) => {
    try {
      console.log("Loading rates for level ID:", levelId);
      const { data, error } = await supabase
        .from('commission_rates')
        .select('*')
        .eq('commission_level_id', levelId);
      
      if (error) {
        console.error("Error loading commission rates from DB:", error);
        toast.error("Erreur lors du chargement des taux de commission");
        return;
      }
      
      console.log("Loaded rates from DB:", data);
      if (data && data.length > 0) {
        setRates(data);
      } else {
        const ratesData = await getCommissionRates(levelId);
        console.log("Loaded rates from service:", ratesData);
        setRates(ratesData);
      }
    } catch (error) {
      console.error("Error in loadRates:", error);
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

  const handleAddRate = async (data: Partial<CommissionRate>) => {
    if (!selectedLevel) return;
    
    try {
      const values = data as CommissionRate;
      const rateData: Omit<CommissionRate, "id" | "created_at"> = {
        commission_level_id: selectedLevel.id,
        min_amount: values.min_amount,
        max_amount: values.max_amount,
        rate: values.rate,
        updated_at: new Date().toISOString()
      };
      
      const newRate = await createCommissionRate(rateData);
      
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleForceRefreshCache}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
                <Dialog open={isAddLevelOpen} onOpenChange={setIsAddLevelOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Ajouter un niveau</span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-[280px] grid-cols-2">
                  <TabsTrigger value="partner">Partenaires</TabsTrigger>
                  <TabsTrigger value="ambassador">Ambassadeurs</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-md font-medium mb-3">Niveaux de commission</h3>
                  <div className="space-y-2">
                    {getCurrentLevels().map((level) => (
                      <div
                        key={level.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedLevel?.id === level.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedLevel(level)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{level.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Type: {level.type === 'partner' ? 'Partenaire' : 'Ambassadeur'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {level.is_default && (
                              <Badge variant="secondary">Par défaut</Badge>
                            )}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLevel(level);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLevel(level);
                                  setDeleteLevelDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-medium">
                      Tranches de commission {selectedLevel ? `- ${selectedLevel.name}` : ''}
                    </h3>
                    {selectedLevel && (
                      <Dialog open={isAddRateOpen} onOpenChange={setIsAddRateOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter
                          </Button>
                        </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un niveau de commission</DialogTitle>
                  </DialogHeader>
                  <CommissionLevelForm 
                    isOpen={isAddLevelOpen}
                    onClose={() => setIsAddLevelOpen(false)}
                    level={null}
                    type={activeTab as 'ambassador' | 'partner'}
                    onSave={handleAddLevel}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid md:grid-cols-1 gap-4">
              {currentLevels.length > 0 ? (
                <ul className="space-y-2">
                  {currentLevels.map((level) => (
                    <li 
                      key={level.id} 
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                        selectedLevel?.id === level.id 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted border'
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
                      <div className="flex items-center gap-2">
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
                        <Dialog open={isEditLevelOpen && selectedLevel?.id === level.id} onOpenChange={(open) => {
                          if (!open) setIsEditLevelOpen(false);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLevel(level);
                                setIsEditLevelOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Modifier</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Modifier le niveau de commission</DialogTitle>
                            </DialogHeader>
                            <CommissionLevelForm 
                              isOpen={isEditLevelOpen}
                              onClose={() => setIsEditLevelOpen(false)}
                              level={selectedLevel}
                              type={activeTab as 'ambassador' | 'partner'}
                              onSave={handleEditLevel}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="col-span-full text-center py-8 bg-muted/20 rounded-lg">
                  <p className="text-muted-foreground">
                    Aucun barème de commission défini pour les {activeTab === 'partner' ? 'partenaires' : 'ambassadeurs'}.
                  </p>
                  <Button 
                    onClick={() => setIsAddLevelOpen(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un barème
                  </Button>
                </div>
              )}
            </div>
            
            {selectedLevel && (
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Taux de commission pour {selectedLevel.name}
                  </h3>
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
                        isOpen={isAddRateOpen}
                        onClose={() => setIsAddRateOpen(false)}
                        onSave={handleAddRate}
                        levelId={selectedLevel.id}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-4">
                  {rates && rates.length > 0 ? (
                    rates
                      .sort((a, b) => Number(a.min_amount) - Number(b.min_amount))
                      .map((rate) => (
                        <div 
                          key={rate.id} 
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          {editRateId === rate.id ? (
                            <CommissionRateForm 
                              onSave={(data) => {
                                handleEditRate(rate.id, data);
                              }}
                              rate={rate}
                              onClose={() => setEditRateId(null)}
                              inline
                            />
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-4 flex-1">
                                <div>
                                  <span className="text-sm text-muted-foreground">Plage</span>
                                  <div>
                                    {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Taux</span>
                                  <div className="font-medium">{rate.rate}%</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditRateId(rate.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Modifier</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setDeleteRateDialog(rate.id)}
                                  className="text-destructive hover:text-destructive/90"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Supprimer</span>
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 bg-muted/20 rounded-lg">
                      <p className="text-muted-foreground">
                        Aucun taux défini pour ce barème.
                      </p>
                      <Button 
                        onClick={() => setIsAddRateOpen(true)} 
                        className="mt-4"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un taux
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={deleteLevelDialog} onOpenChange={setDeleteLevelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le barème</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce barème de commission ?
              Cela supprimera également tous les taux associés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteLevelDialog(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteLevel}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={deleteRateDialog !== null} 
        onOpenChange={(open) => !open && setDeleteRateDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le taux</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce taux de commission ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRateDialog(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteRateDialog) {
                  handleDeleteRate(deleteRateDialog);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommissionManager;
