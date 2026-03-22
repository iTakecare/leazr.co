import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface AdvancedFilters {
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  leaser?: string;
  clientSearch?: string;
  minMonthly?: number;
  maxMonthly?: number;
  duration?: number;
}

interface ContractsAdvancedFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  leasers: string[];
  durations: number[];
}

const ContractsAdvancedFilters: React.FC<ContractsAdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  leasers,
  durations,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== null
  ).length;

  const updateFilter = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFiltersChange({});
  };

  const DateFilter = ({
    label,
    fromKey,
    toKey,
  }: {
    label: string;
    fromKey: keyof AdvancedFilters;
    toKey: keyof AdvancedFilters;
  }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs justify-start",
                !filters[fromKey] && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {filters[fromKey]
                ? format(filters[fromKey] as Date, "dd/MM/yy", { locale: fr })
                : "Du"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters[fromKey] as Date | undefined}
              onSelect={(date) => updateFilter(fromKey, date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs justify-start",
                !filters[toKey] && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {filters[toKey]
                ? format(filters[toKey] as Date, "dd/MM/yy", { locale: fr })
                : "Au"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters[toKey] as Date | undefined}
              onSelect={(date) => updateFilter(toKey, date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={isOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 text-xs"
        >
          <SlidersHorizontal className="mr-1 h-3 w-3" />
          Filtres avancés
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Réinitialiser
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
          <DateFilter
            label="Date de début"
            fromKey="startDateFrom"
            toKey="startDateTo"
          />
          <DateFilter
            label="Date de fin"
            fromKey="endDateFrom"
            toKey="endDateTo"
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Bailleur
            </span>
            <Select
              value={filters.leaser || "all"}
              onValueChange={(v) =>
                updateFilter("leaser", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {leasers.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Durée
            </span>
            <Select
              value={filters.duration?.toString() || "all"}
              onValueChange={(v) =>
                updateFilter("duration", v === "all" ? undefined : Number(v))
              }
            >
              <SelectTrigger className="h-8 text-xs w-[100px]">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {durations.map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d} mois
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Client / Entreprise
            </span>
            <Input
              placeholder="Rechercher..."
              value={filters.clientSearch || ""}
              onChange={(e) => updateFilter("clientSearch", e.target.value || undefined)}
              className="h-8 text-xs w-[140px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Mensualité (€)
            </span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minMonthly ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "minMonthly",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs w-[70px]"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxMonthly ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "maxMonthly",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs w-[70px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsAdvancedFilters;
