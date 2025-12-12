import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SendContractEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: any;
  leaser: any;
  existingContract?: {
    id: string;
    contract_signature_token: string | null;
  } | null;
  onContractSent?: () => void;
}

const SendContractEmailModal: React.FC<SendContractEmailModalProps> = ({
  open,
  onOpenChange,
  offer,
  leaser,
  existingContract,
  onContractSent
}) => {
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    if (open && offer) {
      // Pre-fill form with offer data
      setRecipientEmail(offer.client_email || offer.clients?.email || "");
      setEmailSubject(`Contrat de location - ${offer.offer_number || 'Votre offre'}`);
      
      const clientName = offer.client_name || offer.clients?.name || "Client";
      const monthlyPayment = offer.monthly_payment?.toLocaleString('fr-BE', {
        style: 'currency',
        currency: 'EUR'
      }) || '0,00 €';
      const duration = offer.duration || 36;
      
      setEmailBody(`Bonjour ${clientName},

Suite à notre échange, vous trouverez ci-dessous le lien pour signer électroniquement votre contrat de location.

Récapitulatif de votre contrat :
- Mensualité : ${monthlyPayment} HT/mois
- Durée : ${duration} mois
- Bailleur : ${leaser?.name || 'Notre société'}

Pour procéder à la signature, veuillez cliquer sur le bouton ci-dessous. Vous devrez :
1. Vérifier les informations de votre contrat
2. Renseigner votre IBAN pour le prélèvement automatique (domiciliation SEPA)
3. Apposer votre signature électronique

Une fois signé, vous recevrez une copie de votre contrat par email.

Cordialement,
L'équipe ${leaser?.name || 'commerciale'}`);
    }
  }, [open, offer, leaser]);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error("Veuillez saisir l'adresse email du destinataire");
      return;
    }

    setIsSending(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour envoyer un contrat");
        setIsSending(false);
        return;
      }

      let contractId = existingContract?.id;
      let signatureToken = existingContract?.contract_signature_token;

      // Create or update contract
      if (!contractId) {
        // Create new contract for self-leasing
        const { data: newContract, error: createError } = await supabase
          .from('contracts')
          .insert({
            offer_id: offer.id,
            company_id: offer.company_id,
            client_id: offer.client_id,
            user_id: user.id,
            client_name: offer.client_name || offer.clients?.name,
            client_email: recipientEmail,
            leaser_name: leaser?.name,
            leaser_id: leaser?.id,
            monthly_payment: offer.monthly_payment,
            contract_duration: offer.duration || 36,
            status: 'pending',
            signature_status: 'pending_signature',
            is_self_leasing: true,
            tracking_number: `CTR-${Date.now().toString(36).toUpperCase()}`
          })
          .select('id, contract_signature_token')
          .single();

        if (createError) throw createError;

        contractId = newContract.id;
        signatureToken = newContract.contract_signature_token;

        // Copy equipment from offer to contract
        const { data: offerEquipment } = await supabase
          .from('offer_equipment')
          .select('*')
          .eq('offer_id', offer.id);

        if (offerEquipment && offerEquipment.length > 0) {
          const contractEquipment = offerEquipment.map(eq => ({
            contract_id: contractId,
            title: eq.title,
            quantity: eq.quantity,
            purchase_price: eq.purchase_price,
            margin: eq.margin,
            monthly_payment: eq.monthly_payment
          }));

          await supabase.from('contract_equipment').insert(contractEquipment);
        }

        // Update offer workflow status
        await supabase
          .from('offers')
          .update({
            workflow_status: 'contract_sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', offer.id);
      } else {
        // Update existing contract
        await supabase
          .from('contracts')
          .update({
            signature_status: 'pending_signature',
            updated_at: new Date().toISOString()
          })
          .eq('id', contractId);
      }

      // Build signature link
      const signatureLink = `${window.location.origin}/contract/${signatureToken}/sign`;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-contract-email', {
        body: {
          to: recipientEmail,
          subject: emailSubject,
          body: emailBody,
          signatureLink,
          contractId,
          offerNumber: offer.offer_number
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail if email fails - contract is created
        toast.warning("Contrat créé mais l'email n'a pas pu être envoyé. Copiez le lien manuellement.");
        
        // Show the link
        navigator.clipboard.writeText(signatureLink);
        toast.info("Lien de signature copié dans le presse-papier");
      } else {
        toast.success("Contrat envoyé avec succès !");
      }

      onContractSent?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error sending contract:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Envoyer le contrat de location
          </DialogTitle>
          <DialogDescription>
            Le client recevra un email avec un lien pour signer son contrat en ligne
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Email du destinataire</Label>
            <Input
              id="recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Objet du mail</Label>
            <Input
              id="subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Corps du message</Label>
            <Textarea
              id="body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={12}
              className="font-sans text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Un bouton "Signer le contrat" sera automatiquement ajouté à la fin du message
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipientEmail}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer le contrat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendContractEmailModal;
