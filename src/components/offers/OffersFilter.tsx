
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceDateRangeFilter } from "@/components/invoicing/InvoiceDateRangeFilter";

// Motifs de refus (offers.rejection_category — mêmes codes que ScoringModal)
export const REJECTION_CATEGORY_LABELS: Record<string, string> = {
  fraud: "Suspect / fraude",
  young_company: "Entreprise trop jeune / montant",
  private_client: "Client particulier",
  financial_situation: "Situation financière",
  other: "Autre raison",
  unknown: "Sans motif renseigné",
};

// Motifs de sans suite (offer_workflow_logs.sub_reason — mêmes codes que NoFollowUpModal)
export const NO_FOLLOW_UP_LABELS: Record<string, string> = {
  no_response: "Plus de nouvelles après relances",
  project_postponed: "Projet reporté par le client",
  went_competitor: "Parti chez un concurrent",
  budget_issue: "Problème de budget",
  project_cancelled: "Projet annulé",
  other: "Autre raison",
  unknown: "Sans motif renseigné",
};

interface OffersFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  activeType: string;
  onTypeChange: (value: string) => void;
  activeSource: string;
  onSourceChange: (value: string) => void;
  hideTypeFilter?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange?: (date: Date | undefined) => void;
  onDateToChange?: (date: Date | undefined) => void;
  activeRejectType?: string;
  onRejectTypeChange?: (value: string) => void;
  activeMotif?: string;
  onMotifChange?: (value: string) => void;
}

const OffersFilter = ({
  activeTab,
  onTabChange,
  activeType,
  onTypeChange,
  activeSource,
  onSourceChange,
  hideTypeFilter = false,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  activeRejectType = "all",
  onRejectTypeChange,
  activeMotif = "all",
  onMotifChange,
}: OffersFilterProps) => {
  const motifLabels =
    activeTab === "rejected" ? REJECTION_CATEGORY_LABELS
    : activeTab === "without_follow_up" ? NO_FOLLOW_UP_LABELS
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status tabs — principal filtre, style pill compact */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-none">
        <TabsList className="h-8 bg-muted/60 rounded-full p-0.5 gap-0.5 border border-border/40">
          <TabsTrigger
            value="in_progress"
            className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            À traiter
          </TabsTrigger>
          <TabsTrigger
            value="accepted"
            className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Acceptées
          </TabsTrigger>
          <TabsTrigger
            value="invoiced"
            className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Facturées
          </TabsTrigger>
          <TabsTrigger
            value="without_follow_up"
            className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Sans suite
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Refusées
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Séparateur vertical */}
      {!hideTypeFilter && (
        <div className="h-5 w-px bg-border/60 hidden sm:block" />
      )}

      {/* Type & Source — dropdowns compacts */}
      {!hideTypeFilter && (
        <>
          <Select value={activeType} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs border-border/60 rounded-full px-3 bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous types</SelectItem>
              <SelectItem value="admin_offer" className="text-xs">Mes demandes</SelectItem>
              <SelectItem value="client_request" className="text-xs">Demandes clients</SelectItem>
              <SelectItem value="web_request" className="text-xs">Demandes web</SelectItem>
            </SelectContent>
          </Select>

          <Select value={activeSource} onValueChange={onSourceChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs border-border/60 rounded-full px-3 bg-background">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes sources</SelectItem>
              <SelectItem value="meta" className="text-xs">Meta Ads</SelectItem>
              <SelectItem value="custom_pack" className="text-xs">Packs perso.</SelectItem>
              <SelectItem value="web_catalog" className="text-xs">Catalogue</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {/* Onglet Refusées : type de rejet (interne / leaser) */}
      {activeTab === "rejected" && onRejectTypeChange && (
        <Select value={activeRejectType} onValueChange={onRejectTypeChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs border-border/60 rounded-full px-3 bg-background">
            <SelectValue placeholder="Type de rejet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les rejets</SelectItem>
            <SelectItem value="internal_rejected" className="text-xs">Rejet interne</SelectItem>
            <SelectItem value="leaser_rejected" className="text-xs">Rejet leaser</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Onglets Refusées / Sans suite : filtre par motif */}
      {motifLabels && onMotifChange && (
        <Select value={activeMotif} onValueChange={onMotifChange}>
          <SelectTrigger className="h-8 w-[210px] text-xs border-border/60 rounded-full px-3 bg-background">
            <SelectValue placeholder="Motif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les motifs</SelectItem>
            {Object.entries(motifLabels).map(([code, label]) => (
              <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Plage de dates (date de l'offre) */}
      {onDateFromChange && onDateToChange && (
        <>
          <div className="h-5 w-px bg-border/60 hidden sm:block" />
          <InvoiceDateRangeFilter
            startDate={dateFrom}
            endDate={dateTo}
            onStartDateChange={onDateFromChange}
            onEndDateChange={onDateToChange}
          />
        </>
      )}
    </div>
  );
};

export default OffersFilter;
