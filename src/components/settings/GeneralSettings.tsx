
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
import Logo from "@/components/layout/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Définition du schéma de validation
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
  
  // Initialisation du formulaire
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
  
  // Vérifier l'état d'authentification
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    };
    
    checkAuth();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Chargement des paramètres actuels au montage du composant
  useEffect(() => {
    if (authStatus !== 'loading') {
      loadSettings();
    }
  }, [authStatus]);
  
  // Fonction pour charger les paramètres depuis la base de données
  const loadSettings = async () => {
    setIsLoading(true);
    
    try {
      // Vérifier que le bucket de stockage existe
      await ensureStorageBucket('site-settings');
      
      // Récupérer les paramètres depuis la base de données
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Aucun enregistrement trouvé, c'est normal si c'est la première utilisation
          console.log("Aucun paramètre trouvé, utilisation des valeurs par défaut");
        } else {
          console.error("Erreur lors du chargement des paramètres:", error);
          toast.error("Erreur lors du chargement des paramètres");
        }
      } else if (data) {
        // Mettre à jour le formulaire avec les données récupérées
        form.reset({
          siteName: data.site_name || "iTakecare",
          siteDescription: data.site_description || "Hub de gestion",
          companyName: data.company_name || "",
          companyAddress: data.company_address || "",
          companyPhone: data.company_phone || "",
          companyEmail: data.company_email || "",
          logoUrl: data.logo_url || "",
        });
        
        // Mettre à jour l'aperçu du logo
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
  
  // Fonction pour sauvegarder les paramètres
  const onSubmit = async (values: GeneralSettingsFormValues) => {
    if (authStatus !== 'authenticated') {
      toast.error("Vous devez être connecté pour sauvegarder les paramètres");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Transformer les données pour correspondre au schéma de la table
      const settingsData = {
        site_name: values.siteName,
        site_description: values.siteDescription,
        company_name: values.companyName,
        company_address: values.companyAddress,
        company_phone: values.companyPhone,
        company_email: values.companyEmail,
        logo_url: values.logoUrl,
      };
      
      // Upsert des paramètres (mise à jour ou insertion si n'existe pas)
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
  
  // Fonction pour gérer l'upload du logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Vérifier que l'utilisateur est connecté
    if (authStatus !== 'authenticated') {
      toast.error("Vous devez être connecté pour uploader un logo");
      return;
    }
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 2MB)");
      return;
    }
    
    try {
      setIsUploading(true);
      
      console.log("Tentative d'upload du logo...");
      
      // S'assurer que le bucket existe
      const bucketExists = await ensureStorageBucket('site-settings');
      if (!bucketExists) {
        toast.error("Erreur lors de la création du bucket de stockage");
        return;
      }
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logo-${Date.now()}.${fileExt}`;
      
      // Uploader l'image
      const { data, error } = await supabase
        .storage
        .from('site-settings')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error("Erreur lors de l'upload:", error);
        throw error;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase
        .storage
        .from('site-settings')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      // Mettre à jour l'URL du logo dans le formulaire
      form.setValue('logoUrl', publicUrl);
      setLogoPreview(publicUrl);
      
      // Copier le logo vers le répertoire public pour l'utiliser comme favicon
      try {
        // Récupérer le fichier pour le copier
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from('site-settings')
          .download(fileName);
        
        if (fileError) throw fileError;
        
        // Uploader vers le répertoire public
        const { error: uploadError } = await supabase
          .storage
          .from('public')
          .upload('site-favicon.ico', fileData, { upsert: true });
        
        if (uploadError) {
          console.warn("Impossible de copier le logo comme favicon:", uploadError);
        }
      } catch (error) {
        console.warn("Erreur lors de la copie du logo comme favicon:", error);
      }
      
      toast.success("Logo uploadé avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'upload du logo:", error);
      
      let errorMessage = "Erreur lors de l'upload du logo";
      
      // Vérifier si l'erreur est liée à RLS
      if (error.message && error.message.includes("violates row-level security policy")) {
        errorMessage = "Erreur d'autorisation: Assurez-vous d'être connecté avec un compte autorisé";
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section Logo du site */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Logo du site
                  </h3>
                  
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 w-full flex flex-col items-center space-y-4">
                    <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
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
                      <p className="text-xs text-muted-foreground">Format recommandé: PNG ou SVG, carré, fond transparent</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Section Informations du site */}
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
          
          {/* Section Informations de l'entreprise */}
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
