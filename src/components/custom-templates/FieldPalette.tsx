import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { FIELD_CATEGORIES, FieldDefinition } from "@/types/customPdfTemplateField";
import { cn } from "@/lib/utils";

interface FieldPaletteProps {
  onFieldAdd: (fieldDef: FieldDefinition) => void;
  className?: string;
}

const FieldPalette: React.FC<FieldPaletteProps> = ({ onFieldAdd, className }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['client', 'offer']) // Ouvrir client et offre par défaut
  );

  // Filtrer les champs selon le terme de recherche
  const filteredCategories = FIELD_CATEGORIES.map(category => ({
    ...category,
    fields: category.fields.filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.mapping_key.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.fields.length > 0);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleFieldAdd = (fieldDef: FieldDefinition) => {
    onFieldAdd(fieldDef);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Champs disponibles
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un champ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun champ trouvé
          </p>
        ) : (
          filteredCategories.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto hover:bg-muted/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <span className="font-medium">{category.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {category.fields.length}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 ml-6">
                  {category.fields.map(field => (
                    <Button
                      key={field.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start p-2 h-auto text-left hover:bg-primary/5 hover:border-primary/20 border border-transparent"
                      onClick={() => handleFieldAdd(field)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {field.label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {field.mapping_key}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                            {
                              'bg-blue-100 text-blue-700': field.type === 'text',
                              'bg-green-100 text-green-700': field.type === 'currency',
                              'bg-orange-100 text-orange-700': field.type === 'date',
                              'bg-purple-100 text-purple-700': field.type === 'number',
                              'bg-gray-100 text-gray-700': field.type === 'table',
                            }
                          )}>
                            {field.type}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Cliquez sur un champ pour l'ajouter au template. 
            Vous pourrez ensuite le positionner sur le PDF.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldPalette;