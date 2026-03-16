import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Badge } from "@/components/ui/badge";
import { Package, Laptop, Smartphone, Tablet, Monitor, GripVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type EquipmentItem } from "@/services/collaboratorEquipmentService";

interface CollaboratorCardProps {
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  equipment: EquipmentItem[];
  readOnly?: boolean;
  isDragActive?: boolean;
  onViewDetails: () => void;
}

const getEquipmentIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('portable')) return Laptop;
  if (lower.includes('iphone') || lower.includes('phone') || lower.includes('smartphone') || lower.includes('gsm')) return Smartphone;
  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('tablette')) return Tablet;
  if (lower.includes('écran') || lower.includes('monitor') || lower.includes('screen')) return Monitor;
  return Package;
};

const getInitials = (name: string) => {
  if (!name || name === 'Non assigné') return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const displayName = (name: string, email: string) => {
  if (!name || name.trim() === '' || /^\d+$/.test(name.trim())) {
    return email || 'Collaborateur sans nom';
  }
  return name;
};

const CollaboratorCard: React.FC<CollaboratorCardProps> = ({
  collaboratorId,
  collaboratorName,
  collaboratorEmail,
  equipment,
  readOnly = false,
  isDragActive = false,
  onViewDetails
}) => {
  const name = displayName(collaboratorName, collaboratorEmail);

  return (
    <div className="border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(name)}`}>
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {equipment.length}
              </Badge>
            </div>
            {collaboratorEmail && (
              <p className="text-xs text-muted-foreground truncate">{collaboratorEmail}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onViewDetails}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={collaboratorId} isDropDisabled={readOnly}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[80px] p-2 transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-primary/5 border-t-2 border-t-primary'
                : isDragActive ? 'bg-primary/[0.02]' : ''
            }`}
          >
            {equipment.length > 0 ? (
              <div className="space-y-1.5">
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
                          className={`group flex items-center gap-2 p-2 rounded-md border bg-background transition-all ${
                            snapshot.isDragging
                              ? 'shadow-md scale-[1.02] border-primary/40'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                            {item.serial_number && (
                              <p className="text-[10px] font-mono text-muted-foreground truncate">
                                {item.serial_number}
                              </p>
                            )}
                          </div>
                          {!readOnly && (
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-center">
                <p className="text-xs text-muted-foreground/60">
                  {isDragActive ? 'Déposez ici' : 'Aucun équipement'}
                </p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default CollaboratorCard;
