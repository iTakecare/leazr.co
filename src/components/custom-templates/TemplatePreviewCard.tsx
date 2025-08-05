import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MoreVertical, 
  Edit, 
  Eye, 
  Copy, 
  Trash2, 
  CheckCircle,
  Circle,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExtendedCustomPdfTemplate } from '@/types/customPdfTemplateField';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TemplatePreviewCardProps {
  template: ExtendedCustomPdfTemplate;
  isActive: boolean;
  onEdit: (templateId: string) => void;
  onActivate: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onPreview: (templateId: string) => void;
  onRegenerateImages?: (templateId: string) => Promise<boolean>;
  className?: string;
}

export const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  template,
  isActive,
  onEdit,
  onActivate,
  onDuplicate,
  onDelete,
  onPreview,
  onRegenerateImages,
  className
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const fieldsCount = template.fields.length;
  const pagesCount = template.pages_data.length;
  const lastUpdated = new Date(template.updated_at);

  const handleRegenerateClick = async () => {
    if (!template.id || !onRegenerateImages) return;
    
    setIsRegenerating(true);
    try {
      const success = await onRegenerateImages(template.id);
      
      if (success) {
        toast.success("Aperçus régénérés avec succès");
      } else {
        toast.error("Erreur lors de la régénération des aperçus");
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error("Erreur lors de la régénération des aperçus");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className={cn(
      "relative group transition-all duration-200 hover:shadow-lg",
      isActive && "ring-2 ring-primary shadow-lg",
      className
    )}>
      {/* Active indicator */}
      {isActive && (
        <Badge 
          variant="default" 
          className="absolute -top-2 -right-2 z-10 flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          Actif
        </Badge>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 mr-2">
            <h3 className="font-semibold text-base leading-tight">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(template.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              {onRegenerateImages && (
                <DropdownMenuItem onClick={handleRegenerateClick} disabled={isRegenerating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Génération...' : 'Régénérer aperçus'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!isActive && (
                <DropdownMenuItem onClick={() => onActivate(template.id)}>
                  <Circle className="h-4 w-4 mr-2" />
                  Activer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(template.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        {/* Template preview with PDF icon */}
        <div className="w-full h-32 bg-muted rounded-md mb-3 relative overflow-hidden border-2 border-dashed border-muted-foreground/20">
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="relative">
                <Layers className="h-12 w-12 mx-auto mb-2 text-primary/60" />
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {pagesCount}
                </div>
              </div>
              <span className="text-xs font-medium">PDF Template</span>
              <div className="text-xs text-muted-foreground mt-1">
                {pagesCount} page{pagesCount > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          {/* Fields overlay indication */}
          {fieldsCount > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {fieldsCount} champ{fieldsCount > 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>

        {/* Template stats */}
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>{pagesCount} page{pagesCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(lastUpdated, 'dd/MM/yy', { locale: fr })}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPreview(template.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
          <Button 
            variant={isActive ? "secondary" : "default"}
            size="sm" 
            onClick={() => isActive ? onEdit(template.id) : onActivate(template.id)}
            className="flex-1"
          >
            {isActive ? (
              <>
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Activer
              </>
            )}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDelete(template.id)}
            className="px-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};