import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, AlertCircle, Check, Clock, FileText, Bell, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { ReminderStatus, AllReminders, useOfferAllReminders, DOCUMENT_REMINDER_STATUSES, OFFER_REMINDER_STATUSES } from "@/hooks/useOfferReminders";
import { OfferReminderRecord } from "@/hooks/useFetchOfferReminders";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateOfferPDF } from "@/services/clientPdfService";

interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  
  // Selected reminder type and level
  const [selectedReminder, setSelectedReminder] = useState<ReminderStatus | null>(null);
  
  // Signer selection
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

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
      setSelectedSignerId('');
      setAdminUsers([]);
    }
  }, [open]);

  // Fetch admin users for signer selection
  useEffect(() => {
    const fetchAdminUsers = async () => {
      if (!open) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      setSelectedSignerId(user.id); // Default: current user

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch all admins/sales from same company with real emails from auth.users
      const { data: admins } = await supabase
        .rpc('get_company_signers', { p_company_id: profile.company_id });

      if (admins) {
        setAdminUsers(admins);
      }
    };

    fetchAdminUsers();
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

        // Fetch company data for logo and representative
        const { data: companyData } = await supabase
          .from('companies')
          .select('logo_url, signature_representative_name')
          .eq('id', profile.company_id)
          .single();

        const companyName = customization?.company_name || 'Notre équipe';
        const logoUrl = companyData?.logo_url || '';
        
        // Get signer info - use selected signer or fall back to company default
        const selectedSigner = adminUsers.find(u => u.id === selectedSignerId);
        const representativeName = selectedSigner 
          ? `${selectedSigner.first_name || ''} ${selectedSigner.last_name || ''}`.trim() || 'L\'équipe commerciale'
          : companyData?.signature_representative_name || 'L\'équipe commerciale';
        
        // Use signer's email and phone or fall back to company defaults
        const contactEmail = selectedSigner?.email || customization?.company_email || '';
        const contactPhone = selectedSigner?.phone || customization?.company_phone || '';
        
        const offerLink = `https://www.leazr.co/offre/${offer.id}`;

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
            .replace(/\{\{\s*company_logo\s*\}\}/g, logoUrl)
            .replace(/\{\{\s*representative_name\s*\}\}/g, representativeName)
            .replace(/\{\{\s*offer_link\s*\}\}/g, offerLink)
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
  }, [open, selectedReminder, offer, customMessage, selectedSignerId, adminUsers]);

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

      // Generate PDF for offer reminders only
      let pdfBase64: string | undefined;
      let pdfFilename: string | undefined;

      if (selectedReminder.type === 'offer_reminder') {
        setGeneratingPdf(true);
        try {
          const pdfBlob = await generateOfferPDF(offer.id, 'client');
          const buffer = await pdfBlob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          bytes.forEach(byte => binary += String.fromCharCode(byte));
          pdfBase64 = btoa(binary);
          pdfFilename = `Offre_${offer.client_name?.replace(/\s+/g, '_') || offer.id}.pdf`;
        } catch (error) {
          console.error('Erreur génération PDF:', error);
          // Continue without PDF if error
        } finally {
          setGeneratingPdf(false);
        }
      }

      const response = await supabase.functions.invoke('send-reminder-email', {
        body: {
          offerId: offer.id,
          reminderType: selectedReminder.type,
          reminderLevel: selectedReminder.level,
          customSubject: subject !== "" ? subject : undefined,
          customMessage: customMessage || undefined,
          pdfBase64,
          pdfFilename,
          signerId: selectedSignerId || undefined,
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

          {/* Signer selection */}
          {adminUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Signature de l'email
              </Label>
              <Select value={selectedSignerId} onValueChange={setSelectedSignerId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Sélectionner le signataire" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {adminUsers.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.first_name} {admin.last_name}
                      {admin.id === currentUserId && " (vous)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                L'email sera signé par cette personne.
              </p>
            </div>
          )}

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
          <Button variant="outline" onClick={onClose} disabled={loading || generatingPdf}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={loading || loadingTemplate || generatingPdf || !selectedReminder}>
            {generatingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération du PDF...
              </>
            ) : loading ? (
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
