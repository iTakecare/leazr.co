import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEquipmentDescription } from "@/lib/equipmentDescription";

interface EquipmentTitleWithSpecsProps {
  /** Valeur brute stockée dans `offer_equipment.title`. */
  title: string;
  /** Contenu additionnel affiché à droite de l'intitulé (ex : badge "Offert"). */
  titleSuffix?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  /** Ouvre la liste des composants par défaut. */
  defaultOpen?: boolean;
}

/**
 * Affiche l'intitulé court d'un équipement puis, si des composants ont été
 * saisis (config PC assemblée à la main), un repli "Configuration détaillée"
 * listant chaque composant proprement au lieu d'un pavé de texte.
 */
const EquipmentTitleWithSpecs: React.FC<EquipmentTitleWithSpecsProps> = ({
  title,
  titleSuffix,
  className,
  titleClassName,
  defaultOpen = false,
}) => {
  const { title: mainTitle, specs } = parseEquipmentDescription(title);
  const [open, setOpen] = useState(defaultOpen);

  const heading = (
    <span className={cn("font-medium", titleClassName)}>{mainTitle || title}</span>
  );

  if (specs.length === 0) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {heading}
        {titleSuffix}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {heading}
        {titleSuffix}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {open
          ? "Masquer la configuration"
          : `Configuration détaillée (${specs.length} éléments)`}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 border-l-2 border-muted pl-3">
          {specs.map((spec, idx) => (
            <li
              key={idx}
              className="text-xs text-muted-foreground leading-snug"
            >
              {spec}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EquipmentTitleWithSpecs;
