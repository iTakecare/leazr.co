import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { 
  createClient, 
  getClientById, 
  updateClient, 
  verifyVatNumber,
  linkClientToAmbassador
} from "@/services/clientService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Loader2, ArrowLeft, Check, AlertCircle, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  vat_number: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "lead"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ClientForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user, isAmbassador } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [verifyingVat, setVerifyingVat] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);
  const clientId = params.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      address: "",
      notes: "",
      vat_number: "",
      city: "",
      postal_code: "",
      country: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (clientId) {
      setIsEditMode(true);
      setIsLoading(true);
      getClientById(clientId).then(client => {
        if (client) {
          form.reset({
            name: client.name,
            email: client.email || "",
            company: client.company || "",
            phone: client.phone || "",
            address: client.address || "",
            notes: client.notes || "",
            vat_number: client.vat_number || "",
            city: client.city || "",
            postal_code: client.postal_code || "",
            country: client.country || "",
            status: client.status || "active"
          });
        } else {
          toast.error("Client introuvable");
          navigateBack();
        }
        setIsLoading(false);
      }).catch(error => {
        console.error("Erreur lors du chargement du client:", error);
        toast.error("Erreur lors du chargement du client");
        setIsLoading(false);
        navigateBack();
      });
    }
  }, [clientId, form]);

  const navigateBack = () => {
    if (isAmbassador()) {
      navigate("/ambassador/clients");
    } else {
      navigate("/clients");
    }
  };

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
          form.setValue("name", result.companyName);
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

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const clientData = {
        name: data.name,
        email: data.email || undefined,
        company: data.company || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        vat_number: data.vat_number || undefined,
        city: data.city || undefined,
        postal_code: data.postal_code || undefined,
        country: data.country || undefined,
        status: data.status || "active",
        user_id: null,
        has_user_account: false
      };
      
      let result;
      
      if (isEditMode && clientId) {
        result = await updateClient(clientId, clientData);
        if (result) {
          toast.success("Client mis à jour avec succès");
        }
      } else {
        result = await createClient(clientData);
        if (result) {
          toast.success("Client créé avec succès");
        }
      }
      
      if (result) {
        if (isAmbassador()) {
          navigate("/ambassador/clients");
        } else {
          navigate("/clients");
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'opération sur le client:", error);
      toast.error(isEditMode ? "Erreur lors de la mise à jour du client" : "Erreur lors de la création du client");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={navigateBack}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Modifier le client" : "Créer un nouveau client"}
            </h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="pt-6">
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
                              <FormLabel>Nom complet*</FormLabel>
                              <FormControl>
                                <Input placeholder="Jean Dupont" {...field} />
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
                                <Input placeholder="jean.dupont@example.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                                    <SelectValue placeholder="Sélectionner un statut" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Actif</SelectItem>
                                  <SelectItem value="inactive">Inactif</SelectItem>
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
                              placeholder="Notes additionnelles concernant ce client..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Informations supplémentaires concernant ce client
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={navigateBack}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Mise à jour..." : "Enregistrer"}
                    </>
                  ) : (
                    isEditMode ? "Mettre à jour" : "Enregistrer"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientForm;

