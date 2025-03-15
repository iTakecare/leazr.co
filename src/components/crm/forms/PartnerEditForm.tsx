
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Define the allowed partner types as a literal union type
const partnerTypes = ["Revendeur", "Intégrateur", "Consultant"] as const;
type PartnerType = typeof partnerTypes[number];

const partnerSchema = z.object({
  name: z.string().min(2, "Le nom de la société doit contenir au moins 2 caractères"),
  contactName: z.string().min(2, "Le nom du contact doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide"),
  type: z.enum(partnerTypes),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
});

export type PartnerFormData = z.infer<typeof partnerSchema>;

interface Partner {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  type: "Revendeur" | "Intégrateur" | "Consultant";
  commissionsTotal: number;
  status: string;
  notes?: string;
}

// Dummy function to simulate API call to get partner data
const getPartnerById = (id: string): Promise<Partner> => {
  // This would be replaced with an actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockPartners: Record<string, Partner> = {
        "1": {
          id: '1',
          name: 'TechSolutions SAS',
          contactName: 'Alexandre Martin',
          email: 'contact@techsolutions.com',
          phone: '+33 1 23 45 67 89',
          type: 'Revendeur',
          commissionsTotal: 12500,
          status: 'active',
          notes: 'Partenaire de longue date spécialisé dans les solutions médicales.'
        },
        "2": {
          id: '2',
          name: 'Digital Partners',
          contactName: 'Sophie Dubois',
          email: 'info@digitalpartners.com',
          phone: '+33 1 34 56 78 90',
          type: 'Intégrateur',
          commissionsTotal: 8750,
          status: 'active',
          notes: 'Expertise en intégration de solutions complexes.'
        },
        "3": {
          id: '3',
          name: 'Innov IT',
          contactName: 'Thomas Petit',
          email: 'contact@innovit.fr',
          phone: '+33 1 45 67 89 01',
          type: 'Consultant',
          commissionsTotal: 5300,
          status: 'inactive',
          notes: 'Spécialiste en conseil pour le secteur médical.'
        }
      };
      
      resolve(mockPartners[id] || {
        id,
        name: 'Partenaire inconnu',
        contactName: '',
        email: '',
        phone: '',
        type: 'Revendeur',
        commissionsTotal: 0,
        status: 'inactive'
      });
    }, 500);
  });
};

// Dummy function to simulate API call to update partner data
const updatePartner = (id: string, data: PartnerFormData): Promise<Partner> => {
  // This would be replaced with an actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Updating partner:', id, data);
      // Merge the update data with existing data
      const updatedPartner: Partner = {
        id,
        ...data,
        commissionsTotal: 0, // This would come from the server
      };
      toast.success(`Le partenaire ${data.name} a été mis à jour avec succès`);
      resolve(updatedPartner);
    }, 800);
  });
};

const PartnerEditForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      type: "Revendeur",
      status: "active",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!id) return;

    const fetchPartner = async () => {
      setIsLoading(true);
      try {
        const data = await getPartnerById(id);
        setPartner(data);
        
        // Update form values
        form.reset({
          name: data.name,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          type: data.type,
          status: data.status as "active" | "inactive",
          notes: data.notes || "",
        });
      } catch (error) {
        console.error("Error fetching partner:", error);
        toast.error("Erreur lors du chargement des données du partenaire");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartner();
  }, [id, form]);

  const onSubmit = async (data: PartnerFormData) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      await updatePartner(id, data);
      navigate(`/partners/${id}`);
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error("Erreur lors de la mise à jour du partenaire");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/partners/${id}`);
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
          onClick={() => navigate(`/partners/${id}`)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Modifier le partenaire</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du partenaire</CardTitle>
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
                      <FormLabel>Nom de la société</FormLabel>
                      <FormControl>
                        <Input placeholder="TechSolutions SAS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Alexandre Martin" {...field} />
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
                        <Input placeholder="contact@techsolutions.com" type="email" {...field} />
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
                        <Input placeholder="+33 1 23 45 67 89" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de partenaire</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Revendeur">Revendeur</SelectItem>
                          <SelectItem value="Intégrateur">Intégrateur</SelectItem>
                          <SelectItem value="Consultant">Consultant</SelectItem>
                        </SelectContent>
                      </Select>
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
                      Informations supplémentaires concernant ce partenaire
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

export default PartnerEditForm;
