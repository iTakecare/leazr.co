import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Check,
  FileText,
  Users,
  Cpu,
  PackageSearch,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  suggestEquipmentFromUsage,
  type EquipmentSuggestion,
  type UsageInput,
  type UsageMobility,
} from "@/services/offers/suggestEquipmentFromUsage";

// Besoins spécifiques proposés en cases à cocher (texte envoyé tel quel à l'IA).
const NEED_OPTIONS = [
  "Deuxième écran",
  "Station d'accueil",
  "RAM élevée",
  "Carte graphique dédiée (GPU)",
  "Grand stockage SSD",
  "Écran haute résolution",
  "Autonomie longue",
  "Légèreté / ultraportable",
  "Webcam / visioconférence",
  "Sécurité renforcée",
];

// Étapes du wizard. La dernière (review) est atteinte après l'appel IA.
const STEPS = [
  { key: "context", label: "Besoin", icon: FileText },
  { key: "team", label: "Équipe", icon: Users },
  { key: "usage", label: "Usage", icon: Cpu },
  { key: "review", label: "Matériel", icon: PackageSearch },
] as const;

interface UsageConfiguratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  /** Appelé avec les suggestions retenues (quantités déjà ajustées par l'utilisateur). */
  onConfirm: (suggestions: EquipmentSuggestion[]) => void;
}

const formatEUR = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UsageConfiguratorDialog = ({
  open,
  onOpenChange,
  companyId,
  onConfirm,
}: UsageConfiguratorDialogProps) => {
  const [step, setStep] = useState(0); // 0..3 (3 = review)
  const [loading, setLoading] = useState(false);

  // Champs du formulaire d'usage
  const [description, setDescription] = useState("");
  const [profile, setProfile] = useState("");
  const [seats, setSeats] = useState<string>("");
  const [software, setSoftware] = useState("");
  const [mobility, setMobility] = useState<UsageMobility | "">("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<string>("");

  // Résultat IA
  const [rationale, setRationale] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<EquipmentSuggestion & { selected: boolean }>>([]);

  const resetAll = () => {
    setStep(0);
    setLoading(false);
    setDescription("");
    setProfile("");
    setSeats("");
    setSoftware("");
    setMobility("");
    setNeeds([]);
    setMonthlyBudget("");
    setRationale("");
    setWarnings([]);
    setRows([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetAll();
    onOpenChange(next);
  };

  const toggleNeed = (need: string) => {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );
  };

  const buildUsage = (): UsageInput => {
    const usage: UsageInput = {};
    if (description.trim()) usage.description = description.trim();
    if (profile.trim()) usage.profile = profile.trim();
    const seatsNum = parseInt(seats, 10);
    if (!isNaN(seatsNum) && seatsNum > 0) usage.seats = seatsNum;
    if (software.trim()) usage.software = software.trim();
    if (mobility) usage.mobility = mobility;
    if (needs.length > 0) usage.needs = needs;
    const budgetNum = parseFloat(monthlyBudget.replace(",", "."));
    if (!isNaN(budgetNum) && budgetNum > 0) usage.monthlyBudget = budgetNum;
    return usage;
  };

  const hasAnyInput = () => Object.keys(buildUsage()).length > 0;

  const handleGenerate = async () => {
    if (!hasAnyInput()) {
      toast.error("Renseigne au moins un élément (besoin, postes, usage…)");
      return;
    }
    setLoading(true);
    try {
      const result = await suggestEquipmentFromUsage(buildUsage(), companyId);
      setRationale(result.rationale);
      setWarnings(result.warnings);
      setRows(result.suggestions.map((s) => ({ ...s, selected: true })));
      setStep(3);
      if (result.suggestions.length === 0) {
        toast.warning(
          result.rationale || "L'IA n'a trouvé aucun produit adapté dans le catalogue.",
        );
      }
    } catch (err) {
      toast.error((err as Error).message || "Échec de la suggestion IA");
    } finally {
      setLoading(false);
    }
  };

  const updateRowQuantity = (productId: string, quantity: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.product_id === productId ? { ...r, quantity: Math.max(1, quantity) } : r,
      ),
    );
  };

  const toggleRow = (productId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.product_id === productId ? { ...r, selected: !r.selected } : r)),
    );
  };

  const selectedRows = rows.filter((r) => r.selected);
  const totalMonthly = selectedRows.reduce(
    (sum, r) => sum + r.monthly_price * r.quantity,
    0,
  );

  const handleConfirm = () => {
    if (selectedRows.length === 0) {
      toast.error("Sélectionne au moins un produit à ajouter.");
      return;
    }
    onConfirm(selectedRows.map(({ selected, ...rest }) => rest));
    handleOpenChange(false);
  };

  // ---- Rendu des étapes ----
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="uc-description">Décris le besoin du client</Label>
              <Textarea
                id="uc-description"
                rows={5}
                autoFocus
                placeholder="Ex : Équipe de 3 graphistes travaillant sur de gros fichiers vidéo 4K, plus un poste d'accueil bureautique léger. Besoin de mobilité pour 2 d'entre eux…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Plus la description est précise, meilleure sera la suggestion. Tu pourras
                tout ajuster ensuite.
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uc-seats">Nombre de personnes / postes</Label>
                <Input
                  id="uc-seats"
                  type="number"
                  min={1}
                  placeholder="Ex : 5"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uc-mobility">Mobilité</Label>
                <Select value={mobility} onValueChange={(v) => setMobility(v as UsageMobility)}>
                  <SelectTrigger id="uc-mobility">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sédentaire (poste fixe)</SelectItem>
                    <SelectItem value="nomadic">Nomade (déplacements)</SelectItem>
                    <SelectItem value="hybrid">Hybride (bureau + télétravail)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uc-profile">Profil / métier</Label>
              <Input
                id="uc-profile"
                placeholder="Ex : graphiste, développeur, comptable, accueil…"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="uc-software">Logiciels / applications</Label>
              <Input
                id="uc-software"
                placeholder="Ex : Adobe Creative Suite, AutoCAD, Office 365…"
                value={software}
                onChange={(e) => setSoftware(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Besoins spécifiques</Label>
              <div className="grid grid-cols-2 gap-2">
                {NEED_OPTIONS.map((need) => (
                  <label
                    key={need}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={needs.includes(need)}
                      onCheckedChange={() => toggleNeed(need)}
                    />
                    {need}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uc-budget">Budget mensuel indicatif (optionnel)</Label>
              <Input
                id="uc-budget"
                type="text"
                inputMode="decimal"
                placeholder="Ex : 250 (€/mois pour l'ensemble)"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3 py-1">
            {rationale && (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Analyse : </span>
                {rationale}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                {warnings.map((w, i) => (
                  <div key={i}>⚠️ {w}</div>
                ))}
              </div>
            )}
            {rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucun produit adapté n'a été trouvé dans le catalogue.
                Reviens en arrière pour préciser le besoin.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.product_id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                      row.selected ? "bg-background" : "bg-muted/40 opacity-60",
                    )}
                  >
                    <Checkbox
                      className="mt-1"
                      checked={row.selected}
                      onCheckedChange={() => toggleRow(row.product_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{row.name}</span>
                        {row.brand && (
                          <Badge variant="secondary" className="text-xs">
                            {row.brand}
                          </Badge>
                        )}
                        {row.category && (
                          <Badge variant="outline" className="text-xs">
                            {row.category}
                          </Badge>
                        )}
                      </div>
                      {row.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{row.reason}</p>
                      )}
                      <div className="text-sm mt-1">
                        {row.monthly_price > 0 ? (
                          <span className="text-primary font-medium">
                            {formatEUR(row.monthly_price)} €/mois{" "}
                            <span className="text-muted-foreground font-normal">
                              × {row.quantity} = {formatEUR(row.monthly_price * row.quantity)} €/mois
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Mensualité à calculer ({formatEUR(row.price)} € PV)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Label
                        htmlFor={`qty-${row.product_id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Qté
                      </Label>
                      <Input
                        id={`qty-${row.product_id}`}
                        type="number"
                        min={1}
                        className="w-20"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRowQuantity(row.product_id, parseInt(e.target.value, 10) || 1)
                        }
                        disabled={!row.selected}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedRows.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{selectedRows.length} produit(s) sélectionné(s)</span>
                  <span className="text-primary">
                    Total indicatif : {formatEUR(totalMonthly)} €/mois
                  </span>
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistant de configuration (Wizard)
          </DialogTitle>
          <DialogDescription>
            Décris l'usage, l'assistant sélectionne le matériel du catalogue et l'ajoute à l'offre.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = idx < step;
            const active = idx === step;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors",
                      active && "border-primary bg-primary text-primary-foreground",
                      done && "border-primary bg-primary/10 text-primary",
                      !active && !done && "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      active ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 mx-2",
                      idx < step ? "bg-primary" : "bg-muted-foreground/20",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-4 -mr-4">{renderStep()}</ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 0 && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
          )}
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>
          )}

          {step < 2 && (
            <Button onClick={() => setStep((s) => s + 1)}>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Suggérer l'équipement
                </>
              )}
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleConfirm} disabled={selectedRows.length === 0}>
              Ajouter à l'offre
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsageConfiguratorDialog;
