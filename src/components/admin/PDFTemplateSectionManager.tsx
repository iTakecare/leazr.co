import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface Section {
  id: string;
  title: string;
  order: number;
  enabled?: boolean;
}

interface PDFTemplateSectionManagerProps {
  template: any;
  sections: any;
  onSectionsChange: (sections: any) => void;
}

export default function PDFTemplateSectionManager({
  template,
  sections: customSections,
  onSectionsChange,
}: PDFTemplateSectionManagerProps) {
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    // Initialize sections from manifest or custom sections
    const manifestPages = template?.manifest_data?.pages || [];
    
    const initializedSections = manifestPages.map((page: any) => ({
      id: page.id,
      title: page.title,
      order: page.order,
      enabled: customSections[page.id]?.enabled ?? true,
    }));
    
    // Sort by order
    initializedSections.sort((a: Section, b: Section) => a.order - b.order);
    
    setSections(initializedSections);
  }, [template, customSections]);

  const handleToggle = (sectionId: string, enabled: boolean) => {
    const updatedSections = sections.map((section) =>
      section.id === sectionId ? { ...section, enabled } : section
    );
    setSections(updatedSections);
    
    // Convert to customization format
    const customization = updatedSections.reduce((acc, section) => ({
      ...acc,
      [section.id]: {
        enabled: section.enabled,
        order: section.order,
      },
    }), {});
    
    onSectionsChange(customization);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update orders
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setSections(updatedSections);
    
    // Convert to customization format
    const customization = updatedSections.reduce((acc, section) => ({
      ...acc,
      [section.id]: {
        enabled: section.enabled,
        order: section.order,
      },
    }), {});
    
    onSectionsChange(customization);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Gestion des sections</h3>
        <p className="text-sm text-muted-foreground">
          Activez/désactivez les pages du template et réorganisez-les par glisser-déposer
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {sections.map((section, index) => (
                <Draggable
                  key={section.id}
                  draggableId={section.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-4 ${
                        snapshot.isDragging ? "shadow-lg" : ""
                      } ${!section.enabled ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {section.order}. {section.title}
                            </span>
                            {section.enabled ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Section {section.id}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${section.id}`} className="text-sm">
                            {section.enabled ? "Activée" : "Désactivée"}
                          </Label>
                          <Switch
                            id={`toggle-${section.id}`}
                            checked={section.enabled}
                            onCheckedChange={(checked) =>
                              handleToggle(section.id, checked)
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
