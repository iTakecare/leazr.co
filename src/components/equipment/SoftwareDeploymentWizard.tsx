import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Apple, MonitorSmartphone, Package, CheckCircle, Loader2, Cpu, ArrowRight, ArrowLeft } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  platform?: string; // 'mac' | 'windows' | unknown
  assignedTo?: string;
  contractRef?: string;
}

interface SoftwareDeploymentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
}

const SoftwareDeploymentWizard: React.FC<SoftwareDeploymentWizardProps> = ({ open, onOpenChange, equipment }) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);

  // Detect platform from equipment name
  const detectPlatform = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("mac") || lower.includes("apple") || lower.includes("imac") || lower.includes("macbook")) return "mac";
    if (lower.includes("windows") || lower.includes("pc") || lower.includes("dell") || lower.includes("hp") || lower.includes("lenovo")) return "windows";
    return "both";
  };

  const equipPlatform = equipment.platform || detectPlatform(equipment.name);

  const { data: software = [] } = useQuery({
    queryKey: ["software-catalog-active", companyId, equipPlatform],
    queryFn: async () => {
      let query = supabase
        .from("software_catalog")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");

      if (equipPlatform !== "both") {
        query = query.in("platform", [equipPlatform, "both"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/mdm-deploy-software`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          software_ids: selectedSoftware,
          company_id: companyId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur lors du déploiement");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["software-deployments"] });
      if (data.mode === "simulation") {
        toast({
          title: "Demandes enregistrées (simulation)",
          description: "Aucun MDM configuré. Les demandes ont été enregistrées pour traitement ultérieur.",
        });
      } else {
        toast({ title: "Déploiement lancé", description: `${selectedSoftware.length} logiciel(s) en cours d'installation` });
      }
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedSoftware([]);
    onOpenChange(false);
  };

  const toggleSoftware = (id: string) => {
    setSelectedSoftware((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === "mac") return <Apple className="h-4 w-4" />;
    if (platform === "windows") return <Monitor className="h-4 w-4" />;
    return <MonitorSmartphone className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Installer des logiciels
          </DialogTitle>
          <DialogDescription>
            Étape {step} sur 3
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Machine cible</h3>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Cpu className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{equipment.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs gap-1">
                      {getPlatformIcon(equipPlatform)}
                      {equipPlatform === "mac" ? "macOS" : equipPlatform === "windows" ? "Windows" : "Multi-plateforme"}
                    </Badge>
                    {equipment.assignedTo && (
                      <Badge variant="secondary" className="text-xs">Assigné à: {equipment.assignedTo}</Badge>
                    )}
                    {equipment.contractRef && (
                      <Badge variant="secondary" className="text-xs">Contrat: {equipment.contractRef}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Sélectionnez les logiciels à installer</h3>
            {software.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun logiciel disponible pour cette plateforme</p>
                <p className="text-xs mt-1">Ajoutez des logiciels dans les paramètres</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {software.map((sw: any) => (
                  <label
                    key={sw.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSoftware.includes(sw.id) ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedSoftware.includes(sw.id)}
                      onCheckedChange={() => toggleSoftware(sw.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(sw.platform)}
                        <span className="text-sm font-medium">{sw.name}</span>
                        {sw.version && <Badge variant="outline" className="text-xs">{sw.version}</Badge>}
                      </div>
                      {sw.description && <p className="text-xs text-muted-foreground mt-0.5">{sw.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Confirmation</h3>
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Machine</p>
                <p className="text-sm font-medium">{equipment.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Logiciels à installer ({selectedSoftware.length})</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {software
                    .filter((sw: any) => selectedSoftware.includes(sw.id))
                    .map((sw: any) => (
                      <Badge key={sw.id} variant="secondary" className="text-xs gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {sw.name}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              L'installation sera lancée via le MDM configuré. Sans MDM, les demandes seront enregistrées pour traitement ultérieur.
            </p>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Annuler</Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && selectedSoftware.length === 0}
                className="gap-1"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => deployMutation.mutate()}
                disabled={deployMutation.isPending}
                className="gap-1"
              >
                {deployMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Déploiement...</>
                ) : (
                  "Lancer l'installation"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SoftwareDeploymentWizard;
