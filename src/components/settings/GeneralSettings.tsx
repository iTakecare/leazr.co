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
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/services/storageService";
import { uploadImage, detectFileExtension, detectMimeTypeFromSignature } from "@/services/fileUploadService";
import Logo from "@/components/layout/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AvatarUploader from "@/components/settings/AvatarUploader";

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
  const [settingsId, setSettingsId] = useState<number>(1);
  const [formData, setFormData] = useState<GeneralSettingsFormValues>({
    siteName: "iTakecare",
    siteDescription: "Hub de gestion",
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    logoUrl: "",
  });

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
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Aucun paramètre trouvé, création avec les valeurs par défaut");
          
          const defaultSettings = {
            id: 1,
            site_name: "iTakecare",
            site_description: "Hub de gestion",
            company_name: "",
            company_address: "",
            company_phone: "",
            company_email: "",
            logo_url: "",
          };
          
          const { error: insertError } = await supabase
            .from('site_settings')
            .insert(defaultSettings);
            
          if (insertError) {
            console.error("Erreur lors de la création des paramètres par défaut:", insertError);
            setError("Impossible de créer les paramètres par défaut");
            toast.error("Erreur lors de la création des paramètres par défaut");
          } else {
            const { data: newData, error: fetchError } = await supabase
              .from('site_settings')
              .select('*')
              .limit(1)
              .single();
              
            if (fetchError) {
              console.error("Erreur lors de la récupération des paramètres après création:", fetchError);
              setError("Impossible de récupérer les paramètres créés");
            } else if (newData) {
              console.log("Nouveaux paramètres créés et récupérés:", newData);
              setSettingsId(newData.id);
              
              form.reset({
                siteName: newData.site_name || "iTakecare",
                siteDescription: newData.site_description || "Hub de gestion",
                companyName: newData.company_name || "",
                companyAddress: newData.company_address || "",
                companyPhone: newData.company_phone || "",
                companyEmail: newData.company_email || "",
                logoUrl: newData.logo_url || "",
              });
              
              if (newData.logo_url) {
                setLogoPreview(newData.logo_url);
              }
            }
          }
        } else {
          console.error("Erreur lors du chargement des paramètres:", error);
          setError("Erreur lors du chargement des paramètres");
          toast.error("Erreur lors du chargement des paramètres");
        }
      } else if (data) {
        console.log("Paramètres chargés avec succès:", data);
        setSettingsId(data.id);
        
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
      setError("Erreur lors du chargement des paramètres");
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
      const { data: countData, error: countError } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
        .single();
      
      const effectiveId = countData?.id || 1;
      setSettingsId(effectiveId);
      
      const settingsData = {
        id: effectiveId,
        site_name: values.siteName,
        site_description: values.siteDescription,
        company_name: values.companyName,
        company_address: values.companyAddress,
        company_phone: values.companyPhone,
        company_email: values.companyEmail,
        logo_url: values.logoUrl,
      };
      
      console.log("Sauvegarde des paramètres avec ID:", effectiveId);
      
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
      
      const fileName = `site-logo-${Date.now()}.${detectFileExtension(file)}`;
      
      const detectedMimeType = await detectMimeTypeFromSignature(file);
      console.log(`Type MIME détecté: ${detectedMimeType || 'non détecté, utilisation du type par défaut'}`);
      
      const result = await uploadImage(file, 'site-settings', fileName);
      
      if (!result || !result.url) {
        throw new Error("Échec de l'upload de l'image");
      }
      
      const logoUrl = result.url;
      console.log("Logo uploadé avec succès:", logoUrl);
      
      form.setValue('logoUrl', logoUrl);
      setLogoPreview(logoUrl);
      
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setIsUploading(true);
      
      const file = e.target.files[0];
      const result = await uploadImage(file, 'site-settings', 'logos');
      
      if (result && result.url) {
        setFormData({
          ...formData,
          logoUrl: result.url
        });
        toast.success("Logo téléchargé avec succès");
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(`Erreur lors du téléchargement : ${error.message}`);
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AvatarUploader 
            avatarUrl={logoPreview}
            onAvatarChange={(url) => {
              form.setValue('logoUrl', url);
              setLogoPreview(url);
            }}
          />
          
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Logo du site
                </h3>
                
                <div className="flex flex-col space-y-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                        {logoPreview ? (
                          <AvatarImage 
                            src={logoPreview} 
                            alt="Logo du site"
                            className="object-contain"
                          />
                        ) : (
                          <AvatarFallback className="bg-transparent text-muted-foreground">
                            <ImageIcon className="h-10 w-10 opacity-50" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <FormLabel htmlFor="logo-upload" className="font-medium mb-1 block">Logo du site</FormLabel>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border shadow-sm mb-2">
                          <Logo />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FormLabel htmlFor="logo-upload" className="cursor-pointer py-2 px-3 bg-primary text-white rounded-lg flex items-center gap-1 hover:bg-primary/90 transition-colors text-sm">
                          <Upload className="h-3 w-3" />
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
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Format recommandé: PNG ou SVG, carré, fond transparent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
    </div>
  );
};

export default GeneralSettings;
