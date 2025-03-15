
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAmbassadorById, Ambassador } from "@/services/ambassadorService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
import { updateAmbassador } from "@/services/ambassadorService";

// Define schema for ambassador form data
const ambassadorSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide"),
  region: z.string().min(2, "La région est requise"),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
});

export type AmbassadorFormData = z.infer<typeof ambassadorSchema>;

const AmbassadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);

  const form = useForm<AmbassadorFormData>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      region: "",
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    const loadAmbassador = async () => {
      try {
        const ambassadorData = await getAmbassadorById(id);
        if (!ambassadorData) {
          toast.error("Ambassadeur introuvable");
          navigate("/ambassadors");
          return;
        }
        setAmbassador(ambassadorData);
        
        // Populate form with ambassador data
        form.reset({
          name: ambassadorData.name,
          email: ambassadorData.email,
          phone: ambassadorData.phone || "",
          region: ambassadorData.region || "",
          status: ambassadorData.status as "active" | "inactive",
          notes: ambassadorData.notes || "",
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement de l'ambassadeur:", error);
        setError("Erreur lors du chargement de l'ambassadeur");
        toast.error("Erreur lors du chargement de l'ambassadeur");
        navigate("/ambassadors");
      }
    };

    loadAmbassador();
  }, [id, navigate, form]);

  const onSubmit = async (data: AmbassadorFormData) => {
    if (!id) {
      console.error("Aucun ID d'ambassadeur fourni pour la sauvegarde");
      return;
    }
    
    setIsSaving(true);
    try {
      await updateAmbassador(id, data);
      toast.success(`L'ambassadeur ${data.name} a été mis à jour`);
      navigate(`/ambassadors`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ambassadeur:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Erreur</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => navigate("/ambassadors")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  if (!ambassador) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Ambassadeur introuvable</h1>
        <p className="text-muted-foreground mb-4">L'ambassadeur demandé n'existe pas ou n'est plus disponible.</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => navigate("/ambassadors")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="container py-6">
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
    </div>
  );
};

export default AmbassadorEditPage;
