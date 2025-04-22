import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { 
  createClient, 
  getClientById, 
  updateClient, 
  verifyVatNumber
} from "@/services/clientService";
import { linkClientToAmbassador } from "@/services/ambassadorClientService";
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
import { Switch } from "@/components/ui/switch";

interface ClientFormProps {
  isAmbassador?: boolean;
}

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
  status: z.enum(["active", "inactive", "lead", "duplicate"]).optional(),
  has_different_shipping_address: z.boolean().optional(),
  shipping_address: z.string().optional().or(z.literal("")),
  shipping_city: z.string().optional().or(z.literal("")),
  shipping_postal_code: z.string().optional().or(z.literal("")),
  shipping_country: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const ClientForm = ({ isAmbassador = false }: ClientFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user, isAmbassador: checkIsAmbassador } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [verifyingVat, setVerifyingVat] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);
  const [showShippingAddress, setShowShippingAddress] = useState(false);
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
      has_different_shipping_address: false,
      shipping_address: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_country: "",
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
            status: client.status || "active",
            has_different_shipping_address: client.has_different_shipping_address || false,
            shipping_address: client.shipping_address || "",
            shipping_city: client.shipping_city || "",
            shipping_postal_code: client.shipping_postal_code || "",
            shipping_country: client.shipping_country || "",
          });
          
          setShowShippingAddress(client.has_different_shipping_address || false);
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
    if (isAmbassador || checkIsAmbassador()) {
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
        
        if (result.addressParsed) {
          form.setValue("address", result.addressParsed.streetAddress || "");
          form.setValue("postal_code", result.addressParsed.postalCode || "");
          form.setValue("city", result.addressParsed.city || "");
          form.setValue("country", result.addressParsed.country || "");
        } else if (result.address) {
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

  const getAmbassadorProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("No authenticated user found:", userError);
        toast.error("Vous devez être connecté pour associer un client");
        return null;
      }
      
      console.log("Current user:", userData.user.id);
      
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();
      
      if (ambassadorError) {
        console.error("Error fetching ambassador data:", ambassadorError);
        if (ambassadorError.code === 'PGRST116') {
          toast.error("Vous n'avez pas de profil ambassadeur. Veuillez contacter l'administrateur.");
        } else {
          toast.error("Impossible de récupérer les informations de votre compte ambassadeur");
        }
        return null;
      }
      
      if (!ambassadorData?.id) {
        console.error("No ambassador profile found for user", userData.user.id);
        toast.error("Impossible de trouver votre profil d'ambassadeur");
        return null;
      }
      
      console.log("Ambassador found:", ambassadorData.id);
      return ambassadorData.id;
    } catch (error) {
      console.error("Error getting ambassador profile:", error);
      toast.error("Erreur lors de la récupération du profil ambassadeur");
      return null;
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'has_different_shipping_address') {
        setShowShippingAddress(value.has_different_shipping_address || false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

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
        has_user_account: false,
        has_different_shipping_address: data.has_different_shipping_address,
        shipping_address: data.has_different_shipping_address ? data.shipping_address : undefined,
        shipping_city: data.has_different_shipping_address ? data.shipping_city : undefined,
        shipping_postal_code: data.has_different_shipping_address ? data.shipping_postal_code : undefined,
        shipping_country: data.has_different_shipping_address ? data.shipping_country : undefined,
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
          if (isAmbassador || checkIsAmbassador()) {
            try {
              console.log("Ambassador flow: Linking client to ambassador");
              
              const ambassadorId = await getAmbassadorProfile();
              if (!ambassadorId) {
                console.error("Failed to get ambassador ID");
                toast.error("Impossible de récupérer votre profil ambassadeur");
                toast.success("Client créé avec succès, mais impossible de l'associer à votre compte d'ambassadeur");
                navigateBack();
                return;
              }
              
              console.log("Linking client to ambassador ID:", ambassadorId);
              
              const linked = await linkClientToAmbassador(result.id, ambassadorId);
              if (linked) {
                toast.success("Client créé et associé à votre compte d'ambassadeur");
              } else {
                toast.warning("Client créé mais impossible de l'associer à votre compte d'ambassadeur. Veuillez contacter l'administrateur.");
              }
            } catch (error) {
              console.error("Error in ambassador linking:", error);
              toast.error("Erreur lors de l'association du client à votre compte d'ambassadeur");
            }
          } else {
            toast.success("Client créé avec succès");
          }
        }
      }
      
      if (result) {
        navigateBack();
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
                        <h4 className="text-md font-medium mb-2">Adresse de facturation</h4>
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

                      <div className="mt-6 flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="has_different_shipping_address"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  id="has_different_shipping_address"
                                />
                              </FormControl>
                              <FormLabel className="text-sm cursor-pointer" htmlFor="has_different_shipping_address">
                                Adresse de livraison différente
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      {showShippingAddress && (
                        <div className="mt-4 border p-4 rounded-md bg-muted/10">
                          <h4 className="text-md font-medium mb-3">Adresse de livraison</h4>
                          <FormField
                            control={form.control}
                            name="shipping_address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adresse de livraison</FormLabel>
                                <FormControl>
                                  <Input placeholder="Adresse de livraison" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name="shipping_city"
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
                              name="shipping_postal_code"
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
                              name="shipping_country"
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
                      )}
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
                                  <SelectItem value="duplicate">Duplicate</SelectItem>
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
