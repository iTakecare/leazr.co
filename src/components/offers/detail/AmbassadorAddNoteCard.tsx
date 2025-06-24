
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { addOfferNote } from "@/services/offerService";

interface AmbassadorAddNoteCardProps {
  offerId: string;
  onNoteAdded: () => void;
}

const AmbassadorAddNoteCard: React.FC<AmbassadorAddNoteCardProps> = ({
  offerId,
  onNoteAdded
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!noteContent.trim()) {
      toast.error("Veuillez saisir une note");
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await addOfferNote(offerId, noteContent.trim(), "ambassador_note");
      
      if (success) {
        toast.success("Note ajoutée avec succès");
        setNoteContent("");
        setIsExpanded(false);
        onNoteAdded();
      } else {
        toast.error("Erreur lors de l'ajout de la note");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de la note:", error);
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNoteContent("");
    setIsExpanded(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Ajouter une note
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isExpanded ? (
          <Button 
            onClick={() => setIsExpanded(true)} 
            variant="outline" 
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une note
          </Button>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Tapez votre note ici..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !noteContent.trim()}
                size="sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-3 w-3 border-t-2 border-b-2 border-white rounded-full"></div>
                    Ajout...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                size="sm"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorAddNoteCard;
