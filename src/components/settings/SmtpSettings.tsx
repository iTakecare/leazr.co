
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SmtpSettings = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    message: string;
    suggestion?: string;
    workingConfig?: {
      tls: boolean;
      description: string;
    };
  } | null>(null);
  const [settings, setSettings] = useState({
    id: 1,
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    from_name: "Leasing App",
    secure: false,
    enabled: true
  });

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
      
      // Si un test précédent a réussi avec une configuration différente de celle actuelle,
      // utiliser cette configuration qui fonctionne
      if (lastTestResult?.success && lastTestResult.workingConfig && 
          lastTestResult.workingConfig.tls !== settings.secure) {
        setSettings(prev => ({
          ...prev,
          secure: lastTestResult.workingConfig.tls
        }));
        
        toast.info(`Application automatique de la configuration TLS qui fonctionne (${lastTestResult.workingConfig.tls ? 'activé' : 'désactivé'})`);
      }
      
      const { error } = await supabase
        .from('smtp_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success("Paramètres SMTP enregistrés avec succès");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des paramètres SMTP:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres SMTP");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setLastTestResult(null);
      toast.info("Test de connexion SMTP en cours...");
      
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          config: settings
        }
      });
      
      if (error) {
        console.error("Erreur lors du test SMTP:", error);
        toast.error(`Erreur de connexion: ${error.message}`);
        setLastTestResult({
          success: false,
          message: `Erreur de connexion: ${error.message}`
        });
        return;
      }
      
      setLastTestResult(data);
      
      if (data.success) {
        toast.success(data.message);
        
        // Si le test a réussi avec une configuration différente, proposer de l'appliquer
        if (data.workingConfig && data.workingConfig.tls !== settings.secure) {
          toast.info(`Le test a réussi avec TLS ${data.workingConfig.tls ? 'activé' : 'désactivé'}. Cette configuration sera appliquée lors de l'enregistrement.`);
        }
      } else {
        toast.error(data.message);
        if (data.suggestion) {
          toast.info(data.suggestion);
        }
      }
    } catch (error) {
      console.error("Erreur lors du test SMTP:", error);
      toast.error("Erreur lors du test de connexion SMTP");
      setLastTestResult({
        success: false,
        message: "Erreur lors du test de connexion SMTP"
      });
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
    
    // Réinitialiser les résultats de test lorsque les paramètres changent
    setLastTestResult(null);
  };

  // Vérifier si les paramètres correspondent à OVH
  const isOvhHost = settings.host?.includes('.mail.ovh.');
  const isPort587 = settings.port === "587";

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
          Paramètres SMTP
        </CardTitle>
        <CardDescription>
          Configurez les paramètres du serveur d'email SMTP pour l'envoi des emails du système
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Configuration requise</AlertTitle>
          <AlertDescription>
            La configuration du serveur SMTP est nécessaire pour l'envoi des emails aux clients, 
            notamment pour les demandes d'informations complémentaires.
          </AlertDescription>
        </Alert>

        {isOvhHost && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>Configuration OVH</AlertTitle>
            <AlertDescription>
              Pour les serveurs OVH, l'option "Connexion sécurisée (TLS)" peut nécessiter plusieurs essais.
              Utilisez le bouton "Tester la connexion" pour déterminer automatiquement les bons paramètres TLS.
            </AlertDescription>
          </Alert>
        )}
        
        {lastTestResult && (
          <Alert className={lastTestResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <div className="flex-1">
              {lastTestResult.success ? 
                <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                <AlertTriangle className="h-4 w-4 text-red-600" />
              }
              <AlertTitle>{lastTestResult.success ? "Connexion réussie" : "Échec de connexion"}</AlertTitle>
              <AlertDescription>
                {lastTestResult.message}
                {lastTestResult.suggestion && (
                  <p className="mt-2 font-medium">{lastTestResult.suggestion}</p>
                )}
                {(lastTestResult.success && lastTestResult.workingConfig && 
                 lastTestResult.workingConfig.tls !== settings.secure) && (
                  <p className="mt-2 font-medium">
                    Le test a réussi avec TLS {lastTestResult.workingConfig.tls ? 'activé' : 'désactivé'}.
                    Cette configuration sera appliquée lors de l'enregistrement.
                  </p>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              name="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
            <Label htmlFor="enabled" className="font-medium">
              Activer l'envoi d'emails
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="secure"
              name="secure"
              checked={settings.secure}
              onCheckedChange={(checked) => {
                setSettings({ ...settings, secure: checked });
                setLastTestResult(null); // Réinitialiser les résultats de test
              }}
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => fetchSettings()}>
          Annuler
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing || !settings.host || !settings.username || !settings.password}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {testing ? "Test en cours..." : "Tester la connexion"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !settings.host || !settings.username || !settings.password}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SmtpSettings;
