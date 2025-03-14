
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Collaborator } from "@/types/client";
import { addCollaborator } from "@/services/clientService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Schéma de validation pour un collaborateur
const collaboratorSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  role: z.string().min(1, "Le rôle est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

interface CollaboratorFormProps {
  clientId: string;
  onSuccess?: (collaborator: Collaborator) => void;
}

const CollaboratorForm = ({ clientId, onSuccess }: CollaboratorFormProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      phone: "",
      department: "",
    },
  });

  const onSubmit = async (values: CollaboratorFormValues) => {
    setLoading(true);
    try {
      // Prepare data for API call
      const collaboratorData = {
        name: values.name,
        role: values.role,
        email: values.email || "",
        phone: values.phone,
        department: values.department,
      };
      
      console.log("Submitting collaborator:", collaboratorData);
      
      const collaborator = await addCollaborator(clientId, collaboratorData);
      if (collaborator) {
        console.log("Collaborator added successfully:", collaborator);
        toast.success("Collaborateur ajouté avec succès");
        form.reset();
        if (onSuccess) {
          onSuccess(collaborator);
        }
      } else {
        console.error("Failed to add collaborator, null response");
        toast.error("Erreur lors de l'ajout du collaborateur");
      }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom*</FormLabel>
              <FormControl>
                <Input placeholder="Nom du collaborateur" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fonction*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: CEO, CFO, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Département</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Finance, Marketing, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email du collaborateur" {...field} />
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

        <div className="flex justify-end gap-2 mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CollaboratorForm;
