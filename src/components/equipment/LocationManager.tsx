import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Building2, ChevronRight } from "lucide-react";

interface LocationManagerProps {
  clientId: string;
  companyId: string;
}

const LocationManager: React.FC<LocationManagerProps> = ({ clientId, companyId }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ site_name: "", location_name: "", address: "", city: "" });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["equipment-locations", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_locations")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("site_name");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipment_locations").insert({
        client_id: clientId,
        company_id: companyId,
        site_name: form.site_name,
        location_name: form.location_name || null,
        address: form.address || null,
        city: form.city || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-locations"] });
      toast.success("Emplacement créé");
      setForm({ site_name: "", location_name: "", address: "", city: "" });
      setDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_locations")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-locations"] });
      toast.success("Emplacement supprimé");
    },
  });

  // Group by site
  const grouped = locations.reduce<Record<string, typeof locations>>((acc, loc) => {
    if (!acc[loc.site_name]) acc[loc.site_name] = [];
    acc[loc.site_name].push(loc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Emplacements
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel emplacement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom du site *</Label>
                <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} placeholder="Ex: Siège social" />
              </div>
              <div>
                <Label>Emplacement (optionnel)</Label>
                <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="Ex: Étage 2 - Bureau 204" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => createLocation.mutate()} disabled={!form.site_name || createLocation.isPending} className="w-full">
                Créer l'emplacement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-20 bg-muted rounded-xl animate-pulse" />
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucun emplacement défini</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([site, locs]) => (
            <Card key={site} className="border-0 shadow-sm rounded-xl">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{site}</span>
                </div>
                <div className="pl-6 space-y-1">
                  {locs.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span>{loc.location_name || "—"}</span>
                        {loc.city && <span className="text-muted-foreground">· {loc.city}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteLocation.mutate(loc.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationManager;
