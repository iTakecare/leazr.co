import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RichTextEditor from "@/components/ui/rich-text-editor";
import DOMPurify from 'dompurify';

interface ContractSpecialProvisionsCardProps {
  contractId: string;
  isSelfLeasing: boolean;
  initialContent?: string;
  onUpdate?: () => void;
}

const ContractSpecialProvisionsCard: React.FC<ContractSpecialProvisionsCardProps> = ({
  contractId,
  isSelfLeasing,
  initialContent,
  onUpdate
}) => {
  const [content, setContent] = useState(initialContent || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddButton, setShowAddButton] = useState(!initialContent);

  useEffect(() => {
    setContent(initialContent || '');
    setShowAddButton(!initialContent);
  }, [initialContent]);

  // Ne pas afficher si ce n'est pas un contrat de location en propre
  if (!isSelfLeasing) {
    return null;
  }

  // Ne pas afficher si pas de contenu et pas en mode édition
  if (!content && !isEditing && !showAddButton) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ special_provisions: content || null })
        .eq('id', contractId);

      if (error) throw error;

      toast.success("Dispositions particulières enregistrées");
      setIsEditing(false);
      setShowAddButton(!content);
      onUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent || '');
    setIsEditing(false);
    if (!initialContent) {
      setShowAddButton(true);
    }
  };

  const handleStartEditing = () => {
    setShowAddButton(false);
    setIsEditing(true);
  };

  // Afficher seulement le bouton "Ajouter" si pas de contenu
  if (showAddButton && !isEditing) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-6">
          <Button
            variant="ghost"
            className="w-full h-20 flex flex-col gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleStartEditing}
          >
            <Plus className="h-5 w-5" />
            <span>Ajouter des dispositions particulières</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Dispositions particulières</CardTitle>
        </div>
        {!isEditing && content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEditing}
            className="h-8 px-2"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Saisissez les dispositions particulières..."
              height={200}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 mr-1" />
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ContractSpecialProvisionsCard;
