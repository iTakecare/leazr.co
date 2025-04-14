
import React, { useState } from "react";
import { useClientCart } from "@/context/ClientCartContext";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createProductRequest } from "@/services/requestInfoService";

interface ClientOrderFormProps {
  onBack: () => void;
}

const formSchema = z.object({
  message: z.string().optional(),
  has_different_shipping_address: z.boolean().default(false),
  shipping_address: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ClientOrderForm: React.FC<ClientOrderFormProps> = ({ onBack }) => {
  const { items, getTotalPrice, getMonthlyPrice, clearCart } = useClientCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      has_different_shipping_address: false,
      shipping_address: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_country: "",
    },
  });

  // Fetch client data when component mounts
  React.useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (error) throw error;
        
        setClientData(data);
        
        // Pre-fill the form with existing client data
        if (data) {
          form.setValue("has_different_shipping_address", data.has_different_shipping_address || false);
          
          if (data.has_different_shipping_address) {
            form.setValue("shipping_address", data.shipping_address || "");
            form.setValue("shipping_city", data.shipping_city || "");
            form.setValue("shipping_postal_code", data.shipping_postal_code || "");
            form.setValue("shipping_country", data.shipping_country || "");
          }
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Impossible de récupérer vos données de client");
      } finally {
        setIsLoadingClient(false);
      }
    };
    
    fetchClientData();
  }, [user?.id, form]);

  const onSubmit = async (values: FormValues) => {
    if (!clientData) {
      toast.error("Données client manquantes");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a formatted equipment description
      const equipmentDescription = items.map(item => {
        const itemOptions = item.selectedOptions ? 
          Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(", ") : 
          "";
          
        return `${item.quantity}x ${item.product.name} ${itemOptions ? `(${itemOptions})` : ""}`;
      }).join("\n");
      
      // Calculate total quantity
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Get first item duration (assuming all items have same duration)
      const duration = items[0]?.duration || 36;
      
      const requestData = {
        client_name: clientData.name,
        client_email: clientData.email,
        client_company: clientData.company,
        client_contact_email: clientData.email,
        client_country: clientData.country,
        client_vat_number: clientData.vat_number,
        client_is_vat_exempt: false,
        address: clientData.address,
        city: clientData.city,
        postal_code: clientData.postal_code,
        country: clientData.country,
        has_different_shipping_address: values.has_different_shipping_address,
        shipping_address: values.has_different_shipping_address ? values.shipping_address : clientData.address,
        shipping_city: values.has_different_shipping_address ? values.shipping_city : clientData.city,
        shipping_postal_code: values.has_different_shipping_address ? values.shipping_postal_code : clientData.postal_code,
        shipping_country: values.has_different_shipping_address ? values.shipping_country : clientData.country,
        phone: clientData.phone,
        equipment_description: equipmentDescription,
        message: values.message,
        amount: getTotalPrice(),
        monthly_payment: getMonthlyPrice(),
        quantity: totalQuantity,
        duration: duration
      };
      
      // Send the request
      const result = await createProductRequest(requestData);
      
      console.log("Request submitted successfully:", result);
      setIsSuccess(true);
      toast.success("Votre demande a été envoyée avec succès");
      
      // Clear the cart after successful submission
      clearCart();
      
      // Wait 3 seconds before redirecting
      setTimeout(() => {
        navigate("/client/requests");
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Une erreur est survenue lors de l'envoi de votre demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingClient) {
    return (
      <div className="w-full flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement de vos informations...</span>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Demande envoyée avec succès</h2>
          <p className="text-muted-foreground mb-6">
            Votre demande a été transmise à nos équipes. Vous serez redirigé vers la page des demandes dans quelques instants.
          </p>
          <Button onClick={() => navigate("/client/requests")}>
            Voir mes demandes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au panier
      </Button>
      
      <h2 className="text-2xl font-bold mb-6">Finaliser ma demande</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Vos informations</CardTitle>
            </CardHeader>
            <CardContent>
              {clientData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Nom</h3>
                      <p>{clientData.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                      <p>{clientData.email}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Entreprise</h3>
                    <p>{clientData.company || "Non spécifié"}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Téléphone</h3>
                      <p>{clientData.phone || "Non spécifié"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">N° TVA</h3>
                      <p>{clientData.vat_number || "Non spécifié"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Adresse de facturation</h3>
                    <p>
                      {clientData.address || "Non spécifiée"}<br />
                      {clientData.postal_code} {clientData.city}<br />
                      {clientData.country}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Impossible de récupérer vos informations client.
                </p>
              )}
            </CardContent>
          </Card>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Précisions sur la demande</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message (facultatif)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Précisions sur votre demande, question pour notre équipe..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="has_different_shipping_address"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Utiliser une adresse de livraison différente
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("has_different_shipping_address") && (
                    <div className="space-y-4 border rounded-md p-4">
                      <h3 className="font-medium">Adresse de livraison</h3>
                      
                      <FormField
                        control={form.control}
                        name="shipping_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="shipping_postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code postal</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="shipping_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ville</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="shipping_country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pays</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Récapitulatif de votre panier</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {items.map((item) => (
                      <li key={item.product.id} className="py-3 flex justify-between">
                        <div>
                          <p className="font-medium">
                            {item.quantity}x {item.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Durée: {item.duration} mois
                          </p>
                        </div>
                        <div className="text-right">
                          <p>{formatCurrency(Number(item.product.price) * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(Number(item.product.price) * item.quantity / item.duration)}/mois
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="w-full flex justify-between py-2 border-t">
                    <span className="font-medium">Total</span>
                    <span className="font-medium">{formatCurrency(getTotalPrice())}</span>
                  </div>
                  <div className="w-full flex justify-between py-2">
                    <span className="font-medium">Mensualité estimée</span>
                    <span className="font-medium text-primary">{formatCurrency(getMonthlyPrice())}/mois</span>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      "Envoyer ma demande"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
        
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produits</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantité totale</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatCurrency(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mensualité estimée</span>
                <span className="font-medium text-primary">
                  {formatCurrency(getMonthlyPrice())}/mois
                </span>
              </div>
              <div className="bg-muted/20 p-3 rounded-md text-xs text-muted-foreground">
                <p className="mb-2">
                  En cliquant sur "Envoyer ma demande", vous soumettez une demande de devis qui sera traitée par notre équipe.
                </p>
                <p>
                  Cette action n'est pas un engagement contractuel et ne constitue pas un achat.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientOrderForm;
