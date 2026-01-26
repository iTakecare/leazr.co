
import React from "react";
import { Badge } from "@/components/ui/badge";
import { translateOfferType } from "@/utils/offerTypeTranslator";
import { translateOfferSource, getSourceStyle } from "@/utils/offerSourceTranslator";
import { 
  User, Briefcase, Flag, UserCog, Phone, Building, Globe, Package, 
  Users, UserCheck, Handshake, FileText, Search, Facebook, Linkedin, 
  Calendar, HelpCircle, Home 
} from "lucide-react";

interface OfferTypeTagProps {
  type: string;
  source?: string | null;
  hasCustomPacks?: boolean;
  size?: "sm" | "md" | "lg";
}

const OfferTypeTag = ({ type, source, hasCustomPacks = false, size = "md" }: OfferTypeTagProps) => {
  // Si type est vide, afficher la SOURCE au lieu du type
  if (!type || type === "") {
    const sourceLabel = translateOfferSource(source);
    const sourceStyle = getSourceStyle(source);
    
    // Map des icônes lucide-react
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      UserCheck,
      Search,
      Facebook,
      Linkedin,
      Users,
      Globe,
      Calendar,
      HelpCircle
    };
    
    const IconComponent = iconMap[sourceStyle.icon] || Globe;
    
    return (
      <Badge
        variant="outline"
        className={`${sourceStyle.color} hover:${sourceStyle.color} flex items-center gap-1.5 py-1 px-2 text-xs font-medium border`}
      >
        <IconComponent className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span className="truncate">{sourceLabel}</span>
      </Badge>
    );
  }

  // Déterminer le badge selon le type
  let color = "";
  let icon = null;
  
  switch (type) {
    case "web_request":
      color = "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-100";
      icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "custom_pack_request":
      color = "bg-slate-200 text-slate-700 border-slate-400 hover:bg-slate-200";
      icon = <Package className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "ambassador_offer":
      color = "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-50";
      icon = <Flag className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "client_request":
      color = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50";
      icon = <Phone className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "partner_offer":
      color = "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-100";
      icon = <Briefcase className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "internal_offer":
      color = "bg-slate-200 text-slate-700 border-slate-400 hover:bg-slate-200";
      icon = <Building className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "admin_offer":
      color = "bg-slate-200 text-slate-700 border-slate-400 hover:bg-slate-200";
      icon = <UserCog className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "self_leasing":
      color = "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-100";
      icon = <Home className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    default:
      color = "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-100";
      icon = <User className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
  }

  const translatedType = translateOfferType(type);

  if (size === "sm") {
    return (
      <Badge
        variant="outline"
        className={`${color} flex items-center gap-1.5 py-1 px-2 text-xs font-medium border`}
      >
        {icon}
        <span className="truncate">{translatedType}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${color} flex items-center gap-2 py-1 px-3 border`}
    >
      {icon}
      {translatedType}
    </Badge>
  );
};

export default OfferTypeTag;
