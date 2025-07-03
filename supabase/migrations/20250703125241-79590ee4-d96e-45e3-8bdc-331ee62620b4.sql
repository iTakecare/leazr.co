-- Add pdf_url column to invoices table for Billit PDF access
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;