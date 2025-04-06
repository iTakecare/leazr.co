
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Ambassador, 
  AmbassadorFormValues, 
  ambassadorSchema, 
  getAmbassadorById, 
  updateAmbassador 
} from "@/services/ambassadorService";
import { CommissionLevel, getCommissionLevels } from "@/services/commissionService";
import CommissionDisplay from "@/components/ui/CommissionDisplay";

export type AmbassadorFormData = z.infer<typeof ambassadorSchema>;

const AmbassadorEditForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [selectedCommissionLevel, setSelectedCommissionLevel] = useState<string>("");

  const form = useForm<AmbassadorFormData>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      region: "",
      status: "active",
      notes: "",
      company: "",
      vat_number: "",
      address: "",
      postal_code: "",
      city: "",
      country: "",
    },
  });

  // Charger les barèmes de commission
  useEffect(() => {
    const loadCommissionLevels = async () => {
      try {
        const levels = await getCommissionLevels("ambassador");
        setCommissionLevels(levels);
      } catch (error) {
        console.error("Erreur lors du chargement des barèmes de commission:", error);
        toast.error("Erreur lors du chargement des barèmes de commission");
      }
    };
    
    loadCommissionLevels();
  }, []);

  useEffect(() => {
    if (!id) {
      console.error("Aucun ID d'ambassadeur fourni");
      toast.error("Erreur: Ambassadeur non identifié");
      navigate("/ambassadors");
      return;
    }

    const fetchAmbassador = async () => {
      setIsLoading(true);
      try {
        const data = await getAmbassadorById(id);
        
        console.log(`Données de l'ambassadeur ID ${id} chargées:`, data);
        setAmbassador(data);
        
        // Mettre à jour les valeurs du formulaire
        form.reset({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          region: data.region || "",
          status: data.status as "active" | "inactive",
          notes: data.notes || "",
          company: data.company || "",
          vat_number: data.vat_number || "",
          address: data.address || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          country: data.country || "",
        });
        
        // Définir le niveau de commission
        if (data.commission_level_id) {
          setSelectedCommissionLevel(data.commission_level_id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'ambassadeur:", error);
        toast.error("Erreur lors du chargement des données de l'ambassadeur");
        navigate("/ambassadors");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmbassador();
  }, [id, form, navigate]);

  const onSubmit = async (data: AmbassadorFormData) => {
    if (!id) {
      console.error("Aucun ID d'ambassadeur fourni pour la sauvegarde");
      return;
    }
    
    setIsSaving(true);
    try {
      // Ajouter le niveau de commission aux données
      const updateData = {
        ...data,
        commission_level_id: selectedCommissionLevel || undefined
      };
      
      await updateAmbassador(id, updateData);
      
      console.log(`Ambassadeur ID ${id} sauvegardé avec succès`);
      toast.success("Ambassadeur mis à jour avec succès");
      
      // Rediriger vers la page de détail après sauvegarde
      navigate(`/ambassadors`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ambassadeur:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/ambassadors`)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Modifier l'ambassadeur</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Barème de commissionnement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <FormLabel>Sélectionner un barème de commissionnement</FormLabel>
              <Select
                value={selectedCommissionLevel}
                onValueChange={setSelectedCommissionLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un barème" />
                </SelectTrigger>
                <SelectContent>
                  {commissionLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name} {level.is_default && "(Par défaut)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <CommissionDisplay 
                commissionLevelId={selectedCommissionLevel} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations de l'ambassadeur</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations de contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'ambassadeur" {...field} />
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
                          <Input placeholder="email@exemple.com" type="email" {...field} />
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
                          <Input placeholder="+32 0123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Région</FormLabel>
                        <FormControl>
                          <Input placeholder="Région d'activité" {...field} />
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
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations société</h3>
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
                          <Input placeholder="BE0123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresse postale" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                          <Input placeholder="1000" {...field} />
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
                          <Input placeholder="Belgique" {...field} />
                        </FormControl>
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
                  onClick={() => navigate(`/ambassadors`)}
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
  );
};

export default AmbassadorEditForm;
