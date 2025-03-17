
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createCommissionRate,
  updateCommissionRate,
  CommissionRate,
} from "@/services/commissionService";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const rateSchema = z.object({
  min_amount: z.coerce.number(),
  max_amount: z.coerce.number(),
  rate: z.coerce.number(),
});

type RateFormValues = z.infer<typeof rateSchema>;

interface CommissionRateFormProps {
  commissionLevel: any;
  initialData?: CommissionRate;
  onSubmit: (values: RateFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CommissionRateForm: React.FC<CommissionRateFormProps> = ({
  commissionLevel,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: initialData || {
      min_amount: 0,
      max_amount: 0,
      rate: 0,
    },
    mode: "onChange",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (values: RateFormValues) => {
    try {
      await onSubmit(values);
      toast.success("Taux de commission mis à jour");
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast.error("Erreur lors de la mise à jour du taux de commission");
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="min_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant minimum</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="max_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant maximum</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taux (%)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {initialData ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CommissionRateForm;
