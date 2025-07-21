import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, ArrowUpDown, ArrowDown, ArrowUp, RefreshCw, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEquipmentTracking, createEquipmentTracking, getInventoryProducts, getProfiles } from "@/services/inventoryService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const EquipmentTracking: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tracking = [], isLoading, refetch } = useQuery({
    queryKey: ["equipment-tracking"],
    queryFn: () => getEquipmentTracking(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: getInventoryProducts,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });

  const createTrackingMutation = useMutation({
    mutationFn: createEquipmentTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      setIsDialogOpen(false);
      toast.success("Mouvement d'équipement enregistré avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement du mouvement");
      console.error('Error creating tracking:', error);
    },
  });

  const [formData, setFormData] = useState({
    equipment_id: "",
    movement_type: "",
    from_location: "",
    to_location: "",
    from_user_id: "",
    to_user_id: "",
    notes: "",
  });

  const filteredTracking = tracking.filter((item: any) => {
    const matchesSearch = 
      item.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.from_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.to_location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || item.movement_type === filterType;
    const matchesEquipment = !selectedEquipment || selectedEquipment === "all" || item.equipment_id === selectedEquipment;
    
    return matchesSearch && matchesFilter && matchesEquipment;
  });

  const handleCreateTracking = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipment_id || !formData.movement_type) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    createTrackingMutation.mutate({
      ...formData,
      movement_type: formData.movement_type as any,
      created_by: "current-user-id", // À remplacer par l'ID utilisateur actuel
      company_id: "current-company-id", // À remplacer par l'ID entreprise actuelle
    });
  };

  const getMovementTypeLabel = (type: string) => {
    const types = {
      'in': 'Entrée',
      'out': 'Sortie',
      'transfer': 'Transfert',
      'maintenance': 'Maintenance',
      'return': 'Retour',
      'assignment': 'Attribution',
      'status_change': 'Changement statut',
      'location_change': 'Changement lieu',
    };
    return types[type as keyof typeof types] || type;
  };

  const getMovementTypeBadge = (type: string) => {
    const variants = {
      'in': 'default',
      'out': 'secondary',
      'transfer': 'outline',
      'maintenance': 'destructive',
      'return': 'default',
      'assignment': 'default',
      'status_change': 'secondary',
      'location_change': 'outline',
    };
    return variants[type as keyof typeof variants] || 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suivi des Équipements</h3>
          <p className="text-sm text-muted-foreground">
            Historique complet des mouvements et changements d'état
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Mouvement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enregistrer un Mouvement</DialogTitle>
              <DialogDescription>
                Ajouter un nouveau mouvement ou changement d'état pour un équipement
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTracking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment">Équipement *</Label>
                  <Select value={formData.equipment_id} onValueChange={(value) => setFormData({...formData, equipment_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement_type">Type de Mouvement *</Label>
                  <Select value={formData.movement_type} onValueChange={(value) => setFormData({...formData, movement_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrée</SelectItem>
                      <SelectItem value="out">Sortie</SelectItem>
                      <SelectItem value="transfer">Transfert</SelectItem>
                      <SelectItem value="assignment">Attribution</SelectItem>
                      <SelectItem value="return">Retour</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_location">Lieu de Départ</Label>
                  <Input
                    id="from_location"
                    placeholder="Lieu actuel"
                    value={formData.from_location}
                    onChange={(e) => setFormData({...formData, from_location: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to_location">Lieu de Destination</Label>
                  <Input
                    id="to_location"
                    placeholder="Nouveau lieu"
                    value={formData.to_location}
                    onChange={(e) => setFormData({...formData, to_location: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_user">Utilisateur Actuel</Label>
                  <Select value={formData.from_user_id} onValueChange={(value) => setFormData({...formData, from_user_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile: any) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to_user">Nouvel Utilisateur</Label>
                  <Select value={formData.to_user_id} onValueChange={(value) => setFormData({...formData, to_user_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile: any) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Détails du mouvement..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createTrackingMutation.isPending}>
                  {createTrackingMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par équipement, lieu, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="in">Entrées</SelectItem>
                <SelectItem value="out">Sorties</SelectItem>
                <SelectItem value="transfer">Transferts</SelectItem>
                <SelectItem value="assignment">Attributions</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les équipements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les équipements</SelectItem>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table des mouvements */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Mouvements</CardTitle>
          <CardDescription>
            {filteredTracking.length} mouvement(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chargement des mouvements...</p>
            </div>
          ) : filteredTracking.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun mouvement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Vers</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTracking.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.equipment?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMovementTypeBadge(item.movement_type) as any}>
                          {getMovementTypeLabel(item.movement_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.from_location && (
                            <div className="text-sm">{item.from_location}</div>
                          )}
                          {item.from_user && (
                            <div className="text-xs text-muted-foreground">
                              {item.from_user.first_name} {item.from_user.last_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.to_location && (
                            <div className="text-sm">{item.to_location}</div>
                          )}
                          {item.to_user && (
                            <div className="text-xs text-muted-foreground">
                              {item.to_user.first_name} {item.to_user.last_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.creator && (
                          <div className="text-sm">
                            {item.creator.first_name} {item.creator.last_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={item.notes}>
                          {item.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentTracking;