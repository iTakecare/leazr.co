
import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";

const PDFCompanyInfo = ({ template, onSave, loading }) => {
  const form = useForm({
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
  useEffect(() => {
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
  }, [template]);

  // Submit handler
  const handleSubmit = form.handleSubmit((data) => {
    if (onSave) {
      onSave(data);
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        form.setValue('logoURL', event.target.result);
      };
      reader.readAsDataURL(file);
    }
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
                    <div className="border p-2 rounded-md w-40 h-20 flex items-center justify-center overflow-hidden">
                      <img 
                        src={field.value} 
                        alt="Logo de l'entreprise" 
                        className="max-w-full max-h-full object-contain"
                      />
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => form.setValue('logoURL', '')}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
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
      
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Sauvegarde en cours...' : 'Sauvegarder les informations'}
        </Button>
      </div>
    </form>
  );
};

export default PDFCompanyInfo;
