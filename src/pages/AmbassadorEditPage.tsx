
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAmbassadorById, updateAmbassador, Ambassador } from "@/services/ambassadorService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BadgePercent } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { 
  CommissionLevel, 
  getCommissionLevelWithRates, 
  getCommissionLevels,
  updateAmbassadorCommissionLevel 
} from "@/services/commissionService";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const ambassadorSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide"),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
  company: z.string().optional().or(z.literal("")),
  vat_number: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal(""))
});

export type AmbassadorFormData = z.infer<typeof ambassadorSchema>;

const AmbassadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  
  // Commission level states
  const [commissionLevel, setCommissionLevel] = useState<CommissionLevel | null>(null);
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [currentLevelId, setCurrentLevelId] = useState<string>("");
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [updatingLevel, setUpdatingLevel] = useState(false);

  const form = useForm<AmbassadorFormData>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      notes: "",
      company: "",
      vat_number: "",
      address: "",
      city: "",
      postal_code: "",
      country: ""
    },
  });

  // Fonction pour charger les données de l'ambassadeur
  const loadAmbassador = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      console.log("[loadAmbassador] Chargement des données de l'ambassadeur:", id);
      const ambassadorData = await getAmbassadorById(id);
      
      if (!ambassadorData) {
        console.error("[loadAmbassador] Ambassadeur introuvable");
        toast.error("Ambassadeur introuvable");
        navigate("/ambassadors");
        return;
      }
      
      console.log("[loadAmbassador] Données chargées:", ambassadorData);
      setAmbassador(ambassadorData);
      
      form.reset({
        name: ambassadorData.name,
        email: ambassadorData.email,
        phone: ambassadorData.phone || "",
        status: ambassadorData.status as "active" | "inactive",
        notes: ambassadorData.notes || "",
        company: ambassadorData.company || "",
        vat_number: ambassadorData.vat_number || "",
        address: ambassadorData.address || "",
        city: ambassadorData.city || "",
        postal_code: ambassadorData.postal_code || "",
        country: ambassadorData.country || ""
      });
      
      // Load commission data
      await loadCommissionLevels();
      
      if (ambassadorData.commission_level_id) {
        console.log("[loadAmbassador] Setting current level ID:", ambassadorData.commission_level_id);
        setCurrentLevelId(ambassadorData.commission_level_id);
        await loadCommissionLevel(ambassadorData.commission_level_id);
      } else {
        console.warn("[loadAmbassador] No commission level ID in ambassador data");
        setCurrentLevelId("");
        setCommissionLevel(null);
      }
    } catch (error: any) {
      console.error("[loadAmbassador] Erreur:", error);
      
      if (error.message && error.message.includes("invalid input syntax for type uuid")) {
        setError("L'identifiant fourni n'est pas valide");
        toast.error("ID d'ambassadeur invalide");
      } else {
        setError("Erreur lors du chargement de l'ambassadeur");
        toast.error("Erreur lors du chargement de l'ambassadeur");
      }
      
      setTimeout(() => navigate("/ambassadors"), 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    if (id === "create") {
      navigate("/ambassadors/create");
      return;
    }

    loadAmbassador();
  }, [id, navigate]);
  
  const loadCommissionLevels = async () => {
    try {
      console.log("[loadCommissionLevels] Chargement des barèmes");
      const levels = await getCommissionLevels("ambassador");
      console.log("[loadCommissionLevels] Barèmes chargés:", levels);
      setCommissionLevels(levels);
    } catch (error) {
      console.error("[loadCommissionLevels] Erreur:", error);
    }
  };

  const loadCommissionLevel = async (levelId: string) => {
    if (!levelId) {
      console.warn("[loadCommissionLevel] ID de barème manquant");
      setCommissionLevel(null);
      return;
    }
    
    setCommissionLoading(true);
    console.log("[loadCommissionLevel] Chargement des détails du barème:", levelId);
    
    try {
      const level = await getCommissionLevelWithRates(levelId);
      console.log("[loadCommissionLevel] Détails du barème chargés:", level);
      setCommissionLevel(level);
    } catch (error) {
      console.error("[loadCommissionLevel] Erreur:", error);
      setCommissionLevel(null);
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleUpdateCommissionLevel = async (levelId: string) => {
    if (!ambassador?.id || !levelId) {
      console.error("[handleUpdateCommissionLevel] ID d'ambassadeur ou de barème manquant");
      return;
    }
    
    if (levelId === currentLevelId) {
      console.log("[handleUpdateCommissionLevel] Niveau de commission inchangé, aucune mise à jour nécessaire");
      return;
    }
    
    console.log("[handleUpdateCommissionLevel] Mise à jour du barème:", currentLevelId, "->", levelId);
    setUpdatingLevel(true);
    toast.info("Mise à jour du barème en cours...");
    
    try {
      // Mettre à jour le niveau de commission dans la base de données
      await updateAmbassadorCommissionLevel(ambassador.id, levelId);
      
      // Mettre à jour l'état local APRÈS confirmation de la mise à jour
      setCurrentLevelId(levelId);
      
      // Recharger les détails du nouveau barème
      await loadCommissionLevel(levelId);
      
      // Mettre à jour également l'objet ambassador pour que la valeur soit prise en compte lors de la sauvegarde
      setAmbassador(prev => {
        if (!prev) return null;
        
        const updated = { 
          ...prev, 
          commission_level_id: levelId 
        };
        
        console.log("[handleUpdateCommissionLevel] Objet ambassadeur mis à jour:", updated);
        return updated;
      });
      
      toast.success("Barème de commissionnement mis à jour");
      
      // Recharger l'ambassadeur pour confirmer la mise à jour
      await getAmbassadorById(ambassador.id).then(refreshedData => {
        if (refreshedData) {
          console.log("[handleUpdateCommissionLevel] Données ambassadeur après mise à jour:", refreshedData);
          
          if (refreshedData.commission_level_id !== levelId) {
            console.error("[handleUpdateCommissionLevel] ALERTE: Le barème n'a pas été mis à jour correctement en base!");
            console.error(`Attendu: ${levelId}, Reçu: ${refreshedData.commission_level_id}`);
            
            // En cas d'incohérence, on force un rechargement complet 
            loadAmbassador();
          }
        }
      });
    } catch (error) {
      console.error("[handleUpdateCommissionLevel] Erreur:", error);
      toast.error("Erreur lors de la mise à jour du barème");
      
      // En cas d'erreur, on recharge l'ambassadeur pour récupérer l'état actuel
      loadAmbassador();
    } finally {
      setUpdatingLevel(false);
    }
  };

  const onSubmit = async (data: AmbassadorFormData) => {
    if (!id || !ambassador) {
      console.error("[onSubmit] Aucun ID d'ambassadeur fourni pour la sauvegarde");
      return;
    }
    
    console.log("[onSubmit] Soumission du formulaire:", data);
    console.log("[onSubmit] Barème actuel:", currentLevelId);
    
    setIsSaving(true);
    try {
      // S'assurer d'inclure le barème de commission actuel dans les données
      const formDataWithCommission = {
        ...data,
        commission_level_id: currentLevelId
      };
      
      console.log("[onSubmit] Données complètes à sauvegarder:", formDataWithCommission);
      
      await updateAmbassador(id, formDataWithCommission);
      
      toast.success(`L'ambassadeur ${data.name} a été mis à jour`);
      navigate(`/ambassadors/${id}`);
    } catch (error) {
      console.error("[onSubmit] Erreur:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des données...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="p-4 text-center max-w-md mx-auto mt-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Erreur</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              className="px-4 py-2" 
              onClick={() => navigate("/ambassadors")}
            >
              Retour à la liste
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (!ambassador) {
    return (
      <PageTransition>
        <Container>
          <div className="p-4 text-center max-w-md mx-auto mt-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Ambassadeur introuvable</h1>
            <p className="text-muted-foreground mb-4">L'ambassadeur demandé n'existe pas ou n'est plus disponible.</p>
            <Button 
              className="px-4 py-2" 
              onClick={() => navigate("/ambassadors")}
            >
              Retour à la liste
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <div className="container py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/ambassadors/${id}`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Modifier l'ambassadeur</h1>
        </div>

        <div className="space-y-6">
          {/* Commission Level Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                Barème de commissionnement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="mb-4">
                  <label htmlFor="commission-level" className="text-sm font-medium mb-1 block">
                    Sélectionner un barème de commissionnement
                  </label>
                  <Select
                    value={currentLevelId}
                    onValueChange={handleUpdateCommissionLevel}
                    disabled={updatingLevel}
                  >
                    <SelectTrigger id="commission-level" className="w-full">
                      <SelectValue placeholder="Sélectionner un barème" />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          <div className="flex items-center gap-2">
                            {level.name}
                            {level.is_default && (
                              <Badge variant="outline" className="text-xs">Par défaut</Badge>
                            )}
                            {level.id === currentLevelId && (
                              <Check className="h-3 w-3 text-primary ml-1" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingLevel && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Mise à jour en cours...
                    </div>
                  )}
                </div>

                {commissionLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : commissionLevel ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-medium">{commissionLevel.name}</div>
                      {commissionLevel.is_default && (
                        <Badge variant="outline" className="text-xs">Par défaut</Badge>
                      )}
                    </div>
                    {commissionLevel.rates && commissionLevel.rates.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm">
                        {commissionLevel.rates
                          .sort((a, b) => b.min_amount - a.min_amount) // Sort by min_amount descending
                          .map((rate, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2">
                              <div className="text-muted-foreground">
                                {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                              </div>
                              <div className="font-medium text-right">{rate.rate}%</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-amber-600 mt-2">
                    Aucun barème de commissionnement sélectionné.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ambassador Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'ambassadeur</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Informations société</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Société</FormLabel>
                            <FormControl>
                              <Input placeholder="Nom de la société" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="vat_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de TVA</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: BE0123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                              <Input placeholder="Adresse complète" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ville</FormLabel>
                            <FormControl>
                              <Input placeholder="Ville" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code postal</FormLabel>
                            <FormControl>
                              <Input placeholder="Code postal" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pays</FormLabel>
                            <FormControl>
                              <Input placeholder="Pays" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Informations de contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl>
                              <Input placeholder="Sophie Laurent" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="sophie.laurent@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                              <Input placeholder="+33 6 12 34 56 78" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez un statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notes additionnelles..." 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Informations supplémentaires concernant cet ambassadeur
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate(`/ambassadors/${id}`)}
                      disabled={isSaving}
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorEditPage;
