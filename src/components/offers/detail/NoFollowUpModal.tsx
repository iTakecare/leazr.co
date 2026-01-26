import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserX, Mail, Clock, Calendar, FileX, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { sendNoFollowUpEmail } from "@/services/offers/offerEmail";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface NoFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  currentStatus: string;
  onStatusUpdated: () => void;
}

const NO_FOLLOW_UP_REASONS = [
  { code: "no_response", label: "Plus de nouvelles après relances", icon: Mail },
  { code: "project_postponed", label: "Projet reporté par le client", icon: Clock },
  { code: "went_competitor", label: "Parti chez un concurrent", icon: UserX },
  { code: "budget_issue", label: "Problème de budget", icon: FileX },
  { code: "project_cancelled", label: "Projet annulé", icon: Calendar },
  { code: "other", label: "Autre raison", icon: FileX },
];

const DEFAULT_NO_FOLLOW_UP_HTML = `<p>Bonjour {{client_name}},</p>

<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>

<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>

<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>

<p>Nous restons à votre disposition.</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>`;

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const NoFollowUpModal: React.FC<NoFollowUpModalProps> = ({
  isOpen,
  onClose,
  offerId,
  currentStatus,
  onStatusUpdated
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Email states
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTitle, setEmailTitle] = useState("📁 Clôture de votre dossier");
  const [emailContent, setEmailContent] = useState<string>(DEFAULT_NO_FOLLOW_UP_HTML);

  // Fetch reminder history
  const { data: reminders = [] } = useQuery({
    queryKey: ['offer-reminders', offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_reminders')
        .select('*')
        .eq('offer_id', offerId)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: true });
      
      if (error) {
        console.error("Error fetching reminders:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: isOpen,
  });

  const handleSubmit = async (withEmail: boolean = false) => {
    if (!selectedReason) {
      toast.error("Veuillez sélectionner une raison");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send email if requested
      if (withEmail && sendEmail) {
        try {
          await sendNoFollowUpEmail(offerId, emailTitle, emailContent);
          toast.success("Email de clôture envoyé");
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          toast.error("Erreur lors de l'envoi de l'email, mais le dossier sera classé");
        }
      }

      const reasonLabel = NO_FOLLOW_UP_REASONS.find(r => r.code === selectedReason)?.label || selectedReason;
      const fullReason = comment.trim() 
        ? `${reasonLabel}\n\nCommentaire: ${comment.trim()}`
        : reasonLabel;

      // Update offer status to without_follow_up
      const success = await updateOfferStatus(
        offerId, 
        'without_follow_up', 
        currentStatus, 
        fullReason
      );

      if (!success) {
        throw new Error("Échec de la mise à jour du statut");
      }

      // Update internal score to D
      const { error: scoreError } = await supabase
        .from('offers')
        .update({ 
          internal_score: 'D',
          workflow_status: 'without_follow_up'
        })
        .eq('id', offerId);

      if (scoreError) {
        console.error("Error updating score:", scoreError);
      }

      // Log with sub_reason
      const { error: logError } = await supabase
        .from('offer_workflow_logs')
        .update({ sub_reason: selectedReason })
        .eq('offer_id', offerId)
        .eq('new_status', 'without_follow_up')
        .order('created_at', { ascending: false })
        .limit(1);

      if (logError) {
        console.warn("Could not update log with sub_reason:", logError);
      }

      toast.success("Dossier classé sans suite");
      onStatusUpdated();
      onClose();
    } catch (error) {
      console.error("Error classifying as no follow-up:", error);
      toast.error("Erreur lors du classement sans suite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setComment("");
    setSendEmail(false);
    setEmailTitle("📁 Clôture de votre dossier");
    setEmailContent(DEFAULT_NO_FOLLOW_UP_HTML);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            Classer ce dossier sans suite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reminder History */}
          {reminders.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Historique des relances ({reminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {reminders.map((reminder, index) => (
                    <div 
                      key={reminder.id} 
                      className="flex items-center justify-between text-sm p-2 bg-background rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          L{index + 1}
                        </Badge>
                        <span className="text-muted-foreground">
                          {reminder.sent_at && format(new Date(reminder.sent_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {index === reminders.length - 1 && (
                        <Badge variant="outline" className="text-xs">Dernière</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {reminders.length === 0 && (
            <div className="bg-muted/50 p-4 rounded-lg text-center text-muted-foreground text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Aucune relance envoyée pour ce dossier
            </div>
          )}

          {/* Reason Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Raison du classement sans suite <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                <div className="space-y-2">
                  {NO_FOLLOW_UP_REASONS.map((reason) => {
                    const Icon = reason.icon;
                    return (
                      <div 
                        key={reason.code}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedReason === reason.code 
                            ? 'bg-muted border-border' 
                            : 'bg-background border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedReason(reason.code)}
                      >
                        <RadioGroupItem value={reason.code} id={reason.code} />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={reason.code} className="flex-1 cursor-pointer">
                          {reason.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajoutez des détails supplémentaires..."
              rows={3}
            />
          </div>

          {/* Email Option */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="sendEmail" 
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <Label htmlFor="sendEmail" className="cursor-pointer flex items-center gap-2 font-medium">
                  <Send className="h-4 w-4" />
                  Envoyer un email de clôture au client
                </Label>
              </div>
            </CardHeader>
            
            {sendEmail && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailTitle">Titre de l'email</Label>
                  <Input
                    id="emailTitle"
                    value={emailTitle}
                    onChange={(e) => setEmailTitle(e.target.value)}
                    placeholder="Titre de l'email..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Corps de l'email</Label>
                  <div className="border rounded-lg overflow-hidden bg-background">
                    <ReactQuill
                      theme="snow"
                      value={emailContent}
                      onChange={setEmailContent}
                      modules={quillModules}
                      className="bg-background"
                      style={{ minHeight: '200px' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilisez <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> pour insérer le nom du client
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-100 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>L'email sera envoyé via Resend à l'adresse du client</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Score D Badge */}
          <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              Score D
            </Badge>
            <span>sera automatiquement attribué à ce dossier</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          
          {sendEmail ? (
            <>
              <Button 
                variant="outline"
                onClick={() => handleSubmit(false)} 
                disabled={isSubmitting || !selectedReason}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <FileX className="mr-2 h-4 w-4" />
                    Classer sans envoyer d'email
                  </>
                )}
              </Button>
              <Button 
                onClick={() => handleSubmit(true)} 
                disabled={isSubmitting || !selectedReason}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Classer et envoyer l'email
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => handleSubmit(false)} 
              disabled={isSubmitting || !selectedReason}
              variant="secondary"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                  Traitement...
                </>
              ) : (
                <>
                  <FileX className="mr-2 h-4 w-4" />
                  Classer sans suite
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoFollowUpModal;
