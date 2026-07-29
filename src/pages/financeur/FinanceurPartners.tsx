import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Handshake, Plus, Pencil, UserPlus, Search } from 'lucide-react';
import { useFinanceurContext } from '@/context/FinanceurContext';
import {
  getFinancingPartners, createFinancingPartner, updateFinancingPartner,
  createFinancingPartnerAccount, getCoefficientGrids,
} from '@/services/financeurService';
import { CoefficientGrid, FinancingPartner } from '@/types/financeur';

const emptyForm: Partial<FinancingPartner> = {
  partner_type: 'partner',
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  vat_number: '',
  status: 'active',
  coefficient_grid_id: null,
  notes: '',
};

const FinanceurPartners: React.FC = () => {
  const { financeurId } = useFinanceurContext();
  const [partners, setPartners] = useState<FinancingPartner[]>([]);
  const [grids, setGrids] = useState<CoefficientGrid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancingPartner | null>(null);
  const [form, setForm] = useState<Partial<FinancingPartner>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [creatingAccountId, setCreatingAccountId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getFinancingPartners(), getCoefficientGrids()]);
      setPartners(p);
      setGrids(g);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur de chargement : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => partners.filter((p) =>
      [p.name, p.contact_name, p.email, p.vat_number]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(search.toLowerCase()))
    ),
    [partners, search]
  );

  const gridName = (id?: string | null) => grids.find((g) => g.id === id)?.name || '—';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, coefficient_grid_id: grids.find((g) => g.is_default)?.id || null });
    setDialogOpen(true);
  };

  const openEdit = (p: FinancingPartner) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!financeurId) return;
    try {
      setSaving(true);
      if (editing) {
        await updateFinancingPartner(editing.id, {
          partner_type: form.partner_type,
          name: form.name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          vat_number: form.vat_number,
          status: form.status,
          coefficient_grid_id: form.coefficient_grid_id || null,
          notes: form.notes,
        });
        toast.success('Partenaire mis à jour');
      } else {
        await createFinancingPartner(financeurId, form);
        toast.success('Partenaire créé');
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const createAccount = async (p: FinancingPartner) => {
    try {
      setCreatingAccountId(p.id);
      const res = await createFinancingPartnerAccount(p);
      if (res.success) {
        toast.success(`Invitation envoyée à ${p.email}`);
        await load();
      } else {
        toast.error(res.error || 'Erreur lors de la création du compte');
      }
    } finally {
      setCreatingAccountId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Handshake className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Partenaires & Brokers</h1>
            <p className="text-sm text-muted-foreground">
              Apporteurs de demandes de financement et grilles attribuées
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau partenaire
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, contact, email, TVA)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Grille</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Accès</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun partenaire</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.partner_type === 'broker' ? 'Broker' : 'Partenaire'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.contact_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{p.email || ''}</div>
                  </TableCell>
                  <TableCell>{gridName(p.coefficient_grid_id)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.has_user_account ? (
                      <Badge variant="secondary">Compte créé</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!p.email || creatingAccountId === p.id}
                        onClick={() => createAccount(p)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        {creatingAccountId === p.id ? 'Envoi…' : 'Créer l\'accès'}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom (société) *</Label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.partner_type || 'partner'}
                onValueChange={(v) => setForm({ ...form, partner_type: v as 'partner' | 'broker' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partenaire (fournisseur)</SelectItem>
                  <SelectItem value="broker">Broker (courtier)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={form.status || 'active'}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact</Label>
              <Input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>N° TVA</Label>
              <Input value={form.vat_number || ''} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Grille de coefficients</Label>
              <Select
                value={form.coefficient_grid_id || 'none'}
                onValueChange={(v) => setForm({ ...form, coefficient_grid_id: v === 'none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Aucune grille" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune grille</SelectItem>
                  {grids.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}{g.is_default ? ' (défaut)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Sans grille attribuée, le partenaire ne peut pas déposer de demande.
              </p>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceurPartners;
