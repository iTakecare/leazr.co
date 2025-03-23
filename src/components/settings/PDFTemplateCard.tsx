
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Eye, Copy } from "lucide-react";

interface PDFTemplateCardProps {
  template: any;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
}

const PDFTemplateCard = ({ template, onEdit, onDelete, onPreview, onDuplicate }: PDFTemplateCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{template.name}</span>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {template.templateImages?.length || 0} page(s)
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          className="aspect-[3/4] bg-gray-50 border-t border-b overflow-hidden flex items-center justify-center"
          style={{ 
            backgroundImage: template.templateImages?.[0] ? `url(${template.templateImages[0].imageUrl})` : 'none',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {!template.templateImages?.length && (
            <div className="text-sm text-muted-foreground">Aucune image</div>
          )}
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2 p-3">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          Aperçu
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <Button variant="outline" size="sm" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Dupliquer
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
          <Trash className="h-3.5 w-3.5 mr-1" />
          Supprimer
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PDFTemplateCard;
