
import React from "react";
import { Badge } from "@/components/ui/badge";
import { translateOfferType } from "@/utils/offerTypeTranslator";
import { User, Briefcase, Flag, UserCog, Phone, Building, Globe } from "lucide-react";

interface OfferTypeTagProps {
  type: string;
  size?: "sm" | "md" | "lg";
}

const OfferTypeTag = ({ type, size = "md" }: OfferTypeTagProps) => {
  let color = "";
  let icon = null;

  switch (type) {
    case "ambassador_offer":
      color = "bg-amber-100 text-amber-800 hover:bg-amber-100";
      icon = <Flag className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "partner_offer":
      color = "bg-blue-100 text-blue-800 hover:bg-blue-100";
      icon = <Briefcase className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "admin_offer":
      color = "bg-purple-100 text-purple-800 hover:bg-purple-100";
      icon = <UserCog className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "client_request":
      color = "bg-green-100 text-green-800 hover:bg-green-100";
      icon = <Phone className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "internal_offer":
      color = "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      icon = <Building className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    case "web_offer":
      color = "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
      icon = <Globe className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      break;
    default:
      color = "bg-gray-100 text-gray-800 hover:bg-gray-100";
      icon = <User className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
  }

  const translatedType = translateOfferType(type);

  if (size === "sm") {
    return (
      <Badge
        variant="outline"
        className={`${color} flex items-center gap-1 py-0 px-1.5 text-xs font-normal`}
      >
        {icon}
        {size === "sm" ? null : translatedType}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${color} flex items-center gap-2 py-1 px-3`}
    >
      {icon}
      {translatedType}
    </Badge>
  );
};

export default OfferTypeTag;
