
import { 
  Pencil, 
  SendHorizontal, 
  CheckCircle, 
  X, 
  HelpCircle, 
  Sparkle, 
  Building, 
  Star 
} from "lucide-react";
import { OFFER_STATUSES } from "../OfferStatusBadge";

// Définition des colonnes du Kanban
export const KANBAN_COLUMNS = [
  {
    id: OFFER_STATUSES.DRAFT.id,
    title: "Brouillons",
    icon: Pencil,
    color: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-700",
  },
  {
    id: OFFER_STATUSES.SENT.id,
    title: "Envoyées",
    icon: SendHorizontal,
    color: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
  },
  {
    id: OFFER_STATUSES.VALID_ITC.id,
    title: "Valid. ITC",
    icon: Sparkle,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
  },
  {
    id: OFFER_STATUSES.INFO_REQUESTED.id,
    title: "Infos demandées",
    icon: HelpCircle,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: OFFER_STATUSES.APPROVED.id,
    title: "Approuvées",
    icon: CheckCircle,
    color: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    id: OFFER_STATUSES.LEASER_REVIEW.id,
    title: "Validation Bailleur",
    icon: Building,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: OFFER_STATUSES.FINANCED.id,
    title: "Financées",
    icon: Star,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: OFFER_STATUSES.REJECTED.id,
    title: "Rejetées",
    icon: X,
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
];
