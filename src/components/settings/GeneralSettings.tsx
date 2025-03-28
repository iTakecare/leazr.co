
import React from 'react';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Save, Building2, Mail, Phone, MapPin, Globe, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSiteSettings, updateSiteSettings } from "@/services/settingsService";
import AvatarUploader from "./AvatarUploader";
import { uploadImage } from "@/services/fileUploadService";

const formSchema = z.object({
  site_name: z.string().min(1, "Le nom du site est requis"),
  site_description: z.string().optional(),
  company_name: z.string().min(1, "Le nom de l'entreprise est requis"),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().email("Email invalide").optional(),
  logo_url: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const GeneralSettings = () => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getSiteSettings,
  });
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      site_name: "",
      site_description: "",
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      logo_url: "",
    },
  });
  
  // Pré-remplir le formulaire lorsque les données sont disponibles
  useEffect(() => {
    if (settings) {
      form.reset({
        site_name: settings.site_name || "",
        site_description: settings.site_description || "",
        company_name: settings.company_name || "",
        company_address: settings.company_address || "",
        company_phone: settings.company_phone || "",
        company_email: settings.company_email || "",
        logo_url: settings.logo_url || "",
      });
      
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url);
      }
    }
  }, [settings, form]);
  
  const updateSettingsMutation = useMutation({
    mutationFn: updateSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Paramètres mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour des paramètres: ${error.message}`);
    },
  });
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image");
      return;
    }
    
    setLogoFile(file);
    
    // Créer un aperçu de l'image
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const onSubmit = async (values: SettingsFormValues) => {
    try {
      // Si un nouveau logo a été sélectionné, le télécharger d'abord
      if (logoFile) {
        toast.info("Téléchargement du logo...");
        
        const result = await uploadImage(logoFile, "site-settings", "");
        
        if (result && result.url) {
          values.logo_url = result.url;
        } else {
          toast.error("Échec du téléchargement du logo");
          return;
        }
      }
      
      // Mettre à jour les paramètres
      await updateSettingsMutation.mutateAsync(values);
    } catch (error: any) {
      console.error("Erreur lors de la soumission:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleLogoUploaded = (url: string) => {
    form.setValue("logo_url", url);
  };
  
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres généraux</CardTitle>
          <CardDescription>
            Configurez les informations de base pour votre site et votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex flex-col items-center">
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-center">
                        <FormLabel className="text-center mb-2">Logo de l'entreprise</FormLabel>
                        <FormControl>
                          <AvatarUploader 
                            initialImageUrl={field.value} 
                            onImageUploaded={handleLogoUploaded}
                            bucketName="site-settings"
                          />
                        </FormControl>
                        <FormDescription className="text-center text-xs mt-2">
                          Image au format carré recommandée (PNG, JPG)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="md:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="site_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du site</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Nom du site" {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l'entreprise</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Nom de l'entreprise" {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="site_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description du site</FormLabel>
                        <FormControl>
                          <Input placeholder="Description brève du site" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email de l'entreprise</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="email@exemple.com" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone de l'entreprise</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="+33 1 23 45 67 89" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de l'entreprise</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea 
                              placeholder="Adresse complète" 
                              {...field} 
                              className="pl-10 min-h-[100px]" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
