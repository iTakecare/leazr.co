
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check, Edit, Loader2, Plus, Trash, BadgePercent, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CommissionLevel, CommissionRate, getCommissionLevels } from "@/services/commissionService";
import CommissionLevelForm from "./CommissionLevelForm";
import CommissionRateForm from "./CommissionRateForm";
import { getCommissionRates, createCommissionLevel, updateCommissionLevel, deleteCommissionLevel, createCommissionRate, updateCommissionRate, deleteCommissionRate, setDefaultCommissionLevel } from "@/services/commissionService";

enum UserType {
  Partner = "partner",
  Ambassador = "ambassador"
}

const CommissionManager = () => {
  const [activeTab, setActiveTab] = useState<UserType>(UserType.Partner);
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
  const [rates, setRates] = useState<{[key: string]: CommissionRate[]}>({});
  const [loading, setLoading] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  
  // Level form state
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CommissionLevel | null>(null);
  const [submittingLevel, setSubmittingLevel] = useState(false);
  
  // Rate form state
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<CommissionRate | null>(null);
  const [submittingRate, setSubmittingRate] = useState(false);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'level' | 'rate'} | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // InlineRateEdit
  const [inlineEditingRateId, setInlineEditingRateId] = useState<string | null>(null);
  
  const fetchCommissionLevels = async () => {
    setLoading(true);
    try {
      const fetchedLevels = await getCommissionLevels(activeTab);
      setLevels(fetchedLevels);
      
      // Fetch rates for each level
      const ratesData: {[key: string]: CommissionRate[]} = {};
      for (const level of fetchedLevels) {
        const levelRates = await getCommissionRates(level.id);
        ratesData[level.id] = levelRates;
      }
      setRates(ratesData);
    } catch (error) {
      console.error("Error fetching commission levels:", error);
      toast.error("Erreur lors du chargement des barèmes de commission");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCommissionLevels();
  }, [activeTab]);
  
  const handleSaveLevel = async (data: Partial<CommissionLevel>) => {
    setSubmittingLevel(true);
    try {
      if (editingLevel) {
        await updateCommissionLevel(editingLevel.id, {
          name: data.name,
          type: activeTab
        });
        toast.success("Barème de commission mis à jour");
      } else {
        await createCommissionLevel({
          name: data.name || "",
          type: activeTab,
          is_default: false
        });
        toast.success("Barème de commission créé");
      }
      setIsLevelDialogOpen(false);
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error saving commission level:", error);
      toast.error("Erreur lors de l'enregistrement du barème");
    } finally {
      setSubmittingLevel(false);
    }
  };
  
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      if (itemToDelete.type === 'level') {
        await deleteCommissionLevel(itemToDelete.id);
        toast.success("Barème supprimé avec succès");
      } else {
        await deleteCommissionRate(itemToDelete.id);
        toast.success("Taux de commission supprimé");
      }
      setIsDeleteDialogOpen(false);
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(`Erreur lors de la suppression du ${itemToDelete.type === 'level' ? 'barème' : 'taux'}`);
    } finally {
      setDeleting(false);
    }
  };
  
  const handleAddRate = async (data: any) => {
    if (!selectedLevelId) return;
    
    setSubmittingRate(true);
    try {
      await createCommissionRate({
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        rate: data.rate,
        level_id: selectedLevelId
      });
      
      toast.success("Taux de commission ajouté");
      setIsRateDialogOpen(false);
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error adding rate:", error);
      toast.error("Erreur lors de l'ajout du taux");
    } finally {
      setSubmittingRate(false);
    }
  };
  
  const handleUpdateRate = async (data: any) => {
    if (!editingRate) return;
    
    setSubmittingRate(true);
    try {
      await updateCommissionRate(editingRate.id, {
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        rate: data.rate
      });
      
      toast.success("Taux de commission mis à jour");
      setIsRateDialogOpen(false);
      setInlineEditingRateId(null);
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error updating rate:", error);
      toast.error("Erreur lors de la mise à jour du taux");
    } finally {
      setSubmittingRate(false);
    }
  };
  
  const handleSetDefaultLevel = async (levelId: string) => {
    try {
      await setDefaultCommissionLevel(levelId, activeTab);
      toast.success("Barème par défaut mis à jour");
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error setting default level:", error);
      toast.error("Erreur lors de la définition du barème par défaut");
    }
  };
  
  const openAddRateDialog = (levelId: string) => {
    setSelectedLevelId(levelId);
    setEditingRate(null);
    setIsRateDialogOpen(true);
  };
  
  const openEditRateDialog = (rate: CommissionRate) => {
    setEditingRate(rate);
    setSelectedLevelId(null);
    setIsRateDialogOpen(true);
  };
  
  const startInlineRateEdit = (rate: CommissionRate) => {
    setInlineEditingRateId(rate.id);
    setEditingRate(rate);
  };
  
  const cancelInlineRateEdit = () => {
    setInlineEditingRateId(null);
    setEditingRate(null);
  };
  
  const saveInlineRateEdit = async (data: any) => {
    setSubmittingRate(true);
    try {
      if (!editingRate) return;
      
      await updateCommissionRate(editingRate.id, {
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        rate: data.rate
      });
      
      toast.success("Taux de commission mis à jour");
      setInlineEditingRateId(null);
      setEditingRate(null);
      fetchCommissionLevels();
    } catch (error) {
      console.error("Error updating rate:", error);
      toast.error("Erreur lors de la mise à jour du taux");
    } finally {
      setSubmittingRate(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Barèmes de commissionnement</h2>
        <Button onClick={() => {
          setEditingLevel(null);
          setIsLevelDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau barème
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserType)} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value={UserType.Partner}>Partenaires</TabsTrigger>
          <TabsTrigger value={UserType.Ambassador}>Ambassadeurs</TabsTrigger>
        </TabsList>
        
        <TabsContent value={UserType.Partner} className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : levels.length === 0 ? (
            <div className="border rounded-md p-8 text-center">
              <BadgePercent className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun barème défini</h3>
              <p className="text-muted-foreground mb-4">
                Créez des barèmes de commissionnement pour vos partenaires.
              </p>
              <Button onClick={() => {
                setEditingLevel(null);
                setIsLevelDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau barème
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {levels.map((level) => (
                <CommissionLevelCard 
                  key={level.id}
                  level={level}
                  rates={rates[level.id] || []}
                  expanded={expandedLevel === level.id}
                  onToggleExpand={() => setExpandedLevel(expandedLevel === level.id ? null : level.id)}
                  onEdit={() => {
                    setEditingLevel(level);
                    setIsLevelDialogOpen(true);
                  }}
                  onDelete={() => {
                    setItemToDelete({ id: level.id, type: 'level' });
                    setIsDeleteDialogOpen(true);
                  }}
                  onAddRate={() => openAddRateDialog(level.id)}
                  onEditRate={openEditRateDialog}
                  onDeleteRate={(rateId) => {
                    setItemToDelete({ id: rateId, type: 'rate' });
                    setIsDeleteDialogOpen(true);
                  }}
                  onSetDefault={() => handleSetDefaultLevel(level.id)}
                  inlineEditingRateId={inlineEditingRateId}
                  onStartInlineEdit={startInlineRateEdit}
                  onCancelInlineEdit={cancelInlineRateEdit}
                  onSaveInlineEdit={saveInlineRateEdit}
                  submittingRate={submittingRate}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={UserType.Ambassador} className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : levels.length === 0 ? (
            <div className="border rounded-md p-8 text-center">
              <BadgePercent className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun barème défini</h3>
              <p className="text-muted-foreground mb-4">
                Créez des barèmes de commissionnement pour vos ambassadeurs.
              </p>
              <Button onClick={() => {
                setEditingLevel(null);
                setIsLevelDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau barème
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {levels.map((level) => (
                <CommissionLevelCard 
                  key={level.id}
                  level={level}
                  rates={rates[level.id] || []}
                  expanded={expandedLevel === level.id}
                  onToggleExpand={() => setExpandedLevel(expandedLevel === level.id ? null : level.id)}
                  onEdit={() => {
                    setEditingLevel(level);
                    setIsLevelDialogOpen(true);
                  }}
                  onDelete={() => {
                    setItemToDelete({ id: level.id, type: 'level' });
                    setIsDeleteDialogOpen(true);
                  }}
                  onAddRate={() => openAddRateDialog(level.id)}
                  onEditRate={openEditRateEdit}
                  onDeleteRate={(rateId) => {
                    setItemToDelete({ id: rateId, type: 'rate' });
                    setIsDeleteDialogOpen(true);
                  }}
                  onSetDefault={() => handleSetDefaultLevel(level.id)}
                  inlineEditingRateId={inlineEditingRateId}
                  onStartInlineEdit={startInlineRateEdit}
                  onCancelInlineEdit={cancelInlineRateEdit}
                  onSaveInlineEdit={saveInlineRateEdit}
                  submittingRate={submittingRate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Commission Level Dialog */}
      <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Modifier le barème' : 'Nouveau barème'}</DialogTitle>
            <DialogDescription>
              {editingLevel 
                ? 'Modifiez les détails du barème de commissionnement'
                : 'Créez un nouveau barème de commissionnement'
              }
            </DialogDescription>
          </DialogHeader>
          
          <CommissionLevelForm 
            initialData={editingLevel || undefined}
            onSubmit={handleSaveLevel}
            onCancel={() => setIsLevelDialogOpen(false)}
            isSubmitting={submittingLevel}
          />
        </DialogContent>
      </Dialog>
      
      {/* Commission Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Modifier le taux' : 'Nouveau taux'}</DialogTitle>
            <DialogDescription>
              {editingRate 
                ? 'Modifiez les détails du taux de commission'
                : 'Ajoutez un nouveau taux de commission'
              }
            </DialogDescription>
          </DialogHeader>
          
          <CommissionRateForm
            commissionLevel={selectedLevelId ? levels.find(l => l.id === selectedLevelId) : null}
            initialData={editingRate || undefined}
            onSubmit={editingRate ? handleUpdateRate : handleAddRate}
            onCancel={() => setIsRateDialogOpen(false)}
            isSubmitting={submittingRate}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'level' 
                ? 'Êtes-vous sûr de vouloir supprimer ce barème de commissionnement ? Cette action est irréversible et supprimera également tous les taux associés.'
                : 'Êtes-vous sûr de vouloir supprimer ce taux de commission ? Cette action est irréversible.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface CommissionLevelCardProps {
  level: CommissionLevel;
  rates: CommissionRate[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddRate: () => void;
  onEditRate: (rate: CommissionRate) => void;
  onDeleteRate: (rateId: string) => void;
  onSetDefault: () => void;
  inlineEditingRateId: string | null;
  onStartInlineEdit: (rate: CommissionRate) => void;
  onCancelInlineEdit: () => void;
  onSaveInlineEdit: (data: any) => void;
  submittingRate: boolean;
}

const CommissionLevelCard: React.FC<CommissionLevelCardProps> = ({
  level,
  rates,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddRate,
  onEditRate,
  onDeleteRate,
  onSetDefault,
  inlineEditingRateId,
  onStartInlineEdit,
  onCancelInlineEdit,
  onSaveInlineEdit,
  submittingRate
}) => {
  const sortedRates = [...rates].sort((a, b) => a.min_amount - b.min_amount);
  
  return (
    <Card className={expanded ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              {level.name}
              {level.is_default && (
                <Badge variant="outline" className="ml-2 text-amber-600 bg-amber-50">
                  <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                  Par défaut
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {rates.length} taux définis
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {!level.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault();
                }}
                title="Définir comme barème par défaut"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Modifier le barème"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Supprimer le barème"
              className="text-destructive hover:text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <Button 
          variant="ghost" 
          className="w-full justify-between mb-3"
          onClick={onToggleExpand}
        >
          <span>{expanded ? "Masquer les détails" : "Afficher les détails"}</span>
          <span>{expanded ? "▼" : "►"}</span>
        </Button>
        
        {expanded && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Taux de commission</h4>
              <Button 
                size="sm"
                onClick={onAddRate}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un taux
              </Button>
            </div>
            
            {sortedRates.length === 0 ? (
              <div className="text-center py-6 border rounded-md border-dashed">
                <p className="text-muted-foreground mb-2">Aucun taux défini</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onAddRate}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un taux
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground px-2">
                  <div className="col-span-2">Plage (€)</div>
                  <div>Taux</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                {sortedRates.map((rate) => (
                  <div key={rate.id} className="border rounded-md p-2">
                    {inlineEditingRateId === rate.id ? (
                      <InlineRateEditForm 
                        rate={rate}
                        onSave={onSaveInlineEdit}
                        onCancel={onCancelInlineEdit}
                        isSubmitting={submittingRate}
                      />
                    ) : (
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <div className="col-span-2 text-sm">
                          {rate.min_amount.toLocaleString('fr-FR')} - {rate.max_amount.toLocaleString('fr-FR')} €
                        </div>
                        <div className="text-sm font-medium">
                          {rate.rate}%
                        </div>
                        <div className="col-span-2 flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onStartInlineEdit(rate)}
                            title="Modifier ce taux"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDeleteRate(rate.id)}
                            title="Supprimer ce taux"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface InlineRateEditFormProps {
  rate: CommissionRate;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const InlineRateEditForm: React.FC<InlineRateEditFormProps> = ({
  rate,
  onSave,
  onCancel,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    min_amount: rate.min_amount,
    max_amount: rate.max_amount,
    rate: rate.rate
  });
  
  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: parseFloat(value) || 0
    });
  };
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="min_amount" className="text-xs">Montant min</Label>
          <Input
            id="min_amount"
            type="number"
            value={formData.min_amount}
            onChange={(e) => handleChange('min_amount', e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="max_amount" className="text-xs">Montant max</Label>
          <Input
            id="max_amount"
            type="number"
            value={formData.max_amount}
            onChange={(e) => handleChange('max_amount', e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="rate" className="text-xs">Taux (%)</Label>
          <Input
            id="rate"
            type="number"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            className="h-8"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(formData)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="h-3 w-3 mr-1" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CommissionManager;
