import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Laptop, Smartphone, Tablet, Monitor, GripVertical } from "lucide-react";
import { type EquipmentItem } from "@/services/collaboratorEquipmentService";

interface UnassignedEquipmentPanelProps {
  equipment: EquipmentItem[];
  readOnly?: boolean;
}

const getEquipmentIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('portable')) return Laptop;
  if (lower.includes('iphone') || lower.includes('phone') || lower.includes('smartphone') || lower.includes('gsm')) return Smartphone;
  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('tablette')) return Tablet;
  if (lower.includes('écran') || lower.includes('monitor') || lower.includes('screen')) return Monitor;
  return Package;
};

const UnassignedEquipmentPanel: React.FC<UnassignedEquipmentPanelProps> = ({
  equipment,
  readOnly = false
}) => {
  return (
    <Card className="h-full flex flex-col border border-border bg-card">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Matériel non assigné
          </div>
          <Badge variant="secondary" className="text-xs">
            {equipment.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        <Droppable droppableId="unassigned" isDropDisabled={readOnly}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`h-full overflow-y-auto rounded-lg border-2 border-dashed p-2 transition-colors ${
                snapshot.isDraggingOver
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border/50 bg-muted/20'
              }`}
            >
              {equipment.length > 0 ? (
                <div className="space-y-2">
                  {equipment.map((item, index) => {
                    const Icon = getEquipmentIcon(item.title);
                    return (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group p-3 bg-background rounded-lg border transition-all ${
                              snapshot.isDragging
                                ? 'shadow-lg scale-[1.02] border-primary/40 rotate-1'
                                : 'hover:shadow-sm hover:border-primary/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {item.source_name}
                                </p>
                                {item.serial_number && (
                                  <p className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                                    S/N: {item.serial_number}
                                  </p>
                                )}
                              </div>
                              {!readOnly && (
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Tout le matériel est assigné
                  </p>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};

export default UnassignedEquipmentPanel;
