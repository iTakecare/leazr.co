
import { z } from "zod";

// Product Editor form validation schema
export const ProductEditorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  monthly_price: z.coerce.number().min(0, "Monthly price must be a positive number").optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  specifications: z.record(z.string()).optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
  sku: z.string().optional(),
  stock: z.coerce.number().min(0, "Stock must be a positive number").optional(),
  model: z.string().optional(),
});

export type ProductEditorFormValues = z.infer<typeof ProductEditorFormSchema>;
