
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  SendHorizontal, 
  CheckCircle, 
  X, 
  Sparkle, 
  Building, 
  Star, 
  HelpCircle,
  Search,
  Building2,
  BarChart3,
  FileCheck,
  Banknote,
  User,
  FileText,
  Circle,
  Send,
  XCircle
} from "lucide-react";

export const OFFER_STATUSES = {
  // Étapes initiales
  DRAFT: { 
    id: "draft", 
    label: "Brouillon", 
    icon: Circle,
    color: "bg-slate-100 text-slate-600 border-slate-300"
  },
  
  // Envoi
  SENT: { 
    id: "sent", 
    label: "Offre envoyée", 
    icon: Send,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  OFFER_SEND: { 
    id: "offer_send", 
    label: "Offre envoyée", 
    icon: Send,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  
  // Analyse interne
  INTERNAL_REVIEW: { 
    id: "internal_review", 
    label: "Analyse interne", 
    icon: Search,
    color: "bg-slate-100 text-slate-700 border-slate-300"
  },
  INTERNAL_APPROVED: { 
    id: "internal_approved", 
    label: "Validée interne", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  INTERNAL_DOCS_REQUESTED: { 
    id: "internal_docs_requested", 
    label: "Documents demandés (interne)", 
    icon: FileText,
    color: "bg-amber-50 text-amber-800 border-amber-300"
  },
  INTERNAL_REJECTED: { 
    id: "internal_rejected", 
    label: "Rejetée interne", 
    icon: XCircle,
    color: "bg-red-50 text-red-800 border-red-300"
  },
  
  // Analyse leaser
  LEASER_REVIEW: { 
    id: "leaser_review", 
    label: "Analyse leaser", 
    icon: Building2,
    color: "bg-slate-100 text-slate-700 border-slate-300"
  },
  LEASER_INTRODUCED: { 
    id: "leaser_introduced", 
    label: "Introduit leaser", 
    icon: Building2,
    color: "bg-slate-100 text-slate-700 border-slate-300"
  },
  SCORING_REVIEW: { 
    id: "Scoring_review", 
    label: "Résultat leaser", 
    icon: BarChart3,
    color: "bg-slate-100 text-slate-700 border-slate-300"
  },
  LEASER_APPROVED: { 
    id: "leaser_approved", 
    label: "Validée leaser", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  LEASER_DOCS_REQUESTED: { 
    id: "leaser_docs_requested", 
    label: "Documents demandés (leaser)", 
    icon: FileText,
    color: "bg-amber-50 text-amber-800 border-amber-300"
  },
  LEASER_REJECTED: { 
    id: "leaser_rejected", 
    label: "Rejetée leaser", 
    icon: XCircle,
    color: "bg-red-50 text-red-800 border-red-300"
  },
  
  // Client
  CLIENT_REVIEW: { 
    id: "client_review", 
    label: "En revue client", 
    icon: User,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  OFFER_ACCEPTED: { 
    id: "offer_accepted", 
    label: "Offre acceptée", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  CLIENT_REJECTED: { 
    id: "client_rejected", 
    label: "Rejetée par client", 
    icon: XCircle,
    color: "bg-red-50 text-red-800 border-red-300"
  },
  
  // Finalisation
  VALIDATED: { 
    id: "validated", 
    label: "Contrat prêt", 
    icon: FileCheck,
    color: "bg-blue-50 text-blue-800 border-blue-300"
  },
  FINANCED: { 
    id: "financed", 
    label: "Financée", 
    icon: Banknote,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  
  // Facturation (offres d'achat)
  INVOICING: { 
    id: "invoicing", 
    label: "Facturé", 
    icon: FileCheck,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  
  // Anciens statuts pour compatibilité
  APPROVED: { 
    id: "approved", 
    label: "Approuvée", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  ACCEPTED: { 
    id: "accepted", 
    label: "Acceptée", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  CONTRACT_SIGNED: { 
    id: "contract_signed", 
    label: "Acceptée", 
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-800 border-emerald-300"
  },
  REJECTED: { 
    id: "rejected", 
    label: "Rejetée", 
    icon: XCircle,
    color: "bg-red-50 text-red-800 border-red-300"
  },
  INFO_REQUESTED: { 
    id: "info_requested", 
    label: "Informations demandées", 
    icon: HelpCircle,
    color: "bg-amber-50 text-amber-800 border-amber-300"
  },
  VALID_ITC: { 
    id: "valid_itc", 
    label: "Validée ITC", 
    icon: Sparkle,
    color: "bg-slate-200 text-slate-700 border-slate-300"
  },
};

export interface OfferStatusBadgeProps {
  status: string | null | undefined;
  showIcon?: boolean;
  className?: string;
  isConverted?: boolean;
  hasRecentDocuments?: boolean;
}

const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ 
  status, 
  showIcon = true,
  className = "",
  isConverted = false,
  hasRecentDocuments = false
}) => {
  // Normaliser le statut - si null/undefined, utiliser 'draft' par défaut
  const normalizedStatus = status || 'draft';
  
  // Statuts concernés par l'indicateur de documents récents
  const isDocumentRequestStatus = ['info_requested', 'internal_docs_requested', 'leaser_docs_requested'].includes(normalizedStatus);
  
  // Fonction pour déterminer le style du badge en fonction du statut
  const getBadgeStyle = () => {
    if (isConverted) {
      return "bg-green-100 text-green-700 border-green-200 hover:bg-green-100";
    }
    
    const statusObj = Object.values(OFFER_STATUSES).find(s => s.id === normalizedStatus);
    if (statusObj?.color) {
      return `${statusObj.color} hover:${statusObj.color.split(' ')[0]}`;
    }
    
    return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100";
  };

  // Fonction pour déterminer si l'offre est publiquement accessible
  const isPubliclyAccessible = () => {
    return ['sent', 'approved', 'internal_review', 'internal_approved', 'internal_docs_requested', 
            'leaser_review', 'leaser_approved', 'leaser_docs_requested', 'validated', 
            'info_requested', 'valid_itc', 'financed'].includes(normalizedStatus);
  };

  // Obtenir le statut correspondant ou utiliser un statut par défaut
  const statusObj = Object.values(OFFER_STATUSES).find(s => s.id === normalizedStatus) || {
    id: normalizedStatus,
    label: normalizedStatus === 'draft' ? 'Brouillon' : normalizedStatus,
    icon: normalizedStatus === 'draft' ? Pencil : HelpCircle
  };

  const StatusIcon = statusObj.icon;

  return (
    <Badge variant="outline" className={`${getBadgeStyle()} ${className}`}>
      {showIcon && <StatusIcon className="mr-1 h-3 w-3" />}
      {isConverted ? "Convertie" : statusObj.label}
      {isPubliclyAccessible() && (
        <span className="ml-1 text-xs" title="Accessible publiquement">🔗</span>
      )}
      {hasRecentDocuments && isDocumentRequestStatus && (
        <span className="relative flex h-2 w-2 ml-1.5" title="Documents uploadés dans les dernières 24h">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
    </Badge>
  );
};

export default OfferStatusBadge;
