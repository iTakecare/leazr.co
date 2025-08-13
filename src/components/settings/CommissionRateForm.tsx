import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createCommissionRate, updateCommissionRate, CommissionRate } from "@/services/commissionService";
const rateSchema = z.object({
  min_amount: z.coerce.number(),
  max_amount: z.coerce.number(),
  rate: z.coerce.number()
});
type RateFormValues = z.infer<typeof rateSchema>;
interface CommissionRateFormProps {
  commissionLevel?: any;
  initialData?: CommissionRate;
  onSubmit?: (values: RateFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;

  // New props to match usage in CommissionManager
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (data: any) => void;
  levelId?: string;
  rate?: CommissionRate;
  inline?: boolean;
}
const CommissionRateForm: React.FC<CommissionRateFormProps> = ({
  commissionLevel,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  // New props with defaults
  onClose,
  onSave,
  levelId,
  rate,
  inline = false
}) => {
  const [isMounted, setIsMounted] = useState(false);

  // Use rate as initialData if provided
  const actualInitialData = rate || initialData;
  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: actualInitialData || {
      min_amount: 0,
      max_amount: 0,
      rate: 0
    },
    mode: "onChange"
  });
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const handleSubmit = async (values: RateFormValues) => {
    try {
      // Handle both callback patterns
      if (onSave) {
        onSave(values);
      } else if (onSubmit) {
        await onSubmit(values);
        toast.success("Taux de commission mis à jour");
      }
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast.error("Erreur lors de la mise à jour du taux de commission");
    }
  };
  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };
  if (!isMounted) {
    return null;
  }

  // Responsive styling for inline mode
  const formClassName = inline ? "space-y-3" : "space-y-6";
  const buttonsClassName = inline ? "flex items-center justify-end gap-2 pt-2" : "flex items-center justify-between pt-4";
  return <Form {...form}>
      
    </Form>;
};
export default CommissionRateForm;