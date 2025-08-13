import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCommissionRate, updateCommissionRate, CommissionRate } from "@/services/commissionService";
const rateSchema = z.object({
  min_amount: z.coerce.number().min(0, "Le montant minimum doit être positif"),
  max_amount: z.coerce.number().min(0, "Le montant maximum doit être positif"), 
  rate: z.coerce.number().min(0, "Le taux doit être positif")
});
type RateFormValues = z.infer<typeof rateSchema>;
interface CommissionRateFormProps {
  isOpen: boolean;
  onClose: () => void;
  rate?: CommissionRate;
  levelId: string;
  onSave: () => void;
}

const CommissionRateForm: React.FC<CommissionRateFormProps> = ({
  isOpen,
  onClose,
  rate,
  levelId,
  onSave
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      min_amount: rate?.min_amount || 0,
      max_amount: rate?.max_amount || 0,
      rate: rate?.rate || 0
    },
  });

  // Reset form when dialog opens/closes or rate changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        min_amount: rate?.min_amount || 0,
        max_amount: rate?.max_amount || 0,
        rate: rate?.rate || 0
      });
    }
  }, [isOpen, rate, form]);

  const handleSubmit = async (values: RateFormValues) => {
    const effectiveLevelId = levelId || rate?.commission_level_id;
    if (!effectiveLevelId) {
      toast.error("ID du niveau de commission manquant");
      return;
    }

    setIsSubmitting(true);
    try {
      if (rate?.id) {
        // Update existing rate
        await updateCommissionRate(rate.id, values);
        toast.success("Taux de commission mis à jour");
      } else {
        // Create new rate
        await createCommissionRate({
          commission_level_id: effectiveLevelId,
          min_amount: values.min_amount,
          max_amount: values.max_amount,
          rate: values.rate,
          updated_at: new Date().toISOString()
        });
        toast.success("Taux de commission créé");
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving commission rate:", error);
      toast.error("Erreur lors de la sauvegarde du taux de commission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {rate ? "Modifier le taux" : "Ajouter un taux"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="min_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant minimum (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0" {...field} />
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
                  <FormLabel>Montant maximum (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0" {...field} />
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
                    <Input type="number" step="0.01" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CommissionRateForm;