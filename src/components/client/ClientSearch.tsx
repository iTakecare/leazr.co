import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, FileText, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { clientColors } from "@/components/client/clientUi";

type Result = { id: string; label: string; sub?: string; icon: React.ReactNode; href: string };

const escapeLike = (s: string) => s.replace(/[%_]/g, (m) => `\\${m}`);

const ClientSearch: React.FC = () => {
  const { navigateToClient } = useRoleNavigation();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const runSearch = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Retire les caractères qui cassent la syntaxe du filtre .or() (virgules/parenthèses).
    const safe = t.replace(/[,()]/g, " ").trim();
    const like = `%${escapeLike(safe)}%`;
    try {
      const [contracts, products] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, contract_number, leaser_name, equipment_description")
          .or(`contract_number.ilike.${like},equipment_description.ilike.${like}`)
          .limit(5),
        supabase.from("products").select("id, name, brand_name").eq("active", true).ilike("name", like).limit(5),
      ]);

      const out: Result[] = [];
      (contracts.data || []).forEach((c: any) =>
        out.push({
          id: `c-${c.id}`,
          label: [c.leaser_name, c.contract_number].filter(Boolean).join(" · ") || "Contrat",
          sub: "Contrat",
          icon: <FileText size={15} color={clientColors.indigo} />,
          href: `contracts/${c.id}`,
        })
      );
      (products.data || []).forEach((p: any) =>
        out.push({
          id: `p-${p.id}`,
          label: p.name,
          sub: ["Catalogue", p.brand_name].filter(Boolean).join(" · "),
          icon: <Package size={15} color={clientColors.violet} />,
          href: `products/${p.id}`,
        })
      );
      setResults(out);
    } catch (e) {
      console.error("Erreur recherche client:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (val: string) => {
    setQ(val);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(val), 280);
  };

  const select = (r: Result) => {
    navigateToClient(r.href);
    setOpen(false);
    setQ("");
    setResults([]);
  };

  return (
    <div ref={ref} className="hidden md:block" style={{ position: "relative", width: 300, maxWidth: "34vw" }}>
      <Search size={16} color="#94A0B4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
      <input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        placeholder="Rechercher un équipement, contrat, facture…"
        style={{
          width: "100%",
          height: 40,
          border: "1px solid #E6E9EF",
          background: "#F6F7F9",
          borderRadius: 11,
          padding: "0 12px 0 36px",
          fontSize: 13,
          color: "#0F172A",
          outline: "none",
        }}
      />
      {loading && <Loader2 size={15} className="animate-spin" color="#94A0B4" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />}

      {open && q.trim().length >= 2 && (
        <div
          className="lzr-scroll"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 8px)",
            maxHeight: 380,
            overflowY: "auto",
            background: "#fff",
            border: `1px solid ${clientColors.border}`,
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(16,24,40,.16)",
            zIndex: 60,
            padding: 6,
          }}
        >
          {!loading && results.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center", color: clientColors.faint, fontSize: 13 }}>
              Aucun résultat pour « {q.trim()} »
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => select(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 11px",
                  border: 0,
                  background: "transparent",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F7F9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "#F4F6FA", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  {r.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#1A2233", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.label}
                  </span>
                  {r.sub && <span style={{ display: "block", fontSize: 11.5, color: clientColors.faint }}>{r.sub}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSearch;
