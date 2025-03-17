
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Check, X, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  getCommissionLevels, 
  getCommissionRates, 
  CommissionLevel, 
  CommissionRate,
  setDefaultCommissionLevel,
  deleteCommissionLevel,
  getCommissionLevelWithRates
} from "@/services/commissionService";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import CommissionLevelForm from "./CommissionLevelForm";
import CommissionRateForm from "./CommissionRateForm";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const CommissionManager = () => {
  const [activeTab, setActiveTab] = useState<'ambassador' | 'partner'>('ambassador');
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<CommissionLevel | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, CommissionRate[]>>({});
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [isDeletingLevel, setIsDeletingLevel] = useState(false);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [selectedRate, setSelectedRate] = useState<CommissionRate | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [isDeletingRate, setIsDeletingRate] = useState(false);

  useEffect(() => {
    loadLevels();
  }, [activeTab]);

  const loadLevels = async () => {
    try {
      const levelsData = await getCommissionLevels(activeTab);
      setLevels(levelsData);

      // Reset expanded level if the current one doesn't exist anymore
      if (expandedLevel && !levelsData.find(l => l.id === expandedLevel)) {
        setExpandedLevel(null);
      }

      // Load rates for each level
      const ratesData: Record<string, CommissionRate[]> = {};
      for (const level of levelsData) {
        ratesData[level.id] = await getCommissionRates(level.id);
      }
      setRates(ratesData);
    } catch (error) {
      console.error("Error loading commission levels:", error);
      toast.error("Erreur lors du chargement des barèmes de commission");
    }
  };

  const handleAddLevel = () => {
    setSelectedLevel(null);
    setIsAddingLevel(true);
  };

  const handleEditLevel = (level: CommissionLevel) => {
    setSelectedLevel(level);
    setIsEditingLevel(true);
  };

  const handleDeleteLevel = (level: CommissionLevel) => {
    setSelectedLevel(level);
    setIsDeletingLevel(true);
  };

  const confirmDeleteLevel = async () => {
    if (!selectedLevel) return;
    
    const success = await deleteCommissionLevel(selectedLevel.id);
    if (success) {
      toast.success("Niveau de commission supprimé avec succès");
      loadLevels();
    }
    setIsDeletingLevel(false);
  };

  const handleAddRate = (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    
    setSelectedLevel(level);
    setSelectedRate(null);
    setIsAddingRate(true);
  };

  const handleEditRate = (rate: CommissionRate) => {
    const level = levels.find(l => l.id === rate.level_id);
    if (!level) return;
    
    setSelectedLevel(level);
    setSelectedRate(rate);
    setIsEditingRate(true);
  };

  const handleDeleteRate = (rate: CommissionRate) => {
    setSelectedRate(rate);
    setIsDeletingRate(true);
  };

  const confirmDeleteRate = async () => {
    if (!selectedRate) return;
    
    try {
      const { error } = await supabase
        .from('commission_rates')
        .delete()
        .eq('id', selectedRate.id);
      
      if (error) throw error;
      
      toast.success("Taux de commission supprimé avec succès");
      loadLevels();
    } catch (error) {
      console.error("Error deleting commission rate:", error);
      toast.error("Erreur lors de la suppression du taux de commission");
    }
    
    setIsDeletingRate(false);
  };

  const handleSetDefault = async (level: CommissionLevel) => {
    if (level.is_default) return;
    
    const success = await setDefaultCommissionLevel(level.id, level.type);
    if (success) {
      toast.success(`${level.name} défini comme niveau par défaut`);
      loadLevels();
    }
  };

  const toggleExpand = (levelId: string) => {
    if (expandedLevel === levelId) {
      setExpandedLevel(null);
    } else {
      setExpandedLevel(levelId);
    }
  };

  const onLevelSaved = () => {
    loadLevels();
    setIsAddingLevel(false);
    setIsEditingLevel(false);
  };

  const onRateSaved = () => {
    loadLevels();
    setIsAddingRate(false);
    setIsEditingRate(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Barèmes de commissionnement</h2>
        <Button onClick={handleAddLevel}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau barème
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ambassador' | 'partner')}>
        <TabsList className="mb-4">
          <TabsTrigger value="ambassador">Ambassadeurs</TabsTrigger>
          <TabsTrigger value="partner">Partenaires</TabsTrigger>
        </TabsList>

        <TabsContent value="ambassador" className="space-y-4">
          {levels.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Aucun barème de commissionnement défini pour les ambassadeurs</p>
                <Button onClick={handleAddLevel} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> Créer un barème
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {levels.map((level) => (
                <Card key={level.id} className={level.is_default ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CardTitle>{level.name}</CardTitle>
                        {level.is_default && <Badge variant="secondary">Par défaut</Badge>}
                      </div>
                      <div className="flex gap-2">
                        {!level.is_default && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSetDefault(level)}
                            title="Définir comme barème par défaut"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditLevel(level)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!level.is_default && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteLevel(level)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleExpand(level.id)}
                        >
                          {expandedLevel === level.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedLevel === level.id && (
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium">Taux de commission</h3>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAddRate(level.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter une tranche
                          </Button>
                        </div>
                        
                        {rates[level.id]?.length > 0 ? (
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="px-4 py-2 text-left font-medium">Tranche</th>
                                  <th className="px-4 py-2 text-left font-medium">Taux</th>
                                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rates[level.id]?.map((rate) => (
                                  <tr key={rate.id} className="border-t">
                                    <td className="px-4 py-2">
                                      {formatAmount(rate.min_amount)} - {formatAmount(rate.max_amount)}
                                    </td>
                                    <td className="px-4 py-2">
                                      {rate.rate}%
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleEditRate(rate)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleDeleteRate(rate)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            Aucune tranche définie
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="partner" className="space-y-4">
          {levels.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Aucun barème de commissionnement défini pour les partenaires</p>
                <Button onClick={handleAddLevel} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> Créer un barème
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {levels.map((level) => (
                <Card key={level.id} className={level.is_default ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CardTitle>{level.name}</CardTitle>
                        {level.is_default && <Badge variant="secondary">Par défaut</Badge>}
                      </div>
                      <div className="flex gap-2">
                        {!level.is_default && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSetDefault(level)}
                            title="Définir comme barème par défaut"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditLevel(level)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!level.is_default && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteLevel(level)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleExpand(level.id)}
                        >
                          {expandedLevel === level.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedLevel === level.id && (
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium">Taux de commission</h3>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAddRate(level.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter une tranche
                          </Button>
                        </div>
                        
                        {rates[level.id]?.length > 0 ? (
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="px-4 py-2 text-left font-medium">Tranche</th>
                                  <th className="px-4 py-2 text-left font-medium">Taux</th>
                                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rates[level.id]?.map((rate) => (
                                  <tr key={rate.id} className="border-t">
                                    <td className="px-4 py-2">
                                      {formatAmount(rate.min_amount)} - {formatAmount(rate.max_amount)}
                                    </td>
                                    <td className="px-4 py-2">
                                      {rate.rate}%
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleEditRate(rate)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleDeleteRate(rate)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            Aucune tranche définie
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialogs */}
      <CommissionLevelForm
        isOpen={isAddingLevel || isEditingLevel}
        onClose={() => {
          setIsAddingLevel(false);
          setIsEditingLevel(false);
        }}
        level={isEditingLevel ? selectedLevel : null}
        type={activeTab}
        onSave={onLevelSaved}
      />

      <CommissionRateForm
        isOpen={isAddingRate || isEditingRate}
        onClose={() => {
          setIsAddingRate(false);
          setIsEditingRate(false);
        }}
        levelId={selectedLevel?.id || ''}
        rate={isEditingRate ? selectedRate : null}
        onSave={onRateSaved}
      />

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={isDeletingLevel} onOpenChange={setIsDeletingLevel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le barème</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce barème de commissionnement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLevel} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeletingRate} onOpenChange={setIsDeletingRate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la tranche</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette tranche de commissionnement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRate} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommissionManager;
