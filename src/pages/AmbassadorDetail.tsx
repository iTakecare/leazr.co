
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ambassador, getAmbassadorById } from "@/services/ambassadorService";
import { createUserAccount, resetPassword } from "@/services/accountService";
import AmbassadorDetail from "@/components/crm/detail/AmbassadorDetail";
import AmbassadorModal from "@/components/crm/modals/AmbassadorModal";
import { AmbassadorFormValues } from "@/components/crm/forms/AmbassadorForm";
import { updateAmbassador } from "@/services/ambassadorService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const AmbassadorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchAmbassador = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const data = await getAmbassadorById(id);
        console.log("Données ambassadeur chargées:", data);
        setAmbassador(data);
      } catch (error) {
        console.error("Erreur lors du chargement de l'ambassadeur:", error);
        toast.error("Erreur lors du chargement de l'ambassadeur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmbassador();
  }, [id, refreshTrigger]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsDetailOpen(false);
  };

  const handleSubmit = async (data: AmbassadorFormValues) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await updateAmbassador(id, data);
      setRefreshTrigger(prev => prev + 1);
      setIsEditing(false);
      toast.success("Ambassadeur mis à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ambassadeur:", error);
      toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!ambassador?.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPassword(ambassador.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès");
      } else {
        toast.error("Échec de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!ambassador) return;
    
    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(ambassador, "ambassador");
      if (success) {
        // Forcer le rafraîchissement des données pour afficher les changements
        setRefreshTrigger(prev => prev + 1);
        toast.success("Compte utilisateur créé et emails de configuration envoyés");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!ambassador) {
    return (
      <div className="p-8 text-center">
        <p>Ambassadeur non trouvé</p>
        <Button variant="outline" onClick={() => navigate("/ambassadors")} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate("/ambassadors")} className="mb-2 flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">{ambassador.name}</h1>
        </div>
      </div>

      <AmbassadorDetail
        isOpen={isDetailOpen}
        onClose={() => navigate("/ambassadors")}
        ambassador={ambassador}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isResettingPassword={isResettingPassword}
        isCreatingAccount={isCreatingAccount}
      />

      <AmbassadorModal
        isOpen={isEditing}
        onClose={() => {
          setIsEditing(false);
          setIsDetailOpen(true);
        }}
        onSubmit={handleSubmit}
        ambassador={{ ...ambassador }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AmbassadorDetailPage;
