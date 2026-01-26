import React from "react";
import { Building, Mail, Phone, FileText, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import MobileSwipeCard, {
  createCallAction,
  createEmailAction,
  createDeleteAction,
  SwipeAction,
} from "../MobileSwipeCard";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  // Stats
  offersCount?: number;
  contractsCount?: number;
  totalRevenue?: number;
}

interface MobileClientCardProps {
  client: Client;
  onCall?: (phone: string) => void;
  onEmail?: (email: string) => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const MobileClientCard: React.FC<MobileClientCardProps> = ({
  client,
  onCall,
  onEmail,
  onDelete,
  onClick,
}) => {
  // Build swipe actions
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (client.phone) {
    leftActions.push(createCallAction(client.phone, "Appeler"));
  }

  if (client.email) {
    leftActions.push(createEmailAction(client.email, "Email"));
  }

  if (onDelete) {
    rightActions.push(createDeleteAction(onDelete, "Supprimer"));
  }

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-primary/10 text-primary';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'prospect':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'prospect':
        return 'Prospect';
      default:
        return 'N/A';
    }
  };

  return (
    <MobileSwipeCard
      leftActions={leftActions}
      rightActions={rightActions}
      className="mb-3"
    >
      <div onClick={onClick} className="p-4">
        {/* Header: Name & Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{client.name}</h3>
            {client.company && (
              <div className="flex items-center gap-1.5 mt-1">
                <Building className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {client.company}
                </span>
              </div>
            )}
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
            getStatusColor(client.status)
          )}>
            {getStatusLabel(client.status)}
          </span>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-3">
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {client.email}
              </span>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">
                {client.phone}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {client.offersCount || 0} offres
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                {client.contractsCount || 0} contrats
              </span>
            </div>
          </div>
          
          {client.totalRevenue !== undefined && client.totalRevenue > 0 && (
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                {formatCurrency(client.totalRevenue)}
              </span>
            </div>
          )}
        </div>
      </div>
    </MobileSwipeCard>
  );
};

export default MobileClientCard;
