
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

const SmtpSettings = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
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
      toast.info("Test de connexion SMTP en cours...");
      
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          config: settings
        }
      });
      
      if (error) {
        console.error("Erreur lors du test SMTP:", error);
        toast.error(`Erreur de connexion: ${error.message}`);
        return;
      }
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Erreur lors du test SMTP:", error);
      toast.error("Erreur lors du test de connexion SMTP");
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
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Test en cours..." : "Tester la connexion"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !settings.host || !settings.username || !settings.password}
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
