
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, SendHorizonal, TestTube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SmtpSettings = () => {
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    from_name: "Leasing App",
    secure: false,
    enabled: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Erreur lors de la récupération des paramètres SMTP:", error);
        toast.error("Erreur lors de la récupération des paramètres SMTP");
        return;
      }
      
      if (data) {
        setSmtpConfig({
          host: data.host || "",
          port: data.port || "587",
          username: data.username || "",
          password: data.password || "",
          from_email: data.from_email || "",
          from_name: data.from_name || "Leasing App",
          secure: data.secure || false,
          enabled: data.enabled !== undefined ? data.enabled : true
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", error);
      toast.error("Erreur lors de la récupération des paramètres SMTP");
    } finally {
      setLoading(false);
    }
  };

  const saveSmtpSettings = async () => {
    try {
      setIsSaving(true);
      
      // Validation basique
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.from_email) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      
      const { data, error } = await supabase
        .from('smtp_settings')
        .upsert(
          { 
            id: 1, // On utilise un ID fixe pour toujours mettre à jour la même ligne
            ...smtpConfig,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
        
      if (error) {
        throw error;
      }
      
      toast.success("Paramètres SMTP enregistrés avec succès");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des paramètres SMTP:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres SMTP");
    } finally {
      setIsSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    try {
      setIsTesting(true);
      
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.from_email) {
        toast.error("Veuillez remplir tous les champs obligatoires avant de tester");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          config: smtpConfig
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success("Connexion SMTP réussie. Un email de test a été envoyé.");
      } else {
        toast.error(`Erreur lors du test SMTP: ${data.message}`);
      }
    } catch (error) {
      console.error("Erreur lors du test SMTP:", error);
      toast.error("Erreur lors du test de connexion SMTP");
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSmtpConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <span>Configuration SMTP</span>
        </CardTitle>
        <CardDescription>
          Configurez les paramètres SMTP pour l'envoi d'emails depuis l'application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="smtp-enabled"
              checked={smtpConfig.enabled}
              onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, enabled: checked }))}
            />
            <Label htmlFor="smtp-enabled">Activer l'envoi d'emails</Label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="host">Serveur SMTP</Label>
            <Input
              id="host"
              name="host"
              value={smtpConfig.host}
              onChange={handleInputChange}
              placeholder="smtp.example.com"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              name="port"
              type="number"
              value={smtpConfig.port}
              onChange={handleInputChange}
              placeholder="587"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              name="username"
              value={smtpConfig.username}
              onChange={handleInputChange}
              placeholder="utilisateur@example.com"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={smtpConfig.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_email">Email d'expédition</Label>
            <Input
              id="from_email"
              name="from_email"
              value={smtpConfig.from_email}
              onChange={handleInputChange}
              placeholder="no-reply@example.com"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_name">Nom d'expéditeur</Label>
            <Input
              id="from_name"
              name="from_name"
              value={smtpConfig.from_name}
              onChange={handleInputChange}
              placeholder="Mon Application"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center space-x-2 col-span-full">
            <Switch
              id="secure"
              checked={smtpConfig.secure}
              onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, secure: checked }))}
              disabled={loading}
            />
            <Label htmlFor="secure">Utiliser une connexion sécurisée (SSL/TLS)</Label>
          </div>
        </div>
        
        <div className="flex space-x-4 pt-4">
          <Button
            onClick={saveSmtpSettings}
            disabled={isSaving || loading}
            className="flex items-center"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
          </Button>
          
          <Button
            onClick={testSmtpConnection}
            variant="outline"
            disabled={isTesting || loading}
            className="flex items-center"
          >
            <SendHorizonal className="mr-2 h-4 w-4" />
            {isTesting ? "Test en cours..." : "Tester la connexion"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmtpSettings;
