import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { PenLine, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useFinanceurContext } from '@/context/FinanceurContext';
import {
  AuthorizedSigner, createAuthorizedSigner, deleteAuthorizedSigner,
  getAuthorizedSigners, updateAuthorizedSigner,
} from '@/services/signatureCeremonyService';

const emptyForm: Partial<AuthorizedSigner> = {
  name: '', title: '', email: '', phone: '',
  is_default: false, power_of_attorney_url: '', notes: '', is_active: true,
};

/**
 * Registre des signataires autorisés du financeur : le gérant (signataire par
 * défaut) et les délégués disposant d'un pouvoir de signature. Utilisé pour
 * l'étape « financeur » des cérémonies (et le futur routage itsme/OKSign).
 */
const FinanceurSigners: React.FC = () => {
  const { financeurId } = useFinanceurContext();
  const [signers, setSigners] = useState<AuthorizedSigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AuthorizedSigner | null>(null);
  const [form, setForm] = useState<Partial<AuthorizedSigner>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setSigners(await getAuthorizedSigners());
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, is_default: signers.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (s: AuthorizedSigner) => {
    setEditing(s);
    setForm({ ...s });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!financeurId) return;
    try {
      setSaving(true);
      if (editing) {
        await updateAuthorizedSigner(editing.id, {
          name: form.name, title: form.title, email: form.email, phone: form.phone,
          is_default: form.is_default, power_of_attorney_url: form.power_of_attorney_url,
          notes: form.notes, is_active: form.is_active,
        });
      } else {
        await createAuthorizedSigner(financeurId, form);
      }
      // Un seul signataire par défaut
      if (form.is_default) {
        const others = signers.filter((s) => s.id !== editing?.id && s.is_default);
        await Promise.all(others.map((s) => updateAuthorizedSigner(s.id, { is_default: false })));
      }
      toast.success(editing ? 'Signataire mis à jour' : 'Signataire ajouté');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: AuthorizedSigner) => {
    if (!window.confirm(`Supprimer le signataire « ${s.name} » ?`)) return;
    try {
      await deleteAuthorizedSigner(s.id);
      toast.success('Signataire supprimé');
      await load();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenLine className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Signataires autorisés</h1>
            <p className="text-sm text-muted-foreground">
              Gérant et délégués avec pouvoir de signature — utilisés pour la contre-signature
              des contrats (et le routage itsme dès l'activation d'OKSign)
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau signataire
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Pouvoir</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : signers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucun signataire — ajoutez au minimum le gérant (signataire par défaut).
                  </TableCell>
                </TableRow>
              ) : signers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.name}
                    {s.is_default && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> défaut
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{s.title || '—'}</TableCell>
                  <TableCell>
                    <div className="text-sm">{s.email || '—'}</div>
                    <div className="text-xs text-muted-foreground">{s.phone || ''}</div>
                  </TableCell>
                  <TableCell>
                    {s.power_of_attorney_url ? (
                      <a href={s.power_of_attorney_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                        Document
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">{s.is_default ? 'Gérant' : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'default' : 'secondary'}>
                      {s.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? 'Modifier le signataire' : 'Nouveau signataire'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom complet *</Label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Fonction</Label>
              <Input placeholder="ex : Gérant, Directeur commercial" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Email (lié à itsme)</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone (lié à itsme)</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Pouvoir de signature (URL du document signé)</Label>
              <Input placeholder="Lien vers le pouvoir signé (non requis pour le gérant)" value={form.power_of_attorney_url || ''} onChange={(e) => setForm({ ...form, power_of_attorney_url: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="is_default" className="h-4 w-4"
                checked={!!form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              <Label htmlFor="is_default">Signataire par défaut</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="is_active" className="h-4 w-4"
                checked={form.is_active !== false}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Actif</Label>
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

export default FinanceurSigners;
