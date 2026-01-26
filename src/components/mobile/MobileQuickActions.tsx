import React from "react";
import { FileText, Mail, Edit, MoreHorizontal, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileQuickActionsProps {
  onPDF?: () => void;
  onEmail?: () => void;
  onEdit?: () => void;
  onMore?: () => void;
  onPreview?: () => void;
  isGeneratingPDF?: boolean;
}

const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  onPDF,
  onEmail,
  onEdit,
  onMore,
  onPreview,
  isGeneratingPDF = false,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {onPDF && (
        <Button
          variant="outline"
          onClick={onPDF}
          disabled={isGeneratingPDF}
          className="flex-col h-16 gap-1 text-xs"
        >
          <FileText className="h-5 w-5" />
          <span>{isGeneratingPDF ? "..." : "PDF"}</span>
        </Button>
      )}
      
      {onEmail && (
        <Button
          variant="outline"
          onClick={onEmail}
          className="flex-col h-16 gap-1 text-xs"
        >
          <Mail className="h-5 w-5" />
          <span>Email</span>
        </Button>
      )}
      
      {onEdit && (
        <Button
          variant="outline"
          onClick={onEdit}
          className="flex-col h-16 gap-1 text-xs"
        >
          <Edit className="h-5 w-5" />
          <span>Modifier</span>
        </Button>
      )}

      {onPreview && (
        <Button
          variant="outline"
          onClick={onPreview}
          className="flex-col h-16 gap-1 text-xs"
        >
          <ExternalLink className="h-5 w-5" />
          <span>Aperçu</span>
        </Button>
      )}
      
      {onMore && (
        <Button
          variant="outline"
          onClick={onMore}
          className="flex-col h-16 gap-1 text-xs"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Plus</span>
        </Button>
      )}
    </div>
  );
};

export default MobileQuickActions;
