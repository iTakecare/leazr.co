import React, { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Upload, 
  Save, 
  Loader2, 
  RefreshCw, 
  Building, 
  Info,
  AlertTriangle,
  Shield
} from "lucide-react";
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/services/storageService";
import Logo from "@/components/layout/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const generalSettingsSchema = z.object({
  siteName: z.string().min(2, {
    message: "Le nom du site doit contenir au moins 2 caractères",
  }),
  siteDescription: z.string().optional(),
  companyName: z.string().min(2, {
    message: "Le nom de l'entreprise doit contenir au moins 2 caractères",
  }).optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email({
    message: "Veuillez entrer une adresse email valide",
  }).optional(),
  logoUrl: z.string().optional(),
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

const GeneralSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: "iTakecare",
      siteDescription: "Hub de gestion",
      companyName: "",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      logoUrl: "",
    },
  });
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (authStatus !== 'loading') {
      loadSettings();
    }
  }, [authStatus]);
  
  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Vérification du bucket de stockage site-settings...');
      const bucketExists = await ensureStorageBucket('site-settings');
      
      if (!bucketExists) {
        console.error('Échec de la création/vérification du bucket site-settings');
        toast.warning("Le stockage n'est pas correctement configuré. Les uploads de logo peuvent ne pas fonctionner.");
      } else {
        console.log('Bucket site-settings vérifié ou créé avec succès');
      }
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Aucun paramètre trouvé, utilisation des valeurs par défaut");
        } else {
          console.error("Erreur lors du chargement des paramètres:", error);
          toast.error("Erreur lors du chargement des paramètres");
        }
      } else if (data) {
        form.reset({
          siteName: data.site_name || "iTakecare",
          siteDescription: data.site_description || "Hub de gestion",
          companyName: data.company_name || "",
          companyAddress: data.company_address || "",
          companyPhone: data.company_phone || "",
          companyEmail: data.company_email || "",
          logoUrl: data.logo_url || "",
        });
        
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: GeneralSettingsFormValues) => {
    if (authStatus !== 'authenticated') {
      toast.error("Vous devez être connecté pour sauvegarder les paramètres");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const settingsData = {
        site_name: values.siteName,
        site_description: values.siteDescription,
        company_name: values.companyName,
        company_address: values.companyAddress,
        company_phone: values.companyPhone,
        company_email: values.companyEmail,
        logo_url: values.logoUrl,
      };
      
      const { error } = await supabase
        .from('site_settings')
        .upsert(settingsData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde des paramètres:", error);
        toast.error("Erreur lors de la sauvegarde des paramètres");
      } else {
        toast.success("Paramètres enregistrés avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (authStatus !== 'authenticated') {
      toast.error("Vous devez être connecté pour uploader un logo");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 2MB)");
      return;
    }
    
    try {
      setIsUploading(true);
      toast.info("Préparation de l'upload du logo...");
      
      console.log("Tentative d'upload du logo...");
      
      const bucketExists = await ensureStorageBucket('site-settings');
      
      if (!bucketExists) {
        toast.error("Erreur lors de la configuration du stockage. Veuillez réessayer.");
        return;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logo-${Date.now()}.${fileExt}`;
      
      let uploadResult;
      let useAdminClient = false;
      
      try {
        uploadResult = await supabase
          .storage
          .from('site-settings')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadResult.error) {
          console.warn("Erreur d'upload avec le client standard:", uploadResult.error);
          
          if (uploadResult.error.message.includes("row-level security") || 
              uploadResult.error.message.includes("Unauthorized")) {
            console.log("Problème d'autorisation, tentative avec le client admin...");
            useAdminClient = true;
            toast.info("Nouvelle tentative en cours...");
          } else {
            throw uploadResult.error;
          }
        }
      } catch (error) {
        console.error("Erreur lors de la première tentative d'upload:", error);
        useAdminClient = true;
      }
      
      if (useAdminClient) {
        try {
          uploadResult = await adminSupabase
            .storage
            .from('site-settings')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadResult.error) {
            throw uploadResult.error;
          }
        } catch (adminError) {
          console.error("Erreur avec le client admin:", adminError);
          
          toast.info("Tentative alternative en cours...");
          try {
            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-storage-bucket', {
              body: { bucket_name: 'site-settings' }
            });
            
            if (funcError) throw funcError;
            
            uploadResult = await supabase
              .storage
              .from('site-settings')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
              });
              
            if (uploadResult.error) throw uploadResult.error;
          } catch (funcUploadError) {
            throw new Error(`Toutes les tentatives d'upload ont échoué: ${funcUploadError.message}`);
          }
        }
      }
      
      console.log("Upload réussi!");
      
      const publicUrlResult = useAdminClient ? 
        adminSupabase
          .storage
          .from('site-settings')
          .getPublicUrl(uploadResult.data.path) :
        supabase
          .storage
          .from('site-settings')
          .getPublicUrl(uploadResult.data.path);
      
      const publicUrl = publicUrlResult.data.publicUrl;
      
      form.setValue('logoUrl', publicUrl);
      setLogoPreview(publicUrl);
      
      toast.success("Logo uploadé avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'upload du logo:", error);
      
      let errorMessage = "Erreur lors de l'upload du logo";
      
      if (error.message) {
        if (error.message.includes("violates row-level security policy")) {
          errorMessage = "Erreur d'autorisation: Problème avec les politiques de sécurité du stockage";
        } else if (error.message.includes("bucket not found")) {
          errorMessage = "Le bucket de stockage n'existe pas ou n'est pas accessible";
        } else if (error.message.includes("Unauthorized")) {
          errorMessage = "Erreur d'authentification: Vous n'avez pas les autorisations nécessaires";
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };
  
  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {authStatus === 'unauthenticated' && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>
            Vous n'êtes pas connecté(e). Veuillez vous connecter pour pouvoir modifier les paramètres du site.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Logo du site
                  </h3>
                  
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 w-full flex flex-col items-center space-y-4">
                    <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo du site" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Aucun logo</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full">
                      <FormLabel className="block mb-2">Aperçu du logo</FormLabel>
                      <div className="bg-white p-4 rounded-lg border flex items-center justify-center">
                        <Logo />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <FormLabel htmlFor="logo-upload" className="cursor-pointer py-2 px-4 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>Choisir un fichier</span>
                        </FormLabel>
                        <input 
                          id="logo-upload" 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={isSaving || isUploading || authStatus !== 'authenticated'}
                        />
                        {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                      </div>
                      <p className="text-xs text-muted-foreground">Format recommandé: PNG ou SVG, carré, fond transparent</p>
                      
                      {authStatus === 'authenticated' && (
                        <Alert variant="default">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <AlertTitle className="text-xs font-medium">Stockage sécurisé</AlertTitle>
                          <AlertDescription className="text-xs">
                            Le fichier sera stocké de manière sécurisée dans Supabase Storage.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Informations du site
                  </h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du site</FormLabel>
                          <FormControl>
                            <Input placeholder="iTakecare" {...field} />
                          </FormControl>
                          <FormDescription>
                            Nom qui apparaît dans l'en-tête et le pied de page
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="siteDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description du site</FormLabel>
                          <FormControl>
                            <Input placeholder="Hub de gestion" {...field} />
                          </FormControl>
                          <FormDescription>
                            Brève description qui apparaît sous le nom du site
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Informations de l'entreprise
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre entreprise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de contact</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@entreprise.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 1 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adresse complète" 
                        {...field} 
                        className="min-h-[80px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={loadSettings}
              disabled={isLoading || isSaving || authStatus !== 'authenticated'}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Réinitialiser
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading || isSaving || authStatus !== 'authenticated'}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default GeneralSettings;
