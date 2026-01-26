import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filterGroups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
  onReset: () => void;
  resultCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onClose,
  filterGroups,
  activeFilters,
  onFiltersChange,
  onReset,
  resultCount,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Rechercher...",
}) => {
  const [localFilters, setLocalFilters] = useState(activeFilters);
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    if (open) {
      setLocalFilters(activeFilters);
      setLocalSearch(searchValue);
    }
  }, [open, activeFilters, searchValue]);

  const handleFilterToggle = (groupId: string, value: string, multiple?: boolean) => {
    setLocalFilters(prev => {
      const currentValues = prev[groupId] || [];
      
      if (multiple) {
        if (currentValues.includes(value)) {
          return {
            ...prev,
            [groupId]: currentValues.filter(v => v !== value),
          };
        } else {
          return {
            ...prev,
            [groupId]: [...currentValues, value],
          };
        }
      } else {
        // Single select - toggle or clear
        if (currentValues.includes(value)) {
          return {
            ...prev,
            [groupId]: [],
          };
        } else {
          return {
            ...prev,
            [groupId]: [value],
          };
        }
      }
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    if (onSearchChange) {
      onSearchChange(localSearch);
    }
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: Record<string, string[]> = {};
    filterGroups.forEach(group => {
      emptyFilters[group.id] = [];
    });
    setLocalFilters(emptyFilters);
    setLocalSearch("");
    onReset();
  };

  const hasActiveFilters = Object.values(localFilters).some(arr => arr.length > 0) || localSearch.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-lg max-h-[85vh] overflow-hidden safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Filtres</h2>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-8"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Réinitialiser
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-muted touch-target"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-4 space-y-6">
              {/* Search */}
              {onSearchChange && (
                <div>
                  <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              {/* Filter Groups */}
              {filterGroups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {group.label}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isSelected = (localFilters[group.id] || []).includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleFilterToggle(group.id, option.value, group.multiple)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-background">
              <Button
                onClick={handleApply}
                className="w-full h-12 text-base"
              >
                Appliquer
                {resultCount !== undefined && (
                  <span className="ml-2 opacity-80">
                    ({resultCount} résultat{resultCount !== 1 ? 's' : ''})
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterSheet;
