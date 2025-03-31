
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SmtpTestData {
  config: {
    id: number;
    host: string;
    port: string;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
    secure: boolean;
    enabled: boolean;
  }
}

interface ResendTestData {
  apiKey: string;
}

interface SmtpSettingsData {
  id: number;
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  secure: boolean;
  enabled: boolean;
  use_resend?: boolean;
  updated_at?: string;
}

const SmtpSettings = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("smtp"); 
  const [settings, setSettings] = useState<SmtpSettingsData>({
    id: 1,
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    from_name: "iTakecare",
    secure: false,
    enabled: true
  });
  const [resendApiKey, setResendApiKey] = useState<string>("");
  const [useResend, setUseResend] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Erreur lors de la récupération des paramètres SMTP:", error);
        toast.error("Erreur lors du chargement des paramètres SMTP");
        return;
      }

      if (data) {
        setSettings(data);
        setUseResend(data.use_resend || false);
      }
      
      const { data: secretsData, error: secretsError } = await supabase.functions.invoke('get-secret', {
        body: { key: 'RESEND_API_KEY' }
      });
      
      if (!secretsError && secretsData && secretsData.value) {
        setResendApiKey(secretsData.value);
      }
      
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres:", error);
      toast.error("Erreur lors du chargement des paramètres SMTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("Enregistrement des paramètres avec use_resend:", useResend);
      
      // Création de l'objet à enregistrer dans la base de données
      const settingsToSave = {
        ...settings,
        use_resend: useResend,
        updated_at: new Date().toISOString()
      };
      
      // Enregistrement dans la table smtp_settings
      const { error } = await supabase
        .from('smtp_settings')
        .upsert(settingsToSave);
      
      if (error) {
        console.error("Erreur lors de la mise à jour des paramètres SMTP:", error);
        throw error;
      }
      
      // Si Resend est activé, enregistrer la clé API
      if (useResend && resendApiKey) {
        console.log("Enregistrement de la clé API Resend...");
        const { data: secretData, error: secretError } = await supabase.functions.invoke('set-secret', {
          body: { key: 'RESEND_API_KEY', value: resendApiKey }
        });
        
        if (secretError) {
          console.error("Erreur lors de l'enregistrement de la clé Resend:", secretError);
          throw new Error(`Erreur lors de l'enregistrement de la clé Resend: ${secretError.message}`);
        }
        
        console.log("Clé API Resend enregistrée:", secretData);
      }
      
      toast.success("Paramètres d'envoi d'emails enregistrés avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement des paramètres:", error);
      toast.error(`Erreur: ${error.message || "Problème lors de l'enregistrement"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      
      let testFunction: string;
      let testData: SmtpTestData | ResendTestData;
      
      // Selon le mode sélectionné, préparer les données et choisir la fonction à appeler
      if (useResend) {
        testFunction = 'test-resend';
        testData = { apiKey: resendApiKey } as ResendTestData;
      } else {
        testFunction = 'test-smtp-connection';
        testData = { config: settings } as SmtpTestData;
      }
      
      toast.info("Test d'envoi d'email en cours...");
      console.log(`Test de la fonction ${testFunction} avec les données:`, testData);
      
      const { data, error } = await supabase.functions.invoke(testFunction, {
        body: testData
      });
      
      console.log("Réponse du test:", data, error);
      
      if (error) {
        console.error("Erreur lors du test:", error);
        toast.error(`Erreur de connexion: ${error.message}`);
        return;
      }
      
      if (data && data.success) {
        toast.success(data.message || "Test d'envoi d'email réussi");
      } else {
        toast.error(data?.message || "Échec du test d'envoi d'email");
      }
    } catch (error: any) {
      console.error("Erreur lors du test:", error);
      toast.error(`Erreur: ${error.message || "Problème lors du test"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Configuration de l'envoi d'emails
        </CardTitle>
        <CardDescription>
          Configurez les paramètres pour l'envoi des emails du système
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Configuration requise</AlertTitle>
          <AlertDescription>
            La configuration de l'envoi d'emails est nécessaire pour les notifications aux clients, 
            notamment pour les demandes d'informations complémentaires.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
            <TabsTrigger value="resend">Resend API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="smtp" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  name="enabled"
                  checked={settings.enabled && !useResend}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, enabled: checked });
                    if (checked) {
                      setUseResend(false);
                    }
                  }}
                />
                <Label htmlFor="enabled" className="font-medium">
                  Utiliser le serveur SMTP
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  name="secure"
                  checked={settings.secure}
                  onCheckedChange={(checked) => setSettings({ ...settings, secure: checked })}
                />
                <Label htmlFor="secure" className="font-medium">
                  Connexion sécurisée (TLS)
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Serveur SMTP</Label>
                <Input
                  id="host"
                  name="host"
                  placeholder="smtp.example.com"
                  value={settings.host}
                  onChange={handleChange}
                  disabled={useResend}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  name="port"
                  placeholder="587"
                  value={settings.port}
                  onChange={handleChange}
                  disabled={useResend}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="user@example.com"
                  value={settings.username}
                  onChange={handleChange}
                  disabled={useResend}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={settings.password}
                  onChange={handleChange}
                  disabled={useResend}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="from_email">Email d'expédition</Label>
                <Input
                  id="from_email"
                  name="from_email"
                  placeholder="noreply@example.com"
                  value={settings.from_email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="from_name">Nom d'expéditeur</Label>
                <Input
                  id="from_name"
                  name="from_name"
                  placeholder="Mon Application"
                  value={settings.from_name}
                  onChange={handleChange}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="resend" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="use-resend"
                checked={useResend}
                onCheckedChange={(checked) => {
                  setUseResend(checked);
                  if (checked) {
                    setSettings({ ...settings, enabled: false });
                  }
                }}
              />
              <Label htmlFor="use-resend" className="font-medium">
                Utiliser Resend API (recommandé)
              </Label>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTitle>À propos de Resend</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Resend est un service moderne et fiable pour l'envoi d'emails qui offre de nombreux avantages
                  par rapport aux serveurs SMTP traditionnels :
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Taux de délivrabilité élevé</li>
                  <li>Configuration simplifiée</li>
                  <li>Analytiques d'envoi</li>
                  <li>10 000 emails gratuits par mois</li>
                </ul>
                <p className="mt-2">
                  <a href="https://resend.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    En savoir plus sur Resend.com
                  </a>
                </p>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Clé API Resend</Label>
              <Input
                id="resend-api-key"
                placeholder="re_..."
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                disabled={!useResend}
                type="password"
              />
              <p className="text-sm text-gray-500 mt-1">
                Créez une clé API sur <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com/api-keys</a>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from_email">Email d'expédition</Label>
              <Input
                id="from_email"
                name="from_email"
                placeholder="noreply@example.com"
                value={settings.from_email}
                onChange={handleChange}
              />
              <p className="text-sm text-gray-500 mt-1">
                Avec Resend, vous devez vérifier votre domaine d'envoi. 
                <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  Configurer un domaine
                </a>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from_name">Nom d'expéditeur</Label>
              <Input
                id="from_name"
                name="from_name"
                placeholder="iTakecare"
                value={settings.from_name}
                onChange={handleChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => fetchSettings()}>
          Annuler
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing || (
              !useResend && (!settings.host || !settings.username || !settings.password)) || 
              (useResend && !resendApiKey)
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Test en cours..." : "Tester la connexion"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || (
              !useResend && (!settings.host || !settings.username || !settings.password)) || 
              (useResend && !resendApiKey)
            }
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SmtpSettings;
