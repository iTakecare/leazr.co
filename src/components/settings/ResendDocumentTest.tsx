
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, TestTube, CheckCircle2, XCircle } from "lucide-react";

const ResendDocumentTest = () => {
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState({
    clientEmail: "",
    clientName: "",
    offerId: "test-offer-id",
    customMessage: "Ceci est un test d'envoi de demande de documents."
  });

  const handleTest = async () => {
    if (!testData.clientEmail || !testData.clientName) {
      toast.error("Veuillez remplir l'email et le nom du client");
      return;
    }

    try {
      setTesting(true);
      
      console.log("🧪 Test d'envoi de demande de documents:", testData);
      
      // Appeler la fonction edge send-document-request avec des données de test
      const { data, error } = await supabase.functions.invoke('send-document-request', {
        body: {
          offerId: testData.offerId,
          clientEmail: testData.clientEmail,
          clientName: testData.clientName,
          requestedDocs: [
            "Bilan financier",
            "Avertissement extrait de rôle",
            "Copie de la carte d'identité",
            "Document personnalisé test"
          ],
          customMessage: testData.customMessage
        }
      });

      console.log("📧 Réponse de l'envoi:", { data, error });

      if (error) {
        console.error("❌ Erreur lors du test:", error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }

      if (data && data.success) {
        console.log("✅ Test réussi:", data);
        toast.success("✅ Email de test envoyé avec succès!");
        toast.info(`Vérifiez la boîte mail de ${testData.clientEmail}`);
      } else {
        console.error("❌ Échec du test:", data);
        toast.error(`Échec: ${data?.message || "Raison inconnue"}`);
      }
    } catch (error: any) {
      console.error("❌ Erreur lors du test:", error);
      toast.error(`Erreur: ${error.message || "Problème lors du test"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-blue-600" />
          Test d'envoi de demande de documents
        </CardTitle>
        <CardDescription>
          Testez l'envoi d'emails de demande de documents avec Resend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email du client (test)</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="client@example.com"
              value={testData.clientEmail}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clientName">Nom du client</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="Jean Dupont"
              value={testData.clientName}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customMessage">Message personnalisé</Label>
          <Textarea
            id="customMessage"
            name="customMessage"
            placeholder="Message qui sera inclus dans l'email de test..."
            value={testData.customMessage}
            onChange={handleChange}
            rows={3}
          />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Documents qui seront demandés dans le test :</h4>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Bilan financier</li>
            <li>Avertissement extrait de rôle</li>
            <li>Copie de la carte d'identité</li>
            <li>Document personnalisé test</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleTest} 
          disabled={testing || !testData.clientEmail || !testData.clientName}
          className="w-full"
        >
          <Send className="mr-2 h-4 w-4" />
          {testing ? "Envoi en cours..." : "Envoyer l'email de test"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResendDocumentTest;
