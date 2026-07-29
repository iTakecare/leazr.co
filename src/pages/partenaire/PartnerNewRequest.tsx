import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FilePlus2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useFinancingPartner } from '@/components/layout/FinancingPartnerLayout';
import {
  createFinancingRequest, getMyClients, getMyGrid,
} from '@/services/financingPartnerService';
import {
  CoefficientGrid, FinancingRequestEquipmentLine,
  getCoefficientFromGrid, getGridDurations,
} from '@/types/financeur';
import { formatCurrency } from '@/utils/formatters';

interface ClientOption {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  vat_number?: string | null;
}

const emptyLine: FinancingRequestEquipmentLine = { title: '', purchase_price: 0, quantity: 1 };

const PartnerNewRequest: React.FC = () => {
  const { partner, basePrefix } = useFinancingPartner();
  const navigate = useNavigate();

  const [grid, setGrid] = useState<CoefficientGrid | null>(null);
  const [gridLoading, setGridLoading] = useState(true);
  const [existingClients, setExistingClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('new');

  const [client, setClient] = useState({
    name: '', company: '', vat_number: '', contact_name: '',
    email: '', phone: '', address: '', city: '', postal_code: '', country: 'BE',
  });
  const [lines, setLines] = useState<FinancingRequestEquipmentLine[]>([{ ...emptyLine }]);
  const [duration, setDuration] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyGrid(partner)
      .then((g) => {
        setGrid(g);
        const durations = g?.ranges ? getGridDurations(g.ranges) : [];
        if (durations.includes(36)) setDuration(36);
        else if (durations.length > 0) setDuration(durations[0]);
      })
      .catch((e) => toast.error(`Erreur grille : ${e.message}`))
      .finally(() => setGridLoading(false));
    getMyClients().then((c) => setExistingClients(c as ClientOption[])).catch(() => {});
  }, [partner]);

  const durations = useMemo(
    () => (grid?.ranges ? getGridDurations(grid.ranges) : []),
    [grid]
  );

  const amount = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.purchase_price) || 0) * (Number(l.quantity) || 1), 0),
    [lines]
  );

  const coefficient = useMemo(() => {
    if (!grid?.ranges || !duration || amount <= 0) return null;
    return getCoefficientFromGrid(grid.ranges, amount, duration);
  }, [grid, amount, duration]);

  const monthly = coefficient ? Math.round(amount * coefficient) / 100 : null;

  const updateLine = (idx: number, field: keyof FinancingRequestEquipmentLine, value: string) => {
    setLines((prev) => prev.map((l, i) =>
      i === idx
        ? { ...l, [field]: field === 'title' ? value : (value === '' ? 0 : Number(value)) }
        : l
    ));
  };

  const isNewClient = selectedClientId === 'new';

  const canSubmit =
    !submitting &&
    coefficient !== null &&
    amount > 0 &&
    duration !== null &&
    lines.every((l) => l.title.trim() && l.purchase_price > 0 && l.quantity > 0) &&
    (isNewClient ? client.name.trim() || client.company.trim() : true);

  const submit = async () => {
    if (!canSubmit || !duration) return;
    try {
      setSubmitting(true);
      const clientPayload = isNewClient
        ? { ...client, name: client.name.trim() || client.company.trim() }
        : { id: selectedClientId, name: existingClients.find((c) => c.id === selectedClientId)?.name || '' };
      const offerId = await createFinancingRequest(
        clientPayload,
        lines.map((l) => ({ title: l.title.trim(), purchase_price: Number(l.purchase_price), quantity: Number(l.quantity) })),
        duration,
        remarks.trim() || undefined
      );
      toast.success('Demande de financement envoyée');
      navigate(`${basePrefix}/requests/${offerId}`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (gridLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!grid || !grid.ranges || grid.ranges.length === 0) {
    return (
      <div className="p-6">
        <Card className="max-w-xl mx-auto mt-12">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold">Aucune grille de coefficients attribuée</h2>
            <p className="text-sm text-muted-foreground">
              Votre financeur doit vous attribuer une grille de coefficients avant que vous
              puissiez déposer une demande. Contactez-le pour activer votre accès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <FilePlus2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Nouvelle demande de financement</h1>
          <p className="text-sm text-muted-foreground">
            Le coefficient est appliqué automatiquement selon votre grille « {grid.name} »
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client final */}
          <Card>
            <CardHeader><CardTitle className="text-base">Client final</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {existingClients.length > 0 && (
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">➕ Nouveau client</SelectItem>
                      {existingClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company || c.name}{c.vat_number ? ` — ${c.vat_number}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isNewClient && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Société *</Label>
                    <Input value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>N° TVA / BCE</Label>
                    <Input value={client.vat_number} placeholder="BE0123456789"
                      onChange={(e) => setClient({ ...client, vat_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Personne de contact</Label>
                    <Input value={client.contact_name} onChange={(e) => setClient({ ...client, contact_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input value={client.postal_code} onChange={(e) => setClient({ ...client, postal_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input value={client.city} onChange={(e) => setClient({ ...client, city: e.target.value })} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Équipements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Équipements à financer</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, { ...emptyLine }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ligne
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={l.title} placeholder="ex : MacBook Pro 14 M4"
                      onChange={(e) => updateLine(idx, 'title', e.target.value)} />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Prix unitaire HTVA</Label>
                    <Input type="number" step="0.01" min="0" value={l.purchase_price || ''}
                      onChange={(e) => updateLine(idx, 'purchase_price', e.target.value)} />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qté</Label>
                    <Input type="number" step="1" min="1" value={l.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="sm" disabled={lines.length === 1}
                    onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Remarques</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={remarks} placeholder="Informations utiles pour l'analyse du dossier…"
                onChange={(e) => setRemarks(e.target.value)} />
            </CardContent>
          </Card>
        </div>

        {/* Synthèse */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">Financement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Durée</Label>
                <Select
                  value={duration ? String(duration) : undefined}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir une durée" /></SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} mois</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant total HTVA</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coefficient</span>
                  <span className="font-medium">{coefficient ? coefficient.toFixed(3) : '—'}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Mensualité</span>
                  <span className="text-2xl font-bold text-primary">
                    {monthly !== null ? `${formatCurrency(monthly)}` : '—'}
                  </span>
                </div>
                {amount > 0 && duration && coefficient === null && (
                  <p className="text-xs text-amber-600 flex items-start gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Aucune tranche de votre grille ne couvre {formatCurrency(amount)} sur {duration} mois.
                  </p>
                )}
              </div>

              <Button className="w-full" size="lg" disabled={!canSubmit} onClick={submit}>
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                La demande sera analysée par {`l'équipe`} financement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerNewRequest;
