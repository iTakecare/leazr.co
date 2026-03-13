import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchPartnerProviderLinks,
  addPartnerProviderLink,
  removePartnerProviderLink,
} from "@/services/partnerService";
import { fetchExternalProviders } from "@/services/externalProviderService";
import type { Partner } from "@/types/partner";

interface Props {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

const PartnerProviderManager: React.FC<Props> = ({ partner, open, onOpenChange, companyId }) => {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [cardTitle, setCardTitle] = useState("");

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["partner-provider-links", partner.id],
    queryFn: () => fetchPartnerProviderLinks(partner.id),
    enabled: open,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["external-providers", companyId],
    queryFn: () => fetchExternalProviders(companyId),
    enabled: open,
  });

  const linkedProviderIds = new Set(links.map((l) => l.provider_id));
  const availableProviders = providers.filter((p) => !linkedProviderIds.has(p.id));

  const addMutation = useMutation({
    mutationFn: () =>
      addPartnerProviderLink(partner.id, selectedProviderId, cardTitle || undefined as any, [], links.length),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-provider-links", partner.id] });
      toast.success("Prestataire lié");
      setSelectedProviderId("");
      setCardTitle("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: removePartnerProviderLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-provider-links", partner.id] });
      toast.success("Lien supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!selectedProviderId) {
      toast.error("Sélectionnez un prestataire");
      return;
    }
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prestataires externes — {partner.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add form */}
          {availableProviders.length > 0 && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Prestataire</Label>
                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un prestataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Titre de la carte (optionnel)</Label>
                <Input
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="Ex: Téléphonie"
                />
              </div>
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          )}

          {/* Linked providers list */}
          {linksLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun prestataire lié à ce partenaire.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestataire</TableHead>
                    <TableHead>Titre carte</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {link.provider?.logo_url && (
                            <img src={link.provider.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                          )}
                          {link.provider?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>{link.card_title || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Retirer ce prestataire ?")) {
                              removeMutation.mutate(link.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerProviderManager;
