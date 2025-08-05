import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  onRegenerateImages?: (templateId: string) => void;
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
  const fieldsCount = template.fields.length;
  const pagesCount = template.pages_data.length;
  const lastUpdated = new Date(template.updated_at);

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
                <DropdownMenuItem onClick={() => onRegenerateImages(template.id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Régénérer aperçus
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
        {/* Template preview/thumbnail placeholder */}
        <div className="w-full h-32 bg-muted rounded-md mb-3 relative overflow-hidden">
          {template.pages_data[0]?.image_url ? (
            <img 
              src={template.pages_data[0].image_url} 
              alt={`Aperçu de ${template.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Layers className="h-8 w-8 mx-auto mb-2" />
                <span className="text-xs">Pas d'aperçu</span>
              </div>
            </div>
          )}
          
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