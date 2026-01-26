import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserX, Mail, Clock, Calendar, FileX } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Veuillez sélectionner une raison");
      return;
    }

    setIsSubmitting(true);

    try {
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-gray-600" />
            Classer ce dossier sans suite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reminder History */}
          {reminders.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Historique des relances ({reminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {reminders.map((reminder, index) => (
                    <div 
                      key={reminder.id} 
                      className="flex items-center justify-between text-sm p-2 bg-white rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
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
            <div className="bg-gray-50 p-4 rounded-lg text-center text-muted-foreground text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              Aucune relance envoyée pour ce dossier
            </div>
          )}

          {/* Reason Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Raison du classement sans suite <span className="text-red-500">*</span>
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
                            ? 'bg-gray-100 border-gray-400' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedReason(reason.code)}
                      >
                        <RadioGroupItem value={reason.code} id={reason.code} />
                        <Icon className="h-4 w-4 text-gray-500" />
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

          {/* Score D Badge */}
          <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-2 text-sm text-gray-600">
            <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200">
              Score D
            </Badge>
            <span>sera automatiquement attribué à ce dossier</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedReason}
            className="bg-gray-600 hover:bg-gray-700 text-white"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoFollowUpModal;
