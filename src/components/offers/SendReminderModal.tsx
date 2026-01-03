import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { ReminderStatus } from "@/hooks/useOfferReminders";
import RichTextEditor from "@/components/ui/rich-text-editor";

interface SendReminderModalProps {
  open: boolean;
  onClose: () => void;
  offer: Offer;
  reminder: ReminderStatus;
  onSuccess?: () => void;
}

const SendReminderModal: React.FC<SendReminderModalProps> = ({
  open,
  onClose,
  offer,
  reminder,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  // Fetch template when modal opens
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!open) return;
      
      setLoadingTemplate(true);
      try {
        // Get user's company_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        // Fetch company customizations for real company info
        const { data: customization } = await supabase
          .from('company_customizations')
          .select('company_name, company_email')
          .eq('company_id', profile.company_id)
          .single();

        const companyName = customization?.company_name || 'Notre équipe';
        const contactEmail = customization?.company_email || '';

        // Determine template name
        const templateName = reminder.type === 'document_reminder'
          ? 'document_reminder'
          : `offer_reminder_j${reminder.level}`;

        // Fetch template
        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, html_content')
          .eq('company_id', profile.company_id)
          .eq('name', templateName)
          .eq('active', true)
          .single();

        if (template) {
          // Replace basic variables for preview with real company info
          let previewSubject = template.subject
            .replace(/\{\{\s*client_name\s*\}\}/g, offer.client_name || 'Client')
            .replace(/\{\{\s*company_name\s*\}\}/g, companyName);
          
          let previewContent = template.html_content
            .replace(/\{\{\s*client_name\s*\}\}/g, offer.client_name || 'Client')
            .replace(/\{\{\s*company_name\s*\}\}/g, companyName)
            .replace(/\{\{\s*contact_email\s*\}\}/g, contactEmail)
            .replace(/\{\{\s*offer_amount\s*\}\}/g, (offer.financed_amount || offer.amount || 0).toLocaleString('fr-FR'))
            .replace(/\{\{\s*monthly_payment\s*\}\}/g, (offer.monthly_payment || 0).toLocaleString('fr-FR'))
            .replace(/\{\{\s*custom_message\s*\}\}/g, customMessage ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">${customMessage}</div>` : '');

          setSubject(previewSubject);
          setPreviewHtml(previewContent);
        }
      } catch (error) {
        console.error("Error fetching template:", error);
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [open, reminder, offer.client_name, offer.financed_amount, offer.amount, offer.monthly_payment]);

  // Update preview when custom message changes
  useEffect(() => {
    if (previewHtml) {
      setPreviewHtml(prev => {
        // Replace custom_message placeholder or existing custom message div
        const messageHtml = customMessage 
          ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">${customMessage}</div>`
          : '';
        
        // Try to replace existing custom message div or placeholder
        let updated = prev.replace(
          /<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">[\s\S]*?<\/div>/g,
          messageHtml
        );
        
        // Also replace the template variable if still present
        updated = updated.replace(/\{\{\s*custom_message\s*\}\}/g, messageHtml);
        
        return updated;
      });
    }
  }, [customMessage]);

  const handleSend = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée, veuillez vous reconnecter");
        return;
      }

      const response = await supabase.functions.invoke('send-reminder-email', {
        body: {
          offerId: offer.id,
          reminderType: reminder.type,
          reminderLevel: reminder.level,
          customSubject: subject !== "" ? subject : undefined,
          customMessage: customMessage || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors de l'envoi");
      }

      if (response.data?.success) {
        toast.success("Email de rappel envoyé avec succès");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(response.data?.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi du rappel");
    } finally {
      setLoading(false);
    }
  };

  const getReminderTitle = () => {
    if (reminder.type === 'document_reminder') {
      return "Rappel de documents";
    }
    return `Rappel J+${reminder.level}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {getReminderTitle()} - {offer.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Destinataire: <strong>{offer.client_email}</strong>
            </span>
          </div>

          {/* Warning for already sent reminders */}
          {!reminder.isActive && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Ce rappel a déjà été envoyé. Vous pouvez le renvoyer si nécessaire.
              </span>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
              disabled={loadingTemplate}
            />
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <Label>Message personnalisé (optionnel)</Label>
            <RichTextEditor
              value={customMessage}
              onChange={setCustomMessage}
              placeholder="Ajoutez un message personnalisé qui sera inclus dans l'email..."
              height={150}
            />
            <p className="text-xs text-muted-foreground">
              Ce message sera ajouté au contenu du template d'email.
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Aperçu de l'email</Label>
            <div className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto">
              {loadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={loading || loadingTemplate}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le rappel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendReminderModal;
