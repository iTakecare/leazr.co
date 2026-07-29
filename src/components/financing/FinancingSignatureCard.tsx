import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FileSignature, Send, PenLine, RefreshCw, ExternalLink } from 'lucide-react';
import SignaturePad from '@/components/signature/SignaturePad';
import SignatureCeremonyTimeline from './SignatureCeremonyTimeline';
import {
  FinancingSignatory, SignatureCeremony,
  getCeremonyForOffer, resendSignatureLink, signCeremonyStep, startFinancingSignature,
} from '@/services/signatureCeremonyService';
import { supabase } from '@/integrations/supabase/client';

const ACCEPTED_STATUSES = ['internal_approved', 'leaser_approved', 'approved', 'accepted', 'validated'];

interface FinancingSignatureCardProps {
  offer: {
    id: string;
    workflow_status: string;
    financing_signatory?: FinancingSignatory | null;
    client_email?: string | null;
  };
}

/**
 * Carte « Contrat & signatures » côté financeur (détail d'une demande de
 * financement) : lancement du pack, suivi de la séquence, relance,
 * contre-signature financeur (étape 3).
 */
const FinancingSignatureCard: React.FC<FinancingSignatureCardProps> = ({ offer }) => {
  const [ceremony, setCeremony] = useState<SignatureCeremony | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FinancingSignatory>({
    first_name: (offer.financing_signatory as any)?.first_name || '',
    last_name: (offer.financing_signatory as any)?.last_name || '',
    email: (offer.financing_signatory as any)?.email || offer.client_email || '',
    phone: (offer.financing_signatory as any)?.phone || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    getCeremonyForOffer(offer.id)
      .then(async (c) => {
        setCeremony(c);
        if (c?.contract_id) {
          const { data } = await supabase
            .from('contracts')
            .select('contract_signature_token, company_id, companies:company_id(slug)')
            .eq('id', c.contract_id)
            .maybeSingle();
          const slug = (data as any)?.companies?.slug;
          if (slug && (data as any)?.contract_signature_token) {
            setSignUrl(`https://leazr.co/${slug}/contract/${(data as any).contract_signature_token}/sign`);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [offer.id]);

  useEffect(() => { load(); }, [load]);

  const isAccepted = ACCEPTED_STATUSES.includes(offer.workflow_status);
  if (loading || (!isAccepted && !ceremony)) return null;

  const currentSigner = ceremony?.signers?.find((s) => s.step_order === ceremony.current_step);
  const financeurTurn = ceremony?.status === 'in_progress' && currentSigner?.role === 'financeur';

  const start = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Prénom, nom et email du signataire sont obligatoires');
      return;
    }
    try {
      setSubmitting(true);
      const res = await startFinancingSignature(offer.id, form);
      if (res.success) {
        toast.success('Contrat généré et envoyé pour signature au client');
        load();
      } else {
        toast.error(res.error || 'Erreur lors du lancement');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!ceremony) return;
    try {
      setResending(true);
      const res = await resendSignatureLink(ceremony.id);
      if (res.success) toast.success('Lien de signature renvoyé');
      else toast.error(res.error || 'Erreur lors de la relance');
    } finally {
      setResending(false);
    }
  };

  const countersign = async (signatureData: string) => {
    try {
      setSigning(true);
      await signCeremonyStep(ceremony!.id, signatureData);
      toast.success('Contrat contre-signé — cérémonie terminée');
      setSignOpen(false);
      load();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" /> Contrat & signatures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ceremony ? (
          <>
            <p className="text-sm text-muted-foreground">
              Demande acceptée. Le partenaire peut renseigner le signataire depuis son portail,
              ou vous pouvez lancer la signature ici.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom *</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <Button onClick={start} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Génération…' : 'Générer le contrat et envoyer pour signature'}
            </Button>
          </>
        ) : (
          <>
            <SignatureCeremonyTimeline ceremony={ceremony} />
            <div className="flex flex-wrap gap-2">
              {financeurTurn && (
                <Button size="sm" onClick={() => setSignOpen(true)}>
                  <PenLine className="h-4 w-4 mr-1" /> Contre-signer (financeur)
                </Button>
              )}
              {ceremony.status === 'in_progress' && (
                <Button variant="outline" size="sm" onClick={resend} disabled={resending}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${resending ? 'animate-spin' : ''}`} /> Relancer le signataire
                </Button>
              )}
              {signUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={signUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Page de signature
                  </a>
                </Button>
              )}
            </div>
          </>
        )}

        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contre-signature du financeur</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Signature au nom de {currentSigner?.name}. La signature qualifiée itsme (OKSign)
              remplacera cette étape dès l'activation de l'intégration.
            </p>
            <SignaturePad onSave={countersign} disabled={signing} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FinancingSignatureCard;
