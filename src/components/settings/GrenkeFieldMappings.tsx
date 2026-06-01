// Grenke field mappings editor (Phase 3a.2a).
//
// Lets a company admin map Leazr internal values to what Grenke expects in
// the FinancingRequest payload. Three kinds:
//
//   - legal_form    4 hardcoded Leazr entity types → Grenke LegalFormId (11 options
//                   sourced from grenke_reference_data.kind='legalforms')
//   - object_type   Leazr categories table (dynamic per company) → Grenke
//                   ObjectTypeId (~150 options sourced from
//                   grenke_reference_data.kind='objecttypes')
//   - manufacturer  Leazr brands table (dynamic per company) → free-text Grenke
//                   manufacturer string (no enum on Grenke side; we just use
//                   the brand name with proper casing, fallback "Other")
//
// All mappings persist in public.grenke_field_mappings with row-level security
// scoped by company_id. The Settings card calls this component once per
// configured environment so users can review and edit before submitting their
// first offer.

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw, Save, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Hardcoded Leazr entity_type values — these come from the KYC migration
// (20260427180000_add_client_kyc.sql), they're not user-configurable.
const ENTITY_TYPES: Array<{ key: string; label: string }> = [
  { key: "societe", label: "Société (SRL, SA, SPRL, …)" },
  { key: "independant", label: "Indépendant / Sole proprietorship" },
  { key: "asbl", label: "ASBL / Non-profit" },
  { key: "autre", label: "Autre" },
];

interface MappingRow {
  id?: string;
  leazr_key: string;
  grenke_value: string;
  label?: string | null;
}

type Kind = "legal_form" | "object_type" | "manufacturer";

interface GrenkeFieldMappingsProps {
  companyId: string;
}

// Reference data shapes (matching Grenke API responses)
interface LegalFormOption { Id: number; Name: string }
interface ObjectTypeOption { Id: number; Name: string }

interface LeazrOption { id: string; label: string }

export default function GrenkeFieldMappings({ companyId }: GrenkeFieldMappingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mapping rows by kind
  const [legalFormMap, setLegalFormMap] = useState<Record<string, string>>({});
  const [objectTypeMap, setObjectTypeMap] = useState<Record<string, string>>({});
  const [manufacturerMap, setManufacturerMap] = useState<Record<string, string>>({});

  // Reference data (Grenke side)
  const [grenkeLegalForms, setGrenkeLegalForms] = useState<LegalFormOption[]>([]);
  const [grenkeObjectTypes, setGrenkeObjectTypes] = useState<ObjectTypeOption[]>([]);

  // Leazr lists
  const [leazrCategories, setLeazrCategories] = useState<LeazrOption[]>([]);
  // brands list is intentionally NOT loaded here: by default we pass the
  // Leazr brand_name as-is to Grenke (free-text field on their side). We only
  // need to read the existing mapping table for whatever exceptions the user
  // has declared, not enumerate every brand row.
  const [manufacturerOverrides, setManufacturerOverrides] = useState<Array<{ leazr_key: string; label: string; grenke_value: string }>>([]);
  const [addBrandSearch, setAddBrandSearch] = useState("");
  const [addBrandResults, setAddBrandResults] = useState<LeazrOption[]>([]);
  const [addBrandOpen, setAddBrandOpen] = useState(false);

  const [missingRefData, setMissingRefData] = useState(false);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadAll = async () => {
    try {
      setLoading(true);

      // Existing mappings
      const { data: mappings } = await supabase
        .from("grenke_field_mappings")
        .select("kind, leazr_key, grenke_value, label")
        .eq("company_id", companyId);

      const lf: Record<string, string> = {};
      const ot: Record<string, string> = {};
      const mf: Record<string, string> = {};
      const mfOverrides: Array<{ leazr_key: string; label: string; grenke_value: string }> = [];
      for (const row of (mappings ?? []) as MappingRow[] & { kind: Kind }[]) {
        const r = row as unknown as MappingRow & { kind: Kind };
        if (r.kind === "legal_form")   lf[r.leazr_key] = r.grenke_value;
        if (r.kind === "object_type")  ot[r.leazr_key] = r.grenke_value;
        if (r.kind === "manufacturer") {
          mf[r.leazr_key] = r.grenke_value;
          mfOverrides.push({
            leazr_key: r.leazr_key,
            label: r.label ?? r.leazr_key,
            grenke_value: r.grenke_value,
          });
        }
      }
      setLegalFormMap(lf);
      setObjectTypeMap(ot);
      setManufacturerMap(mf);
      setManufacturerOverrides(mfOverrides);

      // Grenke reference data (production only for now)
      const { data: refRows } = await supabase
        .from("grenke_reference_data")
        .select("kind, payload")
        .eq("company_id", companyId)
        .eq("environment", "production");

      let foundLegalforms = false;
      let foundObjecttypes = false;
      for (const r of (refRows ?? []) as Array<{ kind: string; payload: unknown }>) {
        if (r.kind === "legalforms" && Array.isArray(r.payload)) {
          setGrenkeLegalForms(r.payload as LegalFormOption[]);
          foundLegalforms = true;
        }
        if (r.kind === "objecttypes") {
          const items = (r.payload as { Items?: ObjectTypeOption[] })?.Items ?? [];
          setGrenkeObjectTypes(items);
          foundObjecttypes = true;
        }
      }
      setMissingRefData(!foundLegalforms || !foundObjecttypes);

      // Leazr categories
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, translation")
        .eq("company_id", companyId)
        .order("translation");
      setLeazrCategories(((cats ?? []) as Array<{ id: string; name: string; translation: string }>).map((c) => ({
        id: c.id,
        label: c.translation || c.name,
      })));

      // Leazr brands: we DON'T load the whole table here. Pass-through is the
      // default behaviour (the build_offer_payload action sends brand_name
      // as-is). The user only sees brands that already have an override row,
      // plus a search box to add a new one when needed.
    } catch (e) {
      console.error("[GrenkeFieldMappings] load error:", e);
      toast.error("Impossible de charger les mappings");
    } finally {
      setLoading(false);
    }
  };

  const saveMapping = async (
    kind: Kind,
    leazrKey: string,
    grenkeValue: string,
    label?: string,
  ) => {
    try {
      setSaving(true);
      if (!grenkeValue || !grenkeValue.trim()) {
        // Delete the mapping if the user clears the value
        const { error } = await supabase
          .from("grenke_field_mappings")
          .delete()
          .eq("company_id", companyId)
          .eq("kind", kind)
          .eq("leazr_key", leazrKey);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("grenke_field_mappings")
        .upsert(
          {
            company_id: companyId,
            kind,
            leazr_key: leazrKey,
            grenke_value: grenkeValue.trim(),
            label: label ?? null,
          },
          { onConflict: "company_id,kind,leazr_key" },
        );
      if (error) throw error;
    } catch (e) {
      console.error("[GrenkeFieldMappings] save error:", e);
      toast.error("Erreur lors de la sauvegarde");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleLegalFormChange = async (entityType: string, grenkeId: string, label: string) => {
    setLegalFormMap((m) => ({ ...m, [entityType]: grenkeId }));
    await saveMapping("legal_form", entityType, grenkeId, label);
  };

  const handleObjectTypeChange = async (categoryId: string, grenkeId: string, label: string) => {
    setObjectTypeMap((m) => ({ ...m, [categoryId]: grenkeId }));
    await saveMapping("object_type", categoryId, grenkeId, label);
  };

  const handleManufacturerChange = async (brandId: string, manufacturer: string, label: string) => {
    setManufacturerMap((m) => ({ ...m, [brandId]: manufacturer }));
    setManufacturerOverrides((arr) => {
      const trimmed = manufacturer.trim();
      const next = arr.filter((o) => o.leazr_key !== brandId);
      if (trimmed) next.push({ leazr_key: brandId, label, grenke_value: trimmed });
      return next.sort((a, b) => a.label.localeCompare(b.label));
    });
    await saveMapping("manufacturer", brandId, manufacturer, label);
  };

  // Search the brands table on demand — we don't enumerate all brands up-front
  // (there are typically many dozens). Triggered when the user starts typing
  // in the "Ajouter une override" search box.
  const searchBrands = async (query: string) => {
    setAddBrandSearch(query);
    if (!query || query.trim().length < 2) {
      setAddBrandResults([]);
      return;
    }
    try {
      const { data } = await supabase
        .from("brands")
        .select("id, name, translation")
        .eq("company_id", companyId)
        .or(`name.ilike.%${query}%,translation.ilike.%${query}%`)
        .order("translation")
        .limit(20);
      const rows = (data ?? []) as Array<{ id: string; name: string; translation: string }>;
      // Exclude brands that already have an override
      const existing = new Set(manufacturerOverrides.map((o) => o.leazr_key));
      setAddBrandResults(
        rows
          .filter((r) => !existing.has(r.id))
          .map((r) => ({ id: r.id, label: r.translation || r.name })),
      );
    } catch (e) {
      console.error("[GrenkeFieldMappings] brand search error:", e);
    }
  };

  const addOverride = async (brand: LeazrOption) => {
    setManufacturerOverrides((arr) => [
      ...arr,
      { leazr_key: brand.id, label: brand.label, grenke_value: "" },
    ].sort((a, b) => a.label.localeCompare(b.label)));
    setManufacturerMap((m) => ({ ...m, [brand.id]: "" }));
    setAddBrandSearch("");
    setAddBrandResults([]);
    setAddBrandOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-2">
        <Workflow className="h-4 w-4 mt-0.5 text-blue-600" />
        <div className="flex-1">
          <h4 className="text-sm font-medium">Mappings Leazr → Grenke</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Détermine ce que chaque valeur Leazr (forme juridique, catégorie,
            marque) devient quand on l'envoie à Grenke. Les mappings sont
            sauvegardés automatiquement à chaque modification.
          </p>
        </div>
      </div>

      {missingRefData && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Les données de référence Grenke n'ont pas encore été synchronisées.
            Clique sur "Synchroniser les données de référence" plus haut avant
            de configurer les mappings.
          </AlertDescription>
        </Alert>
      )}

      {/* === Legal Form mapping === */}
      <div className="space-y-2 pt-2">
        <Label className="text-xs font-medium">Formes juridiques</Label>
        <div className="rounded border bg-background">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium w-1/2">Leazr</th>
                <th className="p-2 text-left font-medium">Grenke LegalForm</th>
              </tr>
            </thead>
            <tbody>
              {ENTITY_TYPES.map((et) => (
                <tr key={et.key} className="border-b last:border-0">
                  <td className="p-2">{et.label}</td>
                  <td className="p-2">
                    <select
                      value={legalFormMap[et.key] ?? ""}
                      onChange={(e) => void handleLegalFormChange(et.key, e.target.value, et.label)}
                      disabled={grenkeLegalForms.length === 0 || saving}
                      className="h-8 w-full text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="">— non mappé —</option>
                      {grenkeLegalForms.map((lf) => (
                        <option key={lf.Id} value={String(lf.Id)}>
                          {lf.Id} — {lf.Name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* === Object Type mapping === */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Catégories → Types d'objets Grenke</Label>
        {leazrCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucune catégorie Leazr trouvée pour cette company.
          </p>
        ) : (
          <div className="rounded border bg-background">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium w-1/2">Leazr</th>
                  <th className="p-2 text-left font-medium">Grenke ObjectType</th>
                </tr>
              </thead>
              <tbody>
                {leazrCategories.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-2">{c.label}</td>
                    <td className="p-2">
                      <select
                        value={objectTypeMap[c.id] ?? ""}
                        onChange={(e) => void handleObjectTypeChange(c.id, e.target.value, c.label)}
                        disabled={grenkeObjectTypes.length === 0 || saving}
                        className="h-8 w-full text-xs rounded-md border border-input bg-background px-2"
                      >
                        <option value="">— non mappé —</option>
                        {grenkeObjectTypes.map((ot) => (
                          <option key={ot.Id} value={String(ot.Id)}>
                            {ot.Id} — {ot.Name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Separator />

      {/* === Manufacturer overrides === */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Marques → Manufacturers Grenke (overrides)</Label>
        <p className="text-[11px] text-muted-foreground">
          Par défaut, le nom de marque Leazr (<code>brand.name</code>) est envoyé
          tel quel à Grenke. N'ajoute une override que si Grenke attend une
          orthographe différente pour une marque précise (ex. "HP Enterprise" →
          "Hewlett-Packard").
        </p>

        {/* List of existing overrides */}
        {manufacturerOverrides.length > 0 && (
          <div className="rounded border bg-background">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium w-1/2">Marque Leazr</th>
                  <th className="p-2 text-left font-medium">Manufacturer Grenke</th>
                </tr>
              </thead>
              <tbody>
                {manufacturerOverrides.map((o) => (
                  <tr key={o.leazr_key} className="border-b last:border-0">
                    <td className="p-2">{o.label}</td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={manufacturerMap[o.leazr_key] ?? ""}
                        placeholder={o.label}
                        onChange={(e) => setManufacturerMap((m) => ({ ...m, [o.leazr_key]: e.target.value }))}
                        onBlur={(e) => void handleManufacturerChange(o.leazr_key, e.target.value, o.label)}
                        disabled={saving}
                        className="h-8 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new override */}
        {addBrandOpen ? (
          <div className="rounded border bg-background p-2 space-y-2">
            <Input
              type="text"
              placeholder="Rechercher une marque…"
              value={addBrandSearch}
              onChange={(e) => void searchBrands(e.target.value)}
              autoFocus
              className="h-8 text-xs"
            />
            {addBrandResults.length > 0 && (
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {addBrandResults.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => void addOverride(b)}
                      className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted"
                    >
                      {b.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {addBrandSearch.length >= 2 && addBrandResults.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">Aucune marque trouvée.</p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddBrandOpen(false);
                setAddBrandSearch("");
                setAddBrandResults([]);
              }}
              className="text-xs h-7"
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddBrandOpen(true)}
            className="text-xs h-7"
          >
            + Ajouter une override
          </Button>
        )}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Save className="h-3 w-3 animate-pulse" />
          Sauvegarde en cours…
        </div>
      )}
    </div>
  );
}
