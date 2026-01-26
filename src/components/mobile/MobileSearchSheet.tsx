import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, X, Clock, User, FileText, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: 'client' | 'offer' | 'contract';
  title: string;
  subtitle?: string;
  meta?: string;
}

interface SearchResultGroup {
  type: 'client' | 'offer' | 'contract';
  label: string;
  icon: React.ElementType;
  results: SearchResult[];
}

interface MobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  results?: SearchResult[];
  recentSearches?: string[];
  onSelectResult?: (result: SearchResult) => void;
  onSelectRecent?: (query: string) => void;
  onClearRecent?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

const MobileSearchSheet: React.FC<MobileSearchSheetProps> = ({
  open,
  onClose,
  onSearch,
  results = [],
  recentSearches = [],
  onSelectResult,
  onSelectRecent,
  onClearRecent,
  isLoading = false,
  placeholder = "Rechercher clients, offres, contrats...",
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus input when sheet opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
    }
  }, [open]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleSelectRecent = (recentQuery: string) => {
    setQuery(recentQuery);
    onSearch(recentQuery);
    onSelectRecent?.(recentQuery);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  // Group results by type
  const groupedResults: SearchResultGroup[] = ([
    {
      type: 'client' as const,
      label: 'Clients',
      icon: User,
      results: results.filter(r => r.type === 'client'),
    },
    {
      type: 'offer' as const,
      label: 'Offres',
      icon: FileText,
      results: results.filter(r => r.type === 'offer'),
    },
    {
      type: 'contract' as const,
      label: 'Contrats',
      icon: Building,
      results: results.filter(r => r.type === 'contract'),
    },
  ]).filter(group => group.results.length > 0);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'client':
        return User;
      case 'offer':
        return FileText;
      case 'contract':
        return Building;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background safe-all"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <button
              onClick={onClose}
              className="touch-target flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="search"
                placeholder={placeholder}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-10 pr-10 h-11 bg-muted border-0"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 touch-target"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(100vh-80px)]">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {/* No query - show recent searches */}
            {!query && !isLoading && (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Recherches récentes
                      </h3>
                      {onClearRecent && (
                        <button
                          onClick={onClearRecent}
                          className="text-xs text-primary font-medium"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((recent, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectRecent(recent)}
                          className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors touch-target"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{recent}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {recentSearches.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Recherchez des clients, offres ou contrats
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {query && !isLoading && (
              <div className="p-4">
                {groupedResults.length > 0 ? (
                  <div className="space-y-6">
                    {groupedResults.map((group) => {
                      const Icon = group.icon;
                      return (
                        <div key={group.type}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-medium text-muted-foreground">
                              {group.label} ({group.results.length})
                            </h3>
                          </div>
                          <div className="space-y-1">
                            {group.results.map((result) => {
                              const ResultIcon = getTypeIcon(result.type);
                              return (
                                <button
                                  key={result.id}
                                  onClick={() => onSelectResult?.(result)}
                                  className="flex items-start gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left touch-target"
                                >
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <ResultIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {result.title}
                                    </p>
                                    {result.subtitle && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {result.subtitle}
                                      </p>
                                    )}
                                    {result.meta && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {result.meta}
                                      </p>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucun résultat pour "{query}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileSearchSheet;
