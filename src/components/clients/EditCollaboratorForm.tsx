import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Collaborator } from "@/types/client";
import { updateCollaborator } from "@/services/clientService";

const collaboratorSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  role: z.string().min(1, "Le rôle est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

interface EditCollaboratorFormProps {
  collaborator: Collaborator;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditCollaboratorForm = ({ collaborator, onSuccess, onCancel }: EditCollaboratorFormProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      name: collaborator.name,
      role: collaborator.role,
      email: collaborator.email || "",
      phone: collaborator.phone || "",
      department: collaborator.department || "",
    },
  });

  const onSubmit = async (values: CollaboratorFormValues) => {
    setLoading(true);
    try {
      await updateCollaborator(collaborator.id, {
        name: values.name,
        role: values.role,
        email: values.email || undefined,
        phone: values.phone || undefined,
        department: values.department || undefined,
      });

      toast.success("Collaborateur mis à jour avec succès");
      onSuccess?.();
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error(error.message || "Erreur lors de la mise à jour du collaborateur");
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
              <FormLabel>Nom complet *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nom et prénom du collaborateur" 
                  {...field} 
                />
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
                <FormLabel>Rôle *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ex: Directeur, Manager, etc." 
                    {...field} 
                  />
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
                  <Input 
                    placeholder="ex: IT, RH, Finance, etc." 
                    {...field} 
                  />
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
                <Input 
                  type="email" 
                  placeholder="email@exemple.com" 
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
                <Input 
                  placeholder="+32 123 456 789" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditCollaboratorForm;