
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OffersFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  activeType: string;
  onTypeChange: (value: string) => void;
  activeSource: string;
  onSourceChange: (value: string) => void;
  hideTypeFilter?: boolean;
}

const OffersFilter = ({
  activeTab,
  onTabChange,
  activeType,
  onTypeChange,
  activeSource,
  onSourceChange,
  hideTypeFilter = false,
}: OffersFilterProps) => {
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
    </div>
  );
};

export default OffersFilter;
