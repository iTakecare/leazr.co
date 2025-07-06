-- Create the pdf_models table
CREATE TABLE IF NOT EXISTS public.pdf_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "companyAddress" TEXT NOT NULL,
  "companyContact" TEXT NOT NULL,
  "companySiret" TEXT NOT NULL,
  "logoURL" TEXT DEFAULT '',
  "primaryColor" TEXT NOT NULL,
  "secondaryColor" TEXT NOT NULL,
  "headerText" TEXT NOT NULL,
  "footerText" TEXT NOT NULL,
  "templateImages" JSONB DEFAULT '[]'::jsonb,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.pdf_models ENABLE ROW LEVEL SECURITY;

-- Create policies for pdf_models
CREATE POLICY "Admin manage pdf_models" 
ON public.pdf_models 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_pdf_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_models_updated_at
BEFORE UPDATE ON public.pdf_models
FOR EACH ROW
EXECUTE FUNCTION public.update_pdf_models_updated_at();