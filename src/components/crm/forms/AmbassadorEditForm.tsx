
import React, { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ambassadorSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide"),
  region: z.string().min(2, "La région est requise"),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
});

export type AmbassadorFormData = z.infer<typeof ambassadorSchema>;

interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  status: string;
  commissionsTotal: number;
  notes?: string;
}

// Dummy function to simulate API call to get ambassador data
const getAmbassadorById = (id: string): Promise<Ambassador> => {
  // This would be replaced with an actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAmbassadors: Record<string, Ambassador> = {
        "1": {
          id: '1',
          name: 'Sophie Laurent',
          email: 'sophie.laurent@example.com',
          phone: '+33 6 12 34 56 78',
          region: 'Île-de-France',
          status: 'active',
          commissionsTotal: 4500,
          notes: 'Ambassadrice très active dans le milieu hospitalier parisien.'
        },
        "2": {
          id: '2',
          name: 'Marc Dubois',
          email: 'marc.dubois@example.com',
          phone: '+33 6 23 45 67 89',
          region: 'Auvergne-Rhône-Alpes',
          status: 'active',
          commissionsTotal: 3200,
          notes: 'Bonne connaissance du réseau de cliniques privées de Lyon.'
        },
        "3": {
          id: '3',
          name: 'Émilie Moreau',
          email: 'emilie.moreau@example.com',
          phone: '+33 6 34 56 78 90',
          region: 'Provence-Alpes-Côte d\'Azur',
          status: 'inactive',
          commissionsTotal: 1800,
          notes: 'En pause temporaire pour congé maternité.'
        }
      };
      
      resolve(mockAmbassadors[id] || {
        id,
        name: 'Ambassadeur inconnu',
        email: '',
        phone: '',
        region: '',
        status: 'inactive',
        commissionsTotal: 0
      });
    }, 500);
  });
};

// Dummy function to simulate API call to update ambassador data
const updateAmbassador = (id: string, data: AmbassadorFormData): Promise<Ambassador> => {
  // This would be replaced with an actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Updating ambassador:', id, data);
      // Create an updated ambassador object with all required fields
      const updatedAmbassador: Ambassador = {
        id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        region: data.region,
        status: data.status,
        commissionsTotal: 0, // This would come from the server
        notes: data.notes
      };
      toast.success(`L'ambassadeur ${data.name} a été mis à jour avec succès`);
      resolve(updatedAmbassador);
    }, 800);
  });
};

const AmbassadorEditForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  React.useEffect(() => {
    if (!id) return;

    const fetchAmbassador = async () => {
      setIsLoading(true);
      try {
        const data = await getAmbassadorById(id);
        setAmbassador(data);
        
        // Update form values
        form.reset({
          name: data.name,
          email: data.email,
          phone: data.phone,
          region: data.region,
          status: data.status as "active" | "inactive",
          notes: data.notes || "",
        });
      } catch (error) {
        console.error("Error fetching ambassador:", error);
        toast.error("Erreur lors du chargement des données de l'ambassadeur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmbassador();
  }, [id, form]);

  const onSubmit = async (data: AmbassadorFormData) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const updatedAmbassador = await updateAmbassador(id, data);
      setAmbassador(updatedAmbassador);
      navigate(`/ambassadors/${id}`);
    } catch (error) {
      console.error("Error updating ambassador:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/ambassadors/${id}`);
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
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
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
                  onClick={handleCancel}
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
