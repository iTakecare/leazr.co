import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import {
  FileText,
  Users,
  Phone,
  Building2,
  Euro,
  Search,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Status badge colors ──────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:                   { label: "Brouillon",      cls: "bg-slate-100 text-slate-600" },
  sent:                    { label: "Envoyé",          cls: "bg-blue-100 text-blue-700"   },
  internal_docs_requested: { label: "Docs demandés",  cls: "bg-amber-100 text-amber-700" },
  internal_approved:       { label: "Approuvé ITC",   cls: "bg-emerald-100 text-emerald-700" },
  leaser_introduced:       { label: "Chez le leaser", cls: "bg-violet-100 text-violet-700" },
  leaser_docs_requested:   { label: "Docs leaser",    cls: "bg-orange-100 text-orange-700" },
  leaser_approved:         { label: "Accordé",        cls: "bg-green-100 text-green-700"  },
  financed:                { label: "Financé",        cls: "bg-sky-100 text-sky-700"       },
  accepted:                { label: "Accepté",        cls: "bg-teal-100 text-teal-700"     },
  rejected:                { label: "Rejeté",         cls: "bg-red-100 text-red-600"       },
  without_follow_up:       { label: "Sans suite",     cls: "bg-slate-100 text-slate-400"   },
};

interface SearchResult {
  id: string;
  type: "offer" | "client";
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  amount?: number;
}

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { companyId } = useMultiTenant();
  const { navigateToAdmin } = useRoleNavigation();

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const search = useCallback(
    async (q: string) => {
      if (!companyId || q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const pattern = `%${q.trim()}%`;
        const [offersRes, clientsRes] = await Promise.all([
          supabase
            .from("offers")
            .select("id, client_name, dossier_number, workflow_status, monthly_payment, amount")
            .eq("company_id", companyId)
            .or(`client_name.ilike.${pattern},dossier_number.ilike.${pattern},client_company.ilike.${pattern}`)
            .limit(8),
          supabase
            .from("clients")
            .select("id, name, email, company")
            .eq("company_id", companyId)
            .or(`name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`)
            .limit(5),
        ]);

        const offerResults: SearchResult[] = (offersRes.data ?? []).map((o: any) => ({
          id: o.id,
          type: "offer",
          title: o.client_name ?? "—",
          subtitle: o.dossier_number ?? undefined,
          status: o.workflow_status,
          amount: o.monthly_payment,
        }));

        const clientResults: SearchResult[] = (clientsRes.data ?? []).map((c: any) => ({
          id: c.id,
          type: "client",
          title: c.name ?? c.company ?? "—",
          subtitle: c.email ?? undefined,
          meta: c.company ?? undefined,
        }));

        setResults([...offerResults, ...clientResults]);
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (result.type === "offer") {
      navigateToAdmin(`offers/${result.id}`);
    } else {
      navigateToAdmin(`clients/${result.id}`);
    }
  };

  const offerResults = results.filter((r) => r.type === "offer");
  const clientResults = results.filter((r) => r.type === "client");

  return (
    <>
      {/* Trigger button — sidebar style (dark background) */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 h-8 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-xs text-white/70 hover:text-white transition-colors"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">Rechercher…</span>
        <kbd className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono shrink-0">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher un dossier, client, numéro…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          {loading && (
            <div className="py-6 text-center text-sm text-slate-400">Recherche…</div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>Aucun résultat pour « {query} »</CommandEmpty>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-slate-400">
              Tapez au moins 2 caractères pour rechercher
            </div>
          )}

          {offerResults.length > 0 && (
            <CommandGroup heading="Demandes">
              {offerResults.map((r) => {
                const statusMeta = r.status ? STATUS_LABELS[r.status] : null;
                return (
                  <CommandItem
                    key={r.id}
                    value={`${r.title} ${r.subtitle ?? ""}`}
                    onSelect={() => handleSelect(r)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="p-1.5 bg-slate-100 rounded shrink-0">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{r.title}</span>
                        {statusMeta && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.subtitle && (
                          <span className="text-xs text-slate-400 font-mono">{r.subtitle}</span>
                        )}
                        {r.amount && r.amount > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {r.amount.toFixed(0)} €/m
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {clientResults.length > 0 && offerResults.length > 0 && <CommandSeparator />}

          {clientResults.length > 0 && (
            <CommandGroup heading="Clients">
              {clientResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.title} ${r.subtitle ?? ""}`}
                  onSelect={() => handleSelect(r)}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="p-1.5 bg-blue-50 rounded shrink-0">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
