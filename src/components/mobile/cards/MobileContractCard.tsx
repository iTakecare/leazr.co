import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building, 
  Calendar, 
  Download, 
  Mail, 
  FileText,
  CreditCard,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import MobileSwipeCard, {
  createEmailAction,
  SwipeAction,
} from "../MobileSwipeCard";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  reference?: string;
  client_name: string;
  client_company?: string | null;
  client_email?: string | null;
  monthly_payment?: number;
  total_amount?: number;
  start_date?: string;
  end_date?: string;
  duration?: number;
  status?: string;
}

interface MobileContractCardProps {
  contract: Contract;
  onEmail?: (email: string) => void;
  onDownload?: () => void;
  onClick?: () => void;
}

const MobileContractCard: React.FC<MobileContractCardProps> = ({
  contract,
  onEmail,
  onDownload,
  onClick,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };

  // Build swipe actions
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (contract.client_email) {
    leftActions.push(createEmailAction(contract.client_email, "Email"));
  }

  if (onDownload) {
    rightActions.push({
      id: 'download',
      icon: Download,
      label: 'PDF',
      color: 'primary',
      onClick: onDownload,
    });
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/10 text-primary';
      case 'pending':
        return 'bg-secondary text-secondary-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending':
        return 'En attente';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status || 'N/A';
    }
  };

  return (
    <MobileSwipeCard
      leftActions={leftActions}
      rightActions={rightActions}
      className="mb-3"
    >
      <div onClick={onClick} className="p-4">
        {/* Header: Reference & Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              {contract.reference || `#${contract.id.slice(0, 8).toUpperCase()}`}
            </span>
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            getStatusColor(contract.status)
          )}>
            {getStatusLabel(contract.status)}
          </span>
        </div>

        {/* Client Info */}
        <div className="space-y-1.5 mb-3">
          <h3 className="font-medium text-sm">{contract.client_name}</h3>
          
          {contract.client_company && (
            <div className="flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {contract.client_company}
              </span>
            </div>
          )}
        </div>

        {/* Financial & Duration */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg mb-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Mensualité</p>
            <p className="font-semibold text-sm text-primary">
              {formatCurrency(contract.monthly_payment || 0)}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Durée</p>
            <p className="font-semibold text-sm">
              {contract.duration || 36} mois
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-semibold text-sm">
              {formatCurrency(contract.total_amount || 0)}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Début: {formatDate(contract.start_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Fin: {formatDate(contract.end_date)}</span>
          </div>
        </div>
      </div>
    </MobileSwipeCard>
  );
};

export default MobileContractCard;
