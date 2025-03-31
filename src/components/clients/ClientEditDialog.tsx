
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client } from "@/types/client";
import { updateClient, verifyVatNumber } from "@/services/clientService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

// Schéma de validation pour l'édition d'un client
const clientSchema = z.object({
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

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientEditDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: (client?: Client) => void;
}

const ClientEditDialog = ({
  client,
  open,
  onOpenChange,
  onClientUpdated,
}: ClientEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [verifyingVat, setVerifyingVat] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
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
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    setLoading(true);
    try {
      const updatedClient = await updateClient(client.id, values);
      if (updatedClient) {
        onClientUpdated(updatedClient);
        onOpenChange(false);
      } else {
        toast.error("Erreur lors de la mise à jour du client");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Une erreur s'est produite");
    } finally {
      setLoading(false);
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
        
        // Auto-fill company name and address if available
        if (result.companyName) {
          form.setValue("company", result.companyName);
        }
        
        // Utiliser les données d'adresse parsées si disponibles
        if (result.addressParsed) {
          // Utiliser les données parsées
          form.setValue("address", result.addressParsed.streetAddress || "");
          form.setValue("postal_code", result.addressParsed.postalCode || "");
          form.setValue("city", result.addressParsed.city || "");
          form.setValue("country", result.addressParsed.country || "");
        } else if (result.address) {
          // Fallback vers l'ancien comportement
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
        toast.error("Numéro de TVA invalide");
      }
    } catch (error) {
      console.error("Error verifying VAT number:", error);
      toast.error("Erreur lors de la vérification du numéro de TVA");
    } finally {
      setVerifyingVat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Informations de base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du contact*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="email" {...field} />
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
                        <Input {...field} />
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

            <div>
              <h3 className="text-lg font-medium mb-4">Informations société</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de TVA</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <div className="relative flex-1">
                            <Input {...field} placeholder="Ex: BE0123456789" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la société</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
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
                      className="min-h-[100px]"
                      placeholder="Notes additionnelles..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientEditDialog;
