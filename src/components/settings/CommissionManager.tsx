
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { 
  getCommissionLevels, 
  getCommissionRates, 
  deleteCommissionLevel,
  setDefaultCommissionLevel,
  deleteCommissionRate,
  CommissionLevel,
  CommissionRate 
} from "@/services/commissionService";
import CommissionLevelForm from "./CommissionLevelForm";
import CommissionRateForm from "./CommissionRateForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const CommissionManager: React.FC = () => {
  // States pour les ambassadeurs
  const [ambassadorLevels, setAmbassadorLevels] = useState<CommissionLevel[]>([]);
  const [ambassadorRates, setAmbassadorRates] = useState<{ [key: string]: CommissionRate[] }>({});
  const [isAmbassadorLevelFormOpen, setIsAmbassadorLevelFormOpen] = useState(false);
  const [editingAmbassadorLevel, setEditingAmbassadorLevel] = useState<CommissionLevel | null>(null);
  const [isAmbassadorRateFormOpen, setIsAmbassadorRateFormOpen] = useState(false);
  const [editingAmbassadorRate, setEditingAmbassadorRate] = useState<CommissionRate | null>(null);
  const [selectedAmbassadorLevelId, setSelectedAmbassadorLevelId] = useState<string>("");

  // States pour les partenaires
  const [partnerLevels, setPartnerLevels] = useState<CommissionLevel[]>([]);
  const [partnerRates, setPartnerRates] = useState<{ [key: string]: CommissionRate[] }>({});
  const [isPartnerLevelFormOpen, setIsPartnerLevelFormOpen] = useState(false);
  const [editingPartnerLevel, setEditingPartnerLevel] = useState<CommissionLevel | null>(null);
  const [isPartnerRateFormOpen, setIsPartnerRateFormOpen] = useState(false);
  const [editingPartnerRate, setEditingPartnerRate] = useState<CommissionRate | null>(null);
  const [selectedPartnerLevelId, setSelectedPartnerLevelId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);

  // Charger les données
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les niveaux d'ambassadeurs
      const ambassadorData = await getCommissionLevels('ambassador');
      setAmbassadorLevels(ambassadorData);
      
      // Charger les taux pour chaque niveau d'ambassadeur
      const ambassadorRatesData: { [key: string]: CommissionRate[] } = {};
      for (const level of ambassadorData) {
        const rates = await getCommissionRates(level.id);
        ambassadorRatesData[level.id] = rates;
      }
      setAmbassadorRates(ambassadorRatesData);

      // Charger les niveaux de partenaires
      const partnerData = await getCommissionLevels('partner');
      setPartnerLevels(partnerData);
      
      // Charger les taux pour chaque niveau de partenaire
      const partnerRatesData: { [key: string]: CommissionRate[] } = {};
      for (const level of partnerData) {
        const rates = await getCommissionRates(level.id);
        partnerRatesData[level.id] = rates;
      }
      setPartnerRates(partnerRatesData);
      
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      toast.error("Erreur lors du chargement des barèmes de commission");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers pour les ambassadeurs
  const handleCreateAmbassadorLevel = () => {
    setEditingAmbassadorLevel(null);
    setIsAmbassadorLevelFormOpen(true);
  };

  const handleEditAmbassadorLevel = (level: CommissionLevel) => {
    setEditingAmbassadorLevel(level);
    setIsAmbassadorLevelFormOpen(true);
  };

  const handleDeleteAmbassadorLevel = async (levelId: string) => {
    try {
      const success = await deleteCommissionLevel(levelId);
      if (success) {
        toast.success("Barème supprimé avec succès");
        loadData();
      } else {
        toast.error("Erreur lors de la suppression du barème");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression du barème");
    }
  };

  const handleSetDefaultAmbassadorLevel = async (levelId: string) => {
    try {
      const success = await setDefaultCommissionLevel(levelId, 'ambassador');
      if (success) {
        toast.success("Barème défini comme défaut");
        loadData();
      } else {
        toast.error("Erreur lors de la définition du barème par défaut");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la définition du barème par défaut");
    }
  };

  const handleAmbassadorLevelSave = async () => {
    setIsAmbassadorLevelFormOpen(false);
    setEditingAmbassadorLevel(null);
    await loadData();
  };

  const handleCreateAmbassadorRate = (levelId: string) => {
    setSelectedAmbassadorLevelId(levelId);
    setEditingAmbassadorRate(null);
    setIsAmbassadorRateFormOpen(true);
  };

  const handleEditAmbassadorRate = (rate: CommissionRate) => {
    setEditingAmbassadorRate(rate);
    setIsAmbassadorRateFormOpen(true);
  };

  const handleDeleteAmbassadorRate = async (rateId: string) => {
    try {
      const success = await deleteCommissionRate(rateId);
      if (success) {
        toast.success("Taux supprimé avec succès");
        loadData();
      } else {
        toast.error("Erreur lors de la suppression du taux");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression du taux");
    }
  };

  const handleAmbassadorRateSave = async () => {
    setIsAmbassadorRateFormOpen(false);
    setEditingAmbassadorRate(null);
    setSelectedAmbassadorLevelId("");
    await loadData();
  };

  // Handlers pour les partenaires
  const handleCreatePartnerLevel = () => {
    setEditingPartnerLevel(null);
    setIsPartnerLevelFormOpen(true);
  };

  const handleEditPartnerLevel = (level: CommissionLevel) => {
    setEditingPartnerLevel(level);
    setIsPartnerLevelFormOpen(true);
  };

  const handleDeletePartnerLevel = async (levelId: string) => {
    try {
      const success = await deleteCommissionLevel(levelId);
      if (success) {
        toast.success("Barème supprimé avec succès");
        loadData();
      } else {
        toast.error("Erreur lors de la suppression du barème");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression du barème");
    }
  };

  const handleSetDefaultPartnerLevel = async (levelId: string) => {
    try {
      const success = await setDefaultCommissionLevel(levelId, 'partner');
      if (success) {
        toast.success("Barème défini comme défaut");
        loadData();
      } else {
        toast.error("Erreur lors de la définition du barème par défaut");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la définition du barème par défaut");
    }
  };

  const handlePartnerLevelSave = async () => {
    setIsPartnerLevelFormOpen(false);
    setEditingPartnerLevel(null);
    await loadData();
  };

  const handleCreatePartnerRate = (levelId: string) => {
    setSelectedPartnerLevelId(levelId);
    setEditingPartnerRate(null);
    setIsPartnerRateFormOpen(true);
  };

  const handleEditPartnerRate = (rate: CommissionRate) => {
    setEditingPartnerRate(rate);
    setIsPartnerRateFormOpen(true);
  };

  const handleDeletePartnerRate = async (rateId: string) => {
    try {
      const success = await deleteCommissionRate(rateId);
      if (success) {
        toast.success("Taux supprimé avec succès");
        loadData();
      } else {
        toast.error("Erreur lors de la suppression du taux");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression du taux");
    }
  };

  const handlePartnerRateSave = async () => {
    setIsPartnerRateFormOpen(false);
    setEditingPartnerRate(null);
    setSelectedPartnerLevelId("");
    await loadData();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Barèmes de Commission</CardTitle>
          <CardDescription>Configuration des niveaux et taux de commission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Barèmes de Commission</CardTitle>
              <CardDescription>Configuration des niveaux et taux de commission</CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ambassadors" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ambassadors">Ambassadeurs</TabsTrigger>
              <TabsTrigger value="partners">Partenaires</TabsTrigger>
            </TabsList>

            <TabsContent value="ambassadors" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Barèmes Ambassadeurs</h3>
                <Button onClick={handleCreateAmbassadorLevel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Barème
                </Button>
              </div>

              <div className="space-y-4">
                {ambassadorLevels.map((level) => (
                  <Card key={level.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{level.name}</CardTitle>
                          {level.is_default && (
                            <Badge variant="secondary">
                              <Star className="h-3 w-3 mr-1" />
                              Par défaut
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!level.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultAmbassadorLevel(level.id)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Définir par défaut
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAmbassadorLevel(level)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={level.is_default}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le barème</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer ce barème ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAmbassadorLevel(level.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Taux de Commission</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAmbassadorRate(level.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter un taux
                          </Button>
                        </div>
                        
                        {ambassadorRates[level.id] && ambassadorRates[level.id].length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Montant Min</TableHead>
                                <TableHead>Montant Max</TableHead>
                                <TableHead>Taux (%)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ambassadorRates[level.id].map((rate) => (
                                <TableRow key={rate.id}>
                                  <TableCell>{rate.min_amount.toLocaleString()}€</TableCell>
                                  <TableCell>{rate.max_amount.toLocaleString()}€</TableCell>
                                  <TableCell>{rate.rate}%</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditAmbassadorRate(rate)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Supprimer le taux</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Êtes-vous sûr de vouloir supprimer ce taux de commission ?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteAmbassadorRate(rate.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Supprimer
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            Aucun taux de commission configuré
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {ambassadorLevels.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Aucun barème de commission configuré pour les ambassadeurs
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="partners" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Barèmes Partenaires</h3>
                <Button onClick={handleCreatePartnerLevel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Barème
                </Button>
              </div>

              <div className="space-y-4">
                {partnerLevels.map((level) => (
                  <Card key={level.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{level.name}</CardTitle>
                          {level.is_default && (
                            <Badge variant="secondary">
                              <Star className="h-3 w-3 mr-1" />
                              Par défaut
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!level.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultPartnerLevel(level.id)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Définir par défaut
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPartnerLevel(level)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={level.is_default}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le barème</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer ce barème ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePartnerLevel(level.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Taux de Commission</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreatePartnerRate(level.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter un taux
                          </Button>
                        </div>
                        
                        {partnerRates[level.id] && partnerRates[level.id].length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Montant Min</TableHead>
                                <TableHead>Montant Max</TableHead>
                                <TableHead>Taux (%)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerRates[level.id].map((rate) => (
                                <TableRow key={rate.id}>
                                  <TableCell>{rate.min_amount.toLocaleString()}€</TableCell>
                                  <TableCell>{rate.max_amount.toLocaleString()}€</TableCell>
                                  <TableCell>{rate.rate}%</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPartnerRate(rate)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Supprimer le taux</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Êtes-vous sûr de vouloir supprimer ce taux de commission ?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeletePartnerRate(rate.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Supprimer
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            Aucun taux de commission configuré
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {partnerLevels.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Aucun barème de commission configuré pour les partenaires
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Formulaires pour ambassadeurs */}
      <CommissionLevelForm
        isOpen={isAmbassadorLevelFormOpen}
        onClose={() => setIsAmbassadorLevelFormOpen(false)}
        level={editingAmbassadorLevel}
        type="ambassador"
        onSave={handleAmbassadorLevelSave}
      />

      <CommissionRateForm
        isOpen={isAmbassadorRateFormOpen}
        onClose={() => setIsAmbassadorRateFormOpen(false)}
        rate={editingAmbassadorRate}
        levelId={selectedAmbassadorLevelId}
        onSave={handleAmbassadorRateSave}
      />

      {/* Formulaires pour partenaires */}
      <CommissionLevelForm
        isOpen={isPartnerLevelFormOpen}
        onClose={() => setIsPartnerLevelFormOpen(false)}
        level={editingPartnerLevel}
        type="partner"
        onSave={handlePartnerLevelSave}
      />

      <CommissionRateForm
        isOpen={isPartnerRateFormOpen}
        onClose={() => setIsPartnerRateFormOpen(false)}
        rate={editingPartnerRate}
        levelId={selectedPartnerLevelId}
        onSave={handlePartnerRateSave}
      />
    </div>
  );
};

export default CommissionManager;
