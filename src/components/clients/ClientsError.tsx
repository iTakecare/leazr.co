
import React from "react";
import { AlertTriangle, Info, RefreshCw, Database, UserCheck, User } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientsErrorProps {
  errorMessage: string;
  onRetry?: () => void;
  email?: string | null;
  userId?: string | null;
}

const ClientsError = ({ errorMessage, onRetry, email, userId }: ClientsErrorProps) => {
  const [isFixing, setIsFixing] = React.useState(false);
  
  const handleForceLink = async () => {
    if (!email || !userId) {
      toast.error("Information utilisateur manquante");
      return;
    }
    
    try {
      setIsFixing(true);
      toast.info("Tentative de résolution automatique...");
      
      // 1. Vérifier si un client existe avec cet email
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, user_id, status')
        .or(`email.ilike.${email},user_id.eq.${userId}`);
      
      if (clientsError) {
        throw new Error("Erreur lors de la recherche des clients");
      }
      
      // Pas de client trouvé, essayer d'en créer un
      if (!clients || clients.length === 0) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        
        if (!user) {
          throw new Error("Impossible de récupérer les informations utilisateur");
        }
        
        // Récupérer les données du profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, company')
          .eq('id', userId)
          .single();
        
        const userName = profile ? 
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
          email.split('@')[0];
        
        // Créer un nouveau client
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            name: userName,
            email: email,
            company: profile?.company || null,
            user_id: userId,
            has_user_account: true,
            user_account_created_at: new Date().toISOString(),
            status: 'active'
          })
          .select()
          .single();
        
        if (createError) {
          throw new Error("Erreur lors de la création du client");
        }
        
        toast.success(`Client créé et associé: ${newClient.name}`);
        if (onRetry) onRetry();
        return;
      }
      
      // Des clients existent, choisir le plus pertinent
      let clientToUse = clients[0];
      
      // Priorité au client actif sans user_id
      const activeClientWithoutUser = clients.find(c => 
        c.status === 'active' && !c.user_id
      );
      
      // Ou client actif avec email correspondant
      const activeClientWithEmail = clients.find(c => 
        c.status === 'active' && c.email && c.email.toLowerCase() === email.toLowerCase()
      );
      
      clientToUse = activeClientWithoutUser || activeClientWithEmail || clientToUse;
      
      // Marquer les autres comme doublons
      if (clients.length > 1) {
        const otherClientIds = clients
          .filter(c => c.id !== clientToUse.id)
          .map(c => c.id);
        
        if (otherClientIds.length > 0) {
          await supabase
            .from('clients')
            .update({
              status: 'duplicate',
              notes: `Marqué comme doublon le ${new Date().toISOString()}. ID du client principal: ${clientToUse.id}`
            })
            .in('id', otherClientIds);
        }
      }
      
      // Associer l'utilisateur au client choisi
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          user_id: userId,
          has_user_account: true,
          user_account_created_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', clientToUse.id);
      
      if (updateError) {
        throw new Error("Erreur lors de l'association du client");
      }
      
      // Mettre à jour le cache local
      localStorage.setItem(`client_id_${userId}`, clientToUse.id);
      
      toast.success(`Client associé avec succès: ${clientToUse.name}`);
      if (onRetry) onRetry();
      
    } catch (error) {
      console.error("Erreur lors de la résolution automatique:", error);
      toast.error("Échec de la résolution automatique. Veuillez contacter l'assistance.");
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Alert className="my-8 border-red-300 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <AlertTitle className="text-lg font-medium text-red-600 mb-2">
          Erreur d'association client
        </AlertTitle>
        <AlertDescription className="text-red-500">
          {errorMessage}
        </AlertDescription>
        
        <div className="mt-4 text-sm text-red-500">
          {email && (
            <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 rounded">
              <p className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Email concerné: <span className="font-medium">{email}</span>
              </p>
              {userId && (
                <p className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  ID utilisateur: <span className="font-medium">{userId}</span>
                </p>
              )}
            </div>
          )}
          <p>Une erreur s'est produite lors de la vérification de votre compte client.</p>
          <p>Si le problème persiste après plusieurs essais, contactez votre administrateur.</p>
        </div>
      </Alert>
      
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        )}
        
        {email && userId && (
          <Button 
            variant="secondary"
            onClick={handleForceLink}
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isFixing ? "Réparation en cours..." : "Réparer automatiquement"}
          </Button>
        )}
        
        <Button variant="outline" asChild>
          <Link to="/">
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ClientsError;
