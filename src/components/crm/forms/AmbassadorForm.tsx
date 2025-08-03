
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { verifyVatNumber } from "@/services/clientService";
import { Loader2, Check, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";

const ambassadorSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom de famille est requis"),
  name: z.string().optional(),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide"),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  vat_number: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
});

export type AmbassadorFormValues = z.infer<typeof ambassadorSchema>;

interface AmbassadorFormProps {
  initialData?: AmbassadorFormValues;
  onSubmit: (data: AmbassadorFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const AmbassadorForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AmbassadorFormProps) => {
  const [verifyingVat, setVerifyingVat] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);
  
  const form = useForm<AmbassadorFormValues>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: initialData ? {
      first_name: initialData.first_name || initialData.name?.split(' ')[0] || "",
      last_name: initialData.last_name || initialData.name?.split(' ').slice(1).join(' ') || "",
      name: initialData.name || "",
      email: initialData.email || "",
      phone: initialData.phone || "",
      status: initialData.status || "active",
      notes: initialData.notes || "",
      company: initialData.company || "",
      vat_number: initialData.vat_number || "",
      address: initialData.address || "",
      city: initialData.city || "",
      postal_code: initialData.postal_code || "",
      country: initialData.country || "",
    } : {
      first_name: "",
      last_name: "",
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
      country: "",
    },
  });

  // Vérification du numéro de TVA
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
        
        // Auto-remplissage des champs si les données sont disponibles
        if (result.companyName) {
          form.setValue("company", result.companyName);
          // Ne pas écraser le nom avec le nom de société
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

  const handleSubmit = (values: AmbassadorFormValues) => {
    // Générer automatiquement le nom complet
    const submitValues = {
      ...values,
      name: `${values.first_name} ${values.last_name}`.trim(),
    };
    onSubmit(submitValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

                <div className="mt-4">
                  <PostalCodeInput
                    postalCode={form.watch("postal_code") || ""}
                    city={form.watch("city") || ""}
                    country={form.watch("country") || ""}
                    onPostalCodeChange={(value) => form.setValue("postal_code", value)}
                    onCityChange={(value) => form.setValue("city", value)}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Informations de contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom*</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de famille*</FormLabel>
                        <FormControl>
                          <Input placeholder="Dupont" {...field} />
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
                        <FormLabel>Email*</FormLabel>
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
                        <FormLabel>Téléphone*</FormLabel>
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
                        placeholder="Notes additionnelles concernant cet ambassadeur..." 
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
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AmbassadorForm;
