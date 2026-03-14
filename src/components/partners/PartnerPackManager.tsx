import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Trash2, Plus, Loader2, Settings2 } from "lucide-react";
import PartnerPackOptionsEditor from "./PartnerPackOptionsEditor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchPartnerPacks,
  addPartnerPack,
  removePartnerPack,
  updatePartnerPack,
} from "@/services/partnerService";
import { getPacks } from "@/services/packService";
import type { Partner } from "@/types/partner";

interface PartnerPackManagerProps {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PartnerPackManager: React.FC<PartnerPackManagerProps> = ({ partner, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [optionsEditorPack, setOptionsEditorPack] = useState<{ id: string; name: string } | null>(null);

  const { data: partnerPacks = [], isLoading: loadingPacks } = useQuery({
    queryKey: ["partner-packs", partner.id],
    queryFn: () => fetchPartnerPacks(partner.id),
    enabled: open,
  });

  const { data: allPacks = [], isLoading: loadingAllPacks } = useQuery({
    queryKey: ["packs"],
    queryFn: getPacks,
    enabled: open,
  });

  // Filter out already assigned packs
  const assignedPackIds = new Set(partnerPacks.map((pp) => pp.pack_id));
  const availablePacks = allPacks.filter((p) => !assignedPackIds.has(p.id) && p.is_active);

  const addMutation = useMutation({
    mutationFn: (packId: string) => addPartnerPack(partner.id, packId, partnerPacks.length),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-packs", partner.id] });
      setSelectedPackId("");
      toast.success("Pack ajouté au partenaire");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: removePartnerPack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-packs", partner.id] });
      toast.success("Pack retiré");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCustomizable = useMutation({
    mutationFn: ({ id, is_customizable }: { id: string; is_customizable: boolean }) =>
      updatePartnerPack(id, { is_customizable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-packs", partner.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!selectedPackId) return;
    addMutation.mutate(selectedPackId);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packs de {partner.name}
          </DialogTitle>
        </DialogHeader>

        {/* Add pack */}
        <div className="flex items-center gap-2">
          <Select value={selectedPackId} onValueChange={setSelectedPackId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loadingAllPacks ? "Chargement..." : "Sélectionner un pack à ajouter"} />
            </SelectTrigger>
            <SelectContent>
              {availablePacks.map((pack) => (
                <SelectItem key={pack.id} value={pack.id}>
                  {pack.name} — {pack.total_monthly_price?.toFixed(2) ?? "0.00"}€/mois
                </SelectItem>
              ))}
              {availablePacks.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Aucun pack disponible
                </div>
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedPackId || addMutation.isPending} size="sm">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Assigned packs list */}
        {loadingPacks ? (
          <div className="text-center py-6 text-muted-foreground">Chargement...</div>
        ) : partnerPacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun pack attribué à ce partenaire.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead>Prix mensuel</TableHead>
                  <TableHead>Personnalisable</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerPacks.map((pp) => (
                  <TableRow key={pp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {pp.pack?.image_url && (
                          <img src={pp.pack.image_url} alt="" className="h-8 w-8 rounded object-contain" />
                        )}
                        <div>
                          <div>{pp.pack?.name || "Pack inconnu"}</div>
                          {!pp.pack?.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pp.pack?.pack_monthly_price
                        ? `${pp.pack.pack_monthly_price.toFixed(2)}€`
                        : pp.pack?.total_monthly_price
                        ? `${pp.pack.total_monthly_price.toFixed(2)}€`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={pp.is_customizable}
                        onCheckedChange={(v) => toggleCustomizable.mutate({ id: pp.id, is_customizable: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {pp.is_customizable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gerer les options"
                            onClick={() => {
                              setOptionsEditorPack({ id: pp.id, name: pp.pack?.name || "Pack" });
                              onOpenChange(false);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Retirer ce pack du partenaire ?")) {
                              removeMutation.mutate(pp.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {optionsEditorPack && (
      <PartnerPackOptionsEditor
        partnerPackId={optionsEditorPack.id}
        packName={optionsEditorPack.name}
        open={!!optionsEditorPack}
        onOpenChange={(v) => { if (!v) setOptionsEditorPack(null); }}
      />
    )}
    </>
  );
};

export default PartnerPackManager;
