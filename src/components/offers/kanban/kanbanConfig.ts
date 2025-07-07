
import { 
  Pencil, 
  SendHorizontal, 
  CheckCircle, 
  X, 
  HelpCircle, 
  Sparkle, 
  Building, 
  Star,
  Search
} from "lucide-react";
import { OFFER_STATUSES } from "../OfferStatusBadge";

// Définition des colonnes du Kanban avec le nouveau workflow
export const KANBAN_COLUMNS = [
  {
    id: OFFER_STATUSES.DRAFT.id,
    title: "1. Brouillons",
    icon: Pencil,
    color: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-700",
  },
  {
    id: OFFER_STATUSES.SENT.id,
    title: "2. Envoyées",
    icon: SendHorizontal,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: OFFER_STATUSES.INTERNAL_REVIEW.id,
    title: "3. Analyse interne",
    icon: Search,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
  },
  {
    id: OFFER_STATUSES.INTERNAL_APPROVED.id,
    title: "3A. Validée interne",
    icon: CheckCircle,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: OFFER_STATUSES.INTERNAL_DOCS_REQUESTED.id,
    title: "3B. Docs demandés",
    icon: HelpCircle,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: OFFER_STATUSES.LEASER_REVIEW.id,
    title: "4. Analyse Leaser",
    icon: Building,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: OFFER_STATUSES.LEASER_APPROVED.id,
    title: "4A. Validée Leaser",
    icon: CheckCircle,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: OFFER_STATUSES.LEASER_DOCS_REQUESTED.id,
    title: "4B. Docs Leaser",
    icon: HelpCircle,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: OFFER_STATUSES.VALIDATED.id,
    title: "5. Validées",
    icon: Star,
    color: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    id: OFFER_STATUSES.APPROVED.id,
    title: "Signées client",
    icon: CheckCircle,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  // Colonnes pour les refus
  {
    id: OFFER_STATUSES.INTERNAL_REJECTED.id,
    title: "Refus interne",
    icon: X,
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
  {
    id: OFFER_STATUSES.LEASER_REJECTED.id,
    title: "Refus Leaser",
    icon: X,
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
  // Anciens statuts pour compatibilité
  {
    id: OFFER_STATUSES.REJECTED.id,
    title: "Rejetées",
    icon: X,
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
];
