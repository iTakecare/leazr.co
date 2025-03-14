
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createClientRequest } from "@/services/offerService";

// Fonction utilitaire pour calculer le paiement mensuel
const calculateMonthlyPayment = (amount: number, durationInMonths: number): number => {
  // Coefficient de leasing standard (exemple 0.04)
  const coefficient = 0.04;
  return amount * coefficient * (1 + (durationInMonths / 12) * 0.01);
};

const clientRequestFormSchema = z.object({
  description: z
    .string()
    .min(10, {
      message: "La description doit comporter au moins 10 caractères.",
    })
    .max(500, {
      message: "La description ne doit pas dépasser 500 caractères.",
    }),
  amount: z.coerce
    .number()
    .min(1, {
      message: "Le montant doit être supérieur à 0.",
    })
    .max(100000, {
      message: "Le montant ne doit pas dépasser 100 000 €.",
    }),
  additional_info: z.string().optional(),
});

type ClientRequestFormValues = z.infer<typeof clientRequestFormSchema>;

const defaultValues: Partial<ClientRequestFormValues> = {
  description: "",
  amount: 0,
  additional_info: "",
};

const ClientEquipmentRequestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<ClientRequestFormValues>({
    resolver: zodResolver(clientRequestFormSchema),
    defaultValues,
  });

  const onSubmit = async (values: ClientRequestFormValues) => {
    if (!user || !user.id) {
      toast.error("Vous devez être connecté pour soumettre une demande");
      return;
    }

    try {
      const requestData = {
        user_id: user.id,
        client_id: user?.client_id || null,
        client_name: user?.company || `${user?.first_name || ''} ${user?.last_name || ''}`,
        client_email: user?.email || '',
        equipment_description: values.description,
        additional_info: values.additional_info || '',
        amount: values.amount,
        monthly_payment: calculateMonthlyPayment(values.amount, 36),
        coefficient: 0.04, // Exemple de coefficient
        commission: values.amount * 0.05, // Commission simplifiée pour l'exemple
      };

      const requestId = await createClientRequest(requestData);

      if (requestId) {
        toast.success("Votre demande a été soumise avec succès");
        navigate("/client/dashboard");
      } else {
        toast.error("Erreur lors de la soumission de votre demande");
      }
    } catch (error) {
      console.error("Erreur lors de la soumission de la demande:", error);
      toast.error("Une erreur est survenue lors de la soumission de votre demande");
    }
  };

  return (
    <div className="container py-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Demande d'équipement</h1>
        <p className="text-muted-foreground mt-2">
          Décrivez l'équipement dont vous avez besoin et nous vous proposerons des solutions de financement adaptées.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle demande</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description de l'équipement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez l'équipement dont vous avez besoin (type, marque, modèle, quantité...)"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Soyez précis pour nous permettre de vous faire les meilleures propositions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget estimé (en €)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Indiquez le montant approximatif que vous souhaitez financer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additional_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informations complémentaires (facultatif)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Indiquez toute information supplémentaire qui pourrait nous aider à traiter votre demande"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/client/dashboard")}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  <SendHorizonal className="mr-2 h-4 w-4" />
                  Soumettre la demande
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientEquipmentRequestPage;
