import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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
import { Loader2, Save } from "lucide-react";
import { partnerSchema, PartnerFormValues } from "@/services/partnerService";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";

interface PartnerFormProps {
  initialData?: PartnerFormValues;
  onSubmit: (data: PartnerFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const PartnerForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PartnerFormProps) => {
  // Default values for the form
  const defaultValues: PartnerFormValues = {
    name: "",
    first_name: "",
    last_name: "",
    contact_name: "",
    email: "",
    phone: "",
    type: "Revendeur",
    status: "active",
    notes: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
  };

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: initialData ? {
      ...defaultValues,
      ...initialData,
      first_name: initialData.first_name || initialData.contact_name?.split(' ')[0] || "",
      last_name: initialData.last_name || initialData.contact_name?.split(' ').slice(1).join(' ') || "",
    } : defaultValues,
  });

  const handleSubmit = (values: PartnerFormValues) => {
    // Générer automatiquement le nom de contact
    const submitValues = {
      ...values,
      contact_name: `${values.first_name} ${values.last_name}`.trim(),
    };
    onSubmit(submitValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise*</FormLabel>
                    <FormControl>
                      <Input placeholder="Exemple: iTakecare Partner SAS" {...field} />
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
                    <FormLabel>Type de partenariat*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
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
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Contact principal</h3>
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
                      <Input 
                        placeholder="Exemple: jean.dupont@example.com" 
                        type="email" 
                        {...field} 
                      />
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
                      <Input placeholder="Exemple: +33 6 12 34 56 78" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="mt-6">
              <h4 className="text-md font-medium mb-4">Adresse</h4>
              <PostalCodeInput
                postalCode={form.watch("postal_code") || ""}
                city={form.watch("city") || ""}
                country={form.watch("country") || ""}
                onPostalCodeChange={(value) => form.setValue("postal_code", value)}
                onCityChange={(value) => form.setValue("city", value)}
                onCountryChange={(value) => form.setValue("country", value)}
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
                    placeholder="Notes additionnelles sur ce partenaire..." 
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
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {initialData?.name ? "Mettre à jour" : "Créer le partenaire"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PartnerForm;
