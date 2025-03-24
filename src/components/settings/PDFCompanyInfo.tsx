
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PDFTemplate } from "@/utils/templateManager";

interface PDFCompanyInfoProps {
  template: PDFTemplate;
  onSave: (data: Partial<PDFTemplate>) => void;
  loading: boolean;
}

const PDFCompanyInfo = ({ template, onSave, loading }: PDFCompanyInfoProps) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(template.logoURL || null);
  
  // Configurer React Hook Form
  const form = useForm<PDFTemplate>({
    defaultValues: {
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
    }
  });

  // Gestionnaire de soumission du formulaire
  const handleSubmit = (data: PDFTemplate) => {
    console.log("Soumission des informations de l'entreprise:", data);
    onSave(data);
  };

  // Gestionnaire d'upload de logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("Fichier logo sélectionné:", file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const logoUrl = event.target.result as string;
        console.log("Logo chargé en base64");
        form.setValue('logoURL', logoUrl);
        setLogoPreview(logoUrl);
        
        // Notification visuelle mais pas de sauvegarde automatique
        toast.info("Logo chargé. Cliquez sur Sauvegarder pour appliquer les changements.");
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Suppression du logo
  const removeLogo = () => {
    console.log("Suppression du logo");
    form.setValue('logoURL', '');
    setLogoPreview(null);
    toast.info("Logo supprimé. Cliquez sur Sauvegarder pour appliquer les changements.");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
          
          <FormField
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Couleur principale</FormLabel>
                <div className="flex gap-2">
                  <Input type="color" {...field} className="w-14 h-10 p-1" />
                  <Input {...field} placeholder="#2C3E50" className="flex-1" />
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="secondaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Couleur secondaire</FormLabel>
                <div className="flex gap-2">
                  <Input type="color" {...field} className="w-14 h-10 p-1" />
                  <Input {...field} placeholder="#3498DB" className="flex-1" />
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="headerText"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Texte d'en-tête</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="OFFRE N° {offer_id}" />
                </FormControl>
                <FormDescription>
                  Utilisez {'{offer_id}'} pour insérer le numéro d'offre.
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="footerText"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Texte de pied de page</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Cette offre est valable 30 jours à compter de sa date d'émission." />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <Card className="p-4">
          <div className="space-y-4">
            <Label>Logo de l'entreprise</Label>
            <div className="flex flex-col gap-4">
              {logoPreview && (
                <div className="relative border p-2 rounded-md w-40 h-20 flex items-center justify-center overflow-hidden">
                  <img 
                    src={logoPreview} 
                    alt="Logo de l'entreprise" 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error("Erreur de chargement de l'image du logo");
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
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
                <div className="flex gap-2">
                  <Input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                </div>
                <FormDescription>
                  Taille recommandée : 200x100 pixels. Format : PNG ou JPG.
                </FormDescription>
              </div>
            </div>
          </div>
        </Card>
        
        <Button type="submit" disabled={loading}>
          {loading ? "Sauvegarde en cours..." : "Sauvegarder les informations"}
        </Button>
      </form>
    </Form>
  );
};

export default PDFCompanyInfo;
