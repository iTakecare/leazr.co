
import React from "react";
import { Badge } from "@/components/ui/badge";
import { translateOfferType, translateOfferSource } from "@/utils/offerTypeTranslator";
import { User, Briefcase, Flag, UserCog, Phone, Building, Globe, Package } from "lucide-react";

interface OfferTypeTagProps {
  type: string;
  source?: string | null;
  size?: "sm" | "md" | "lg";
}

const OfferTypeTag = ({ type, source, size = "md" }: OfferTypeTagProps) => {
  // Si une source est définie, afficher le badge de source
  if (source) {
    let color = "";
    let icon = null;
    const translatedSource = translateOfferSource(source);

    switch (source.toLowerCase()) {
      case "custom_pack":
        color = "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50";
        icon = <Package className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
        break;
      case "web_catalog":
        color = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50";
        icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
        break;
      default:
        color = "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50";
        icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
    }

    if (size === "sm") {
      return (
        <Badge
          variant="outline"
          className={`${color} flex items-center gap-1.5 py-1 px-2 text-xs font-medium border`}
        >
          {icon}
          <span className="truncate">{translatedSource}</span>
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={`${color} flex items-center gap-2 py-1 px-3 border`}
      >
        {icon}
        {translatedSource}
      </Badge>
    );
  }

  // Sinon, afficher le badge de type (comportement par défaut)
  let color = "";
  let icon = null;

  switch (type) {
    case "ambassador_offer":
      color = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      icon = <Flag className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "partner_offer":
      color = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50";
      icon = <Briefcase className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "admin_offer":
      color = "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50";
      icon = <UserCog className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "client_request":
      color = "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      icon = <Phone className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "web_request":
      color = "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-50";
      icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "internal_offer":
      color = "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50";
      icon = <Building className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "web_offer":
      color = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
      icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    default:
      color = "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50";
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
