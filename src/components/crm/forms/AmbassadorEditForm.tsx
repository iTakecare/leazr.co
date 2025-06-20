
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateAmbassador, Ambassador } from "@/services/ambassadorService";
import { CommissionLevel, getCommissionLevels } from "@/services/commissionService";

const ambassadorSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide").optional(),
  region: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  commission_level_id: z.string().uuid().optional(),
});

export type AmbassadorFormData = z.infer<typeof ambassadorSchema>;

interface AmbassadorEditFormProps {
  ambassadorData: Ambassador;
}

const AmbassadorEditForm = ({ ambassadorData }: AmbassadorEditFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);

  const form = useForm<AmbassadorFormData>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      name: ambassadorData.name || "",
      email: ambassadorData.email || "",
      phone: ambassadorData.phone || "",
      region: ambassadorData.region || "",
      status: (ambassadorData.status as "active" | "inactive") || "active",
      notes: ambassadorData.notes || "",
      company: ambassadorData.company || "",
      vat_number: ambassadorData.vat_number || "",
      address: ambassadorData.address || "",
      city: ambassadorData.city || "",
      postal_code: ambassadorData.postal_code || "",
      country: ambassadorData.country || "",
      commission_level_id: ambassadorData.commission_level_id || "",
    },
  });

  useEffect(() => {
    const loadCommissionLevels = async () => {
      try {
        const levels = await getCommissionLevels("ambassador");
        setCommissionLevels(levels);
      } catch (error) {
        console.error("Error loading commission levels:", error);
        toast.error("Erreur lors du chargement des barèmes de commission");
      } finally {
        setLoadingLevels(false);
      }
    };

    loadCommissionLevels();
  }, []);

  const onSubmit = async (data: AmbassadorFormData) => {
    if (!id) {
      console.error("Aucun ID d'ambassadeur fourni pour la sauvegarde");
      return;
    }
    
    setIsSaving(true);
    try {
      await updateAmbassador(id, data);
      toast.success("Ambassadeur mis à jour avec succès");
      navigate(`/ambassadors/${id}`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ambassadeur:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
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

      <Card>
        <CardHeader>
          <CardTitle>Informations de l'ambassadeur</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Région</FormLabel>
                      <FormControl>
                        <Input placeholder="Île-de-France" {...field} />
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

                <FormField
                  control={form.control}
                  name="commission_level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barème de commissionnement</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingLevels}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un barème" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {commissionLevels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              <div className="flex items-center gap-2">
                                {level.name}
                                {level.is_default && (
                                  <Badge variant="outline" className="text-xs">Par défaut</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Sélectionnez le barème de commission pour cet ambassadeur
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entreprise</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de l'entreprise" {...field} />
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
                        <Input placeholder="FR12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Rue de la Paix" {...field} />
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
                        <Input placeholder="Paris" {...field} />
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
                        <Input placeholder="75001" {...field} />
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
                        <Input placeholder="France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
  );
};

export default AmbassadorEditForm;
