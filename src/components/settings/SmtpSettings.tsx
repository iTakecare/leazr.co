
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, CheckCircle2, InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ResendSettingsData {
  id: number;
  from_email: string;
  from_name: string;
  updated_at?: string;
}

const ResendSettings = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [settings, setSettings] = useState<ResendSettingsData>({
    id: 1,
    from_email: "",
    from_name: "iTakecare"
  });
  const [resendApiKey, setResendApiKey] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setSaveError(null);
      
      console.log("Fetching email settings...");
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('id, from_email, from_name')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Erreur lors de la récupération des paramètres:", error);
        toast.error("Erreur lors du chargement des paramètres d'envoi d'email");
        return;
      }

      if (data) {
        console.log("Settings retrieved:", { ...data });
        setSettings({
          id: data.id || 1,
          from_email: data.from_email || "",
          from_name: data.from_name || "iTakecare"
        });
      }
      
      console.log("Fetching Resend API key...");
      const { data: secretData, error: secretError } = await supabase.functions.invoke('get-secret-value', {
        body: { secret_name: 'RESEND_API_KEY' }
      });
      
      if (secretError) {
        console.error("Error fetching Resend API key:", secretError);
      } else if (secretData) {
        console.log("Resend API key retrieved");
        setResendApiKey(secretData);
      } else {
        console.log("No Resend API key found or it's empty");
      }
      
    } catch (err) {
      console.error("Erreur lors de la récupération des paramètres:", err);
      toast.error("Erreur lors du chargement des paramètres d'envoi d'email");
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
      setSaveError(null);
      
      // Création de l'objet à enregistrer dans la base de données
      const settingsToSave = {
        ...settings,
        updated_at: new Date().toISOString()
      };
      
      console.log("Saving email settings:", settingsToSave);
      
      // Enregistrement dans la table smtp_settings
      const { error } = await supabase
        .from('smtp_settings')
        .upsert(settingsToSave);
      
      if (error) {
        console.error("Error updating email settings:", error);
        setSaveError(`Erreur base de données: ${error.message}`);
        throw error;
      }
      
      // Enregistrer la clé API Resend
      if (resendApiKey) {
        console.log("Saving Resend API key...");
        const { data: secretData, error: secretError } = await supabase.functions.invoke('set-secret', {
          body: { key: 'RESEND_API_KEY', value: resendApiKey }
        });
        
        if (secretError) {
          console.error("Error saving Resend API key:", secretError);
          setSaveError(`Erreur lors de l'enregistrement de la clé Resend: ${secretError.message}`);
          throw new Error(`Erreur lors de l'enregistrement de la clé Resend: ${secretError.message}`);
        }
        
        if (secretData && !secretData.success) {
          console.error("Failed to save Resend API key:", secretData);
          setSaveError(`Échec de l'enregistrement de la clé Resend: ${secretData.message || 'Erreur inconnue'}`);
          throw new Error(`Échec de l'enregistrement de la clé Resend: ${secretData.message || 'Erreur inconnue'}`);
        }
        
        console.log("Resend API key saved successfully:", secretData);
      }
      
      toast.success("Paramètres d'envoi d'emails enregistrés avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement des paramètres:", error);
      toast.error(`Erreur: ${error.message || "Problème lors de l'enregistrement"}`);
      return false;
    } finally {
      setSaving(false);
    }
    
    return true;
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      
      toast.info("Test d'envoi d'email en cours...");
      console.log("Testing Resend email sending");
      
      const { data, error } = await supabase.functions.invoke('test-resend', {
        body: { apiKey: resendApiKey }
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
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
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
          Configurez les paramètres pour l'envoi des emails du système avec Resend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveError && (
          <Alert variant="destructive">
            <AlertTitle>Erreur d'enregistrement</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{saveError}</AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle>À propos de Resend</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Resend est un service moderne et fiable pour l'envoi d'emails qui offre de nombreux avantages :
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => fetchSettings()}>
          Annuler
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing || !resendApiKey}
          >
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Test en cours..." : "Tester la connexion"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !resendApiKey}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ResendSettings;
