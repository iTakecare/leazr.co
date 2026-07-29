import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3, Plus, Trash2, Save, Star } from 'lucide-react';
import { useFinanceurContext } from '@/context/FinanceurContext';
import {
  getCoefficientGrids, createCoefficientGrid, updateCoefficientGrid,
  deleteCoefficientGrid, saveGridRanges,
} from '@/services/financeurService';
import { CoefficientGrid, CoefficientGridRange } from '@/types/financeur';

const FinanceurGrids: React.FC = () => {
  const { financeurId } = useFinanceurContext();
  const [grids, setGrids] = useState<CoefficientGrid[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ranges, setRanges] = useState<CoefficientGridRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const selected = grids.find((g) => g.id === selectedId) || null;

  const load = async (keepSelection = false) => {
    try {
      setLoading(true);
      const g = await getCoefficientGrids();
      setGrids(g);
      const target = keepSelection && selectedId
        ? g.find((x) => x.id === selectedId)
        : g[0];
      setSelectedId(target?.id || null);
      setRanges(target?.ranges ? [...target.ranges] : []);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur de chargement : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectGrid = (g: CoefficientGrid) => {
    setSelectedId(g.id);
    setRanges(g.ranges ? [...g.ranges] : []);
  };

  const create = async () => {
    if (!newName.trim() || !financeurId) return;
    try {
      const g = await createCoefficientGrid(financeurId, newName.trim(), grids.length === 0);
      toast.success('Grille créée');
      setCreateOpen(false);
      setNewName('');
      await load();
      setSelectedId(g.id);
      setRanges([]);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    }
  };

  const setDefault = async (g: CoefficientGrid) => {
    try {
      await Promise.all(
        grids.map((x) => updateCoefficientGrid(x.id, { is_default: x.id === g.id }))
      );
      toast.success(`« ${g.name} » est la grille par défaut`);
      await load(true);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    }
  };

  const removeGrid = async (g: CoefficientGrid) => {
    if (!window.confirm(`Supprimer la grille « ${g.name} » ? Les partenaires qui l'utilisent n'auront plus de grille.`)) return;
    try {
      await deleteCoefficientGrid(g.id);
      toast.success('Grille supprimée');
      setSelectedId(null);
      await load();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    }
  };

  const updateRange = (idx: number, field: keyof CoefficientGridRange, value: string) => {
    setRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value === '' ? 0 : Number(value) } : r)));
  };

  const addRange = () => {
    const last = ranges[ranges.length - 1];
    setRanges((prev) => [
      ...prev,
      {
        min: last ? Number(last.max) + 0.01 : 500,
        max: last ? Number(last.max) * 2 : 2500,
        duration_months: last ? Number(last.duration_months) : 36,
        coefficient: last ? Number(last.coefficient) : 3.2,
      },
    ]);
  };

  const removeRange = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveRanges = async () => {
    if (!selected) return;
    for (const r of ranges) {
      if (Number(r.min) > Number(r.max)) {
        toast.error(`Tranche invalide : min (${r.min}) > max (${r.max})`);
        return;
      }
      if (Number(r.coefficient) <= 0) {
        toast.error('Chaque tranche doit avoir un coefficient positif');
        return;
      }
    }
    try {
      setSaving(true);
      await saveGridRanges(selected.id, ranges);
      toast.success('Tranches enregistrées');
      await load(true);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Grilles de coefficients</h1>
            <p className="text-sm text-muted-foreground">
              Tranches montant × durée attribuables aux partenaires, brokers et clients
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle grille
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Grilles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : grids.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune grille — créez-en une pour permettre le dépôt de demandes.</p>
            ) : grids.map((g) => (
              <div
                key={g.id}
                onClick={() => selectGrid(g)}
                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedId === g.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {g.name}
                    {g.is_default && <Badge variant="secondary" className="text-[10px]">défaut</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.ranges?.length || 0} tranche{(g.ranges?.length || 0) > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!g.is_default && (
                    <Button
                      variant="ghost" size="sm" title="Définir par défaut"
                      onClick={(e) => { e.stopPropagation(); setDefault(g); }}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" title="Supprimer"
                    onClick={(e) => { e.stopPropagation(); removeGrid(g); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selected ? `Tranches — ${selected.name}` : 'Tranches'}
            </CardTitle>
            {selected && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addRange}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tranche
                </Button>
                <Button size="sm" onClick={saveRanges} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sélectionnez une grille</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Montant min (€)</TableHead>
                    <TableHead>Montant max (€)</TableHead>
                    <TableHead>Durée (mois)</TableHead>
                    <TableHead>Coefficient</TableHead>
                    <TableHead>Mensualité / 1 000 €</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Aucune tranche — ajoutez-en pour activer la grille
                      </TableCell>
                    </TableRow>
                  ) : ranges.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input type="number" step="0.01" value={r.min} className="w-28"
                          onChange={(e) => updateRange(idx, 'min', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={r.max} className="w-28"
                          onChange={(e) => updateRange(idx, 'max', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="1" value={r.duration_months} className="w-20"
                          onChange={(e) => updateRange(idx, 'duration_months', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.001" value={r.coefficient} className="w-24"
                          onChange={(e) => updateRange(idx, 'coefficient', e.target.value)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(1000 * Number(r.coefficient) / 100).toFixed(2)} €/mois
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeRange(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle grille</DialogTitle></DialogHeader>
          <div>
            <Label>Nom de la grille</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex : Grille standard 2026"
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={create} disabled={!newName.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceurGrids;
