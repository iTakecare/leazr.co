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
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, AlertCircle, Check, Clock, FileText, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { ReminderStatus, AllReminders, useOfferAllReminders, DOCUMENT_REMINDER_STATUSES, OFFER_REMINDER_STATUSES } from "@/hooks/useOfferReminders";
import { OfferReminderRecord } from "@/hooks/useFetchOfferReminders";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SendReminderModalProps {
  open: boolean;
  onClose: () => void;
  offer: Offer;
  reminder?: ReminderStatus;
  allReminders?: AllReminders;
  sentReminders?: OfferReminderRecord[];
  onSuccess?: () => void;
}

const ALL_OFFER_LEVELS = [1, 2, 3];
const ALL_DOCUMENT_LEVELS = [1, 2, 3];

const SendReminderModal: React.FC<SendReminderModalProps> = ({
  open,
  onClose,
  offer,
  reminder,
  allReminders,
  sentReminders = [],
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  
  // Selected reminder type and level
  const [selectedReminder, setSelectedReminder] = useState<ReminderStatus | null>(null);

  // Calculate available reminders based on offer status
  const isDocumentStatus = DOCUMENT_REMINDER_STATUSES.includes(offer.workflow_status || '');
  const isOfferStatus = OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '');

  // Build all available reminder options
  const availableReminders: ReminderStatus[] = React.useMemo(() => {
    const reminders: ReminderStatus[] = [];
    
    if (isDocumentStatus) {
      // 3 niveaux de rappels documents
      ALL_DOCUMENT_LEVELS.forEach(level => {
        const sent = sentReminders.some(
          r => r.reminder_type === 'document_reminder' && r.reminder_level === level && r.sent_at
        );
        const colorMap: Record<number, 'doc-l1' | 'doc-l2' | 'doc-l3'> = { 1: 'doc-l1', 2: 'doc-l2', 3: 'doc-l3' };
        reminders.push({
          type: 'document_reminder',
          level,
          daysElapsed: 0,
          isActive: !sent,
          color: colorMap[level] || 'doc-l1',
          label: `Docs L${level}`,
        });
      });
    }
    
    if (isOfferStatus) {
      ALL_OFFER_LEVELS.forEach(level => {
        const sent = sentReminders.some(
          r => r.reminder_type === 'offer_reminder' && r.reminder_level === level && r.sent_at
        );
        const colorMap: Record<number, 'offer-l1' | 'offer-l2' | 'offer-l3'> = { 1: 'offer-l1', 2: 'offer-l2', 3: 'offer-l3' };
        reminders.push({
          type: 'offer_reminder',
          level,
          daysElapsed: 0,
          isActive: !sent,
          color: colorMap[level] || 'offer-l1',
          label: `Offre L${level}`,
        });
      });
    }
    
    return reminders;
  }, [isDocumentStatus, isOfferStatus, sentReminders]);

  // Get suggested reminder
  const suggestedReminder = allReminders?.suggestedReminder || reminder || availableReminders[0];

  // Initialize selected reminder
  useEffect(() => {
    if (open && !selectedReminder) {
      setSelectedReminder(suggestedReminder || null);
    }
  }, [open, suggestedReminder]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedReminder(null);
      setCustomMessage("");
    }
  }, [open]);

  // Fetch template when modal opens or selection changes
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!open || !selectedReminder) return;
      
      setLoadingTemplate(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        const { data: customization } = await supabase
          .from('company_customizations')
          .select('company_name, company_email, company_phone')
          .eq('company_id', profile.company_id)
          .single();

        const companyName = customization?.company_name || 'Notre équipe';
        const contactEmail = customization?.company_email || '';
        const contactPhone = customization?.company_phone || '';

        // Get client first name - either from clients table or extract from client_name
        let clientFirstName = '';
        if ((offer as any).clients?.first_name) {
          clientFirstName = (offer as any).clients.first_name;
        } else if (offer.client_name) {
          clientFirstName = offer.client_name.split(' ')[0];
        } else {
          clientFirstName = 'Client';
        }

        const templateName = selectedReminder.type === 'document_reminder'
          ? `document_reminder_l${selectedReminder.level}`
          : `offer_reminder_l${selectedReminder.level}`;

        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, html_content')
          .eq('company_id', profile.company_id)
          .eq('name', templateName)
          .eq('active', true)
          .single();

        if (template) {
          let previewSubject = template.subject
            .replace(/\{\{\s*client_name\s*\}\}/g, clientFirstName)
            .replace(/\{\{\s*company_name\s*\}\}/g, companyName);
          
          let previewContent = template.html_content
            .replace(/\{\{\s*client_name\s*\}\}/g, clientFirstName)
            .replace(/\{\{\s*company_name\s*\}\}/g, companyName)
            .replace(/\{\{\s*contact_email\s*\}\}/g, contactEmail)
            .replace(/\{\{\s*contact_phone\s*\}\}/g, contactPhone)
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
  }, [open, selectedReminder, offer, customMessage]);

  // Update preview when custom message changes
  useEffect(() => {
    if (previewHtml) {
      setPreviewHtml(prev => {
        const messageHtml = customMessage 
          ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">${customMessage}</div>`
          : '';
        
        let updated = prev.replace(
          /<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">[\s\S]*?<\/div>/g,
          messageHtml
        );
        
        updated = updated.replace(/\{\{\s*custom_message\s*\}\}/g, messageHtml);
        
        return updated;
      });
    }
  }, [customMessage]);

  const handleSend = async () => {
    if (!selectedReminder) return;
    
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
          reminderType: selectedReminder.type,
          reminderLevel: selectedReminder.level,
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
    if (!selectedReminder) return "Envoyer un rappel";
    if (selectedReminder.type === 'document_reminder') {
      return "Rappel de documents";
    }
    return `Rappel Offre L${selectedReminder.level}`;
  };

  const getColorClasses = (r: ReminderStatus, isSelected: boolean) => {
    const baseClasses = isSelected ? 'ring-2 ring-offset-2' : '';
    switch (r.color) {
      // Documents - palette violette
      case 'doc-l1':
        return cn("bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200", baseClasses, isSelected && 'ring-violet-500');
      case 'doc-l2':
        return cn("bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200", baseClasses, isSelected && 'ring-purple-500');
      case 'doc-l3':
        return cn("bg-purple-200 text-purple-900 border-purple-400 hover:bg-purple-300", baseClasses, isSelected && 'ring-purple-500');
      // Offres - palette bleue
      case 'offer-l1':
        return cn("bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200", baseClasses, isSelected && 'ring-blue-500');
      case 'offer-l2':
        return cn("bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200", baseClasses, isSelected && 'ring-teal-500');
      case 'offer-l3':
        return cn("bg-sky-200 text-sky-900 border-sky-400 hover:bg-sky-300", baseClasses, isSelected && 'ring-sky-500');
      default:
        return cn("bg-muted text-muted-foreground", baseClasses);
    }
  };

  // Get history of sent reminders for this offer
  const reminderHistory = sentReminders
    .filter(r => r.sent_at)
    .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime());

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

          {/* Reminder type selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de rappel</Label>
            <div className="flex flex-wrap gap-2">
              {availableReminders.map((r) => {
                const isSelected = selectedReminder?.type === r.type && selectedReminder?.level === r.level;
                const isSuggested = suggestedReminder?.type === r.type && suggestedReminder?.level === r.level;
                const alreadySent = !r.isActive;
                const Icon = r.type === 'document_reminder' ? FileText : Bell;
                
                return (
                  <Badge
                    key={`${r.type}-${r.level}`}
                    variant="outline"
                    className={cn(
                      "cursor-pointer gap-1.5 px-3 py-1.5 transition-all",
                      getColorClasses(r, isSelected),
                      isSuggested && !isSelected && "border-2 border-dashed"
                    )}
                    onClick={() => setSelectedReminder(r)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="font-medium">{r.label}</span>
                    {isSuggested && (
                      <span className="text-[10px] opacity-70 ml-1">(suggéré)</span>
                    )}
                    {alreadySent && (
                      <Check className="h-3 w-3 ml-1 text-green-600" />
                    )}
                  </Badge>
                );
              })}
            </div>
            {selectedReminder && !selectedReminder.isActive && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Ce rappel a déjà été envoyé. Vous pouvez le renvoyer si nécessaire.
              </p>
            )}
          </div>

          {/* Reminder history */}
          {reminderHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Historique des rappels</Label>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                {reminderHistory.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <Badge variant="outline" className="text-xs">
                      {r.reminder_type === 'document_reminder' ? `Docs L${r.reminder_level}` : `Offre L${r.reminder_level}`}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(r.sent_at!), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                    {r.recipient_email && (
                      <span className="text-muted-foreground text-xs">
                        → {r.recipient_email}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
              height={120}
            />
            <p className="text-xs text-muted-foreground">
              Ce message sera ajouté au contenu du template d'email.
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Aperçu de l'email</Label>
            <div className="border rounded-lg p-4 bg-white max-h-48 overflow-y-auto">
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
          <Button onClick={handleSend} disabled={loading || loadingTemplate || !selectedReminder}>
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
