
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";

interface PDFTemplate {
  name?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  companySiret?: string;
  logoURL?: string;
  primaryColor?: string;
  secondaryColor?: string;
  headerText?: string;
  footerText?: string;
  [key: string]: any;
}

interface PDFCompanyInfoProps {
  template: PDFTemplate | null;
  onSave: (data: PDFTemplate) => void;
  loading: boolean;
}

const PDFCompanyInfo: React.FC<PDFCompanyInfoProps> = ({ template, onSave, loading }) => {
  const form = useForm<PDFTemplate>({
    defaultValues: {
      name: template?.name || "Modèle par défaut",
      companyName: template?.companyName || "iTakeCare",
      companyAddress: template?.companyAddress || "",
      companyContact: template?.companyContact || "",
      companySiret: template?.companySiret || "",
      logoURL: template?.logoURL || "",
      primaryColor: template?.primaryColor || "#2C3E50",
      secondaryColor: template?.secondaryColor || "#3498DB",
      headerText: template?.headerText || "OFFRE N° {offer_id}",
      footerText: template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."
    }
  });

  // Update form values when template changes
  React.useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || "Modèle par défaut",
        companyName: template.companyName || "iTakeCare",
        companyAddress: template.companyAddress || "",
        companyContact: template.companyContact || "",
        companySiret: template.companySiret || "",
        logoURL: template.logoURL || "",
        primaryColor: template.primaryColor || "#2C3E50",
        secondaryColor: template.secondaryColor || "#3498DB",
        headerText: template.headerText || "OFFRE N° {offer_id}",
        footerText: template.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."
      });
    }
  }, [template, form]);

  // Submit handler (désactivé pour éviter la sauvegarde automatique)
  const handleSubmit = form.handleSubmit((data) => {
    console.log("Form submitted but auto-save is disabled:", data);
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          form.setValue('logoURL', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeLogo = () => {
    form.setValue('logoURL', '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du modèle</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Modèle par défaut" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'entreprise</FormLabel>
              <FormControl>
                <Input {...field} placeholder="iTakeCare" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="companyAddress"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Adresse de l'entreprise</FormLabel>
              <FormControl>
                <Input {...field} placeholder="123 Avenue de la République - 75011 Paris" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="companyContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coordonnées de contact</FormLabel>
              <FormControl>
                <Input {...field} placeholder="contact@itakecare.fr - www.itakecare.fr" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="companySiret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de SIRET / TVA</FormLabel>
              <FormControl>
                <Input {...field} placeholder="SIRET: 123 456 789 00011" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      <Card className="p-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="logoURL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo de l'entreprise</FormLabel>
                <div className="flex flex-col gap-4">
                  {field.value && (
                    <div className="relative border p-2 rounded-md w-40 h-20 flex items-center justify-center overflow-hidden">
                      <img 
                        src={field.value} 
                        alt="Logo de l'entreprise" 
                        className="max-w-full max-h-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={removeLogo}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="logo-upload">Choisir un logo</Label>
                    <Input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    <FormDescription>
                      Taille recommandée : 200x100 pixels. Format : PNG ou JPG.
                    </FormDescription>
                  </div>
                </div>
              </FormItem>
            )}
          />
        </div>
      </Card>
    </form>
  );
};

export default PDFCompanyInfo;
