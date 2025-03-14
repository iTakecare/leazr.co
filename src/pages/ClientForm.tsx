
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { createClient, getClientById, updateClient, verifyVatNumber } from "@/services/clientService";
import { CreateClientData } from "@/types/client";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Search, Loader2, Check, AlertCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const clientFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  vat_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "lead"]).optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Determine mode with additional safety checks
  const isCreateMode = !id || id === "new" || id === "create";
  const isEditMode = !isCreateMode;

  // Only set loading to true if we need to fetch data (edit mode)
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [verifyingVat, setVerifyingVat] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      address: "",
      city: "",
      postal_code: "",
      country: "",
      vat_number: "",
      notes: "",
      status: "active",
    },
  });

  useEffect(() => {
    // This function is ONLY for editing an existing client
    const fetchClient = async () => {
      // Safety checks to prevent unnecessary API calls
      if (!isEditMode) {
        console.log("Create mode detected - skipping client fetch");
        setIsLoading(false);
        return;
      }
      
      console.log(`Fetching client with ID: ${id}`);
      try {
        const client = await getClientById(id as string);
        
        if (client) {
          form.reset({
            name: client.name,
            email: client.email || "",
            company: client.company || "",
            phone: client.phone || "",
            address: client.address || "",
            city: client.city || "",
            postal_code: client.postal_code || "",
            country: client.country || "",
            vat_number: client.vat_number || "",
            notes: client.notes || "",
            status: client.status || "active",
          });
        } else if (isEditMode) {
          // Only show error in edit mode, not create mode
          setError("Client introuvable");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du client:", error);
        setError("Impossible de charger les données du client");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id, form, isEditMode]);

  const handleVerifyVatNumber = async () => {
    const vatNumber = form.getValues("vat_number");
    if (!vatNumber) {
      toast.error("Veuillez saisir un numéro de TVA");
      return;
    }

    setVerifyingVat(true);
    setVatValid(null);

    try {
      const result = await verifyVatNumber(vatNumber);
      setVatValid(result.valid);

      if (result.valid) {
        toast.success("Numéro de TVA valide");
        
        if (result.companyName) {
          form.setValue("company", result.companyName);
        }
        
        if (result.address) {
          const addressParts = result.address.split(',');
          if (addressParts.length >= 3) {
            form.setValue("address", addressParts[0].trim());
            
            const cityParts = addressParts[1].trim().split(' ');
            if (cityParts.length >= 2) {
              form.setValue("postal_code", cityParts[0].trim());
              form.setValue("city", cityParts.slice(1).join(' '));
            }
            
            form.setValue("country", addressParts[2].trim());
          } else {
            form.setValue("address", result.address);
          }
        }
      } else {
        toast.error("Numéro de TVA invalide. Assurez-vous de respecter le format (ex: BE0123456789)");
      }
    } catch (error) {
      console.error("Error verifying VAT number:", error);
      toast.error("Erreur lors de la vérification du numéro de TVA");
    } finally {
      setVerifyingVat(false);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    
    try {
      if (isEditMode && id) {
        const updatedClient = await updateClient(id, data as CreateClientData);
        if (updatedClient) {
          toast.success("Client mis à jour avec succès");
          navigate("/clients");
        } else {
          toast.error("Erreur lors de la mise à jour du client");
        }
      } else {
        const newClient = await createClient(data as CreateClientData);
        if (newClient) {
          toast.success("Client créé avec succès");
          navigate("/clients");
        } else {
          toast.error("Erreur lors de la création du client");
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/clients")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">
                {isEditMode ? "Modifier le client" : "Nouveau client"}
              </h1>
            </div>
          </div>

          {/* Only show error state in edit mode, not in create mode */}
          {error && isEditMode ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/clients")}
                className="mt-2"
              >
                Retour à la liste des clients
              </Button>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Informations du client</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Informations société</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="vat_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Numéro de TVA</FormLabel>
                                <div className="flex">
                                  <FormControl>
                                    <div className="relative flex-1">
                                      <Input 
                                        placeholder="Ex: BE0123456789, FR12345678901" 
                                        {...field} 
                                        className="pr-9"
                                      />
                                      {vatValid !== null && (
                                        <div className="absolute right-9 top-1/2 -translate-y-1/2">
                                          {vatValid ? (
                                            <Check className="text-green-500 h-4 w-4" />
                                          ) : (
                                            <AlertCircle className="text-red-500 h-4 w-4" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="ml-2"
                                    onClick={handleVerifyVatNumber}
                                    disabled={verifyingVat}
                                  >
                                    {verifyingVat ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Formats acceptés: BE0123456789, FR12345678901, DE123456789, LU12345678
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

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
                                <FormLabel>Nom*</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nom du client" {...field} />
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
                                  <Input placeholder="Email du client" {...field} />
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
                                  <Input placeholder="Numéro de téléphone" {...field} />
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
                                      <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="active">Client actif</SelectItem>
                                    <SelectItem value="inactive">Client inactif</SelectItem>
                                    <SelectItem value="lead">Prospect</SelectItem>
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
                                placeholder="Notes additionnelles" 
                                className="min-h-[120px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/clients")}
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {isEditMode ? "Mettre à jour" : "Créer le client"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientForm;
