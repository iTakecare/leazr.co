
import React from "react";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

const PDFCompanyInfo = ({ template, onSave }) => {
  const form = useForm({
    defaultValues: {
      name: template?.name || "Modèle par défaut",
      companyName: template?.companyName || "iTakeCare",
      companyAddress: template?.companyAddress || "",
      companyContact: template?.companyContact || "",
      companySiret: template?.companySiret || "",
      primaryColor: template?.primaryColor || "#2C3E50",
      secondaryColor: template?.secondaryColor || "#3498DB",
      headerText: template?.headerText || "OFFRE N° {offer_id}",
      footerText: template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."
    }
  });

  // Mise à jour lorsque le template change
  React.useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || "Modèle par défaut",
        companyName: template.companyName || "iTakeCare",
        companyAddress: template.companyAddress || "",
        companyContact: template.companyContact || "",
        companySiret: template.companySiret || "",
        primaryColor: template.primaryColor || "#2C3E50",
        secondaryColor: template.secondaryColor || "#3498DB",
        headerText: template.headerText || "OFFRE N° {offer_id}",
        footerText: template.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."
      });
    }
  }, [template]);

  // Sauvegarde automatique lors de changements
  const handleChange = (field, value) => {
    form.setValue(field, value);
    if (onSave) {
      const formValues = form.getValues();
      onSave(formValues);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="name"
          render={() => (
            <FormItem>
              <FormLabel>Nom du modèle</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("name")} 
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Modèle par défaut" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="companyName"
          render={() => (
            <FormItem>
              <FormLabel>Nom de l'entreprise</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("companyName")} 
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="iTakeCare" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="companyAddress"
          render={() => (
            <FormItem className="md:col-span-2">
              <FormLabel>Adresse de l'entreprise</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("companyAddress")} 
                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                  placeholder="123 Avenue de la République - 75011 Paris" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="companyContact"
          render={() => (
            <FormItem>
              <FormLabel>Coordonnées de contact</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("companyContact")}
                  onChange={(e) => handleChange("companyContact", e.target.value)} 
                  placeholder="contact@itakecare.fr - www.itakecare.fr" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="companySiret"
          render={() => (
            <FormItem>
              <FormLabel>Numéro de SIRET / TVA</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("companySiret")} 
                  onChange={(e) => handleChange("companySiret", e.target.value)}
                  placeholder="SIRET: 123 456 789 00011" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="primaryColor"
          render={() => (
            <FormItem>
              <FormLabel>Couleur primaire</FormLabel>
              <FormControl>
                <Input 
                  type="color"
                  value={form.watch("primaryColor")} 
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="h-10"
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="secondaryColor"
          render={() => (
            <FormItem>
              <FormLabel>Couleur secondaire</FormLabel>
              <FormControl>
                <Input 
                  type="color"
                  value={form.watch("secondaryColor")} 
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="h-10"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="headerText"
          render={() => (
            <FormItem>
              <FormLabel>Texte d'en-tête</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("headerText")} 
                  onChange={(e) => handleChange("headerText", e.target.value)}
                  placeholder="OFFRE N° {offer_id}" 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="footerText"
          render={() => (
            <FormItem>
              <FormLabel>Texte de pied de page</FormLabel>
              <FormControl>
                <Input 
                  value={form.watch("footerText")} 
                  onChange={(e) => handleChange("footerText", e.target.value)}
                  placeholder="Cette offre est valable 30 jours..." 
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default PDFCompanyInfo;
