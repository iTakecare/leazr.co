import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FileSignature, Send, PenLine } from 'lucide-react';
import SignaturePad from '@/components/signature/SignaturePad';
import SignatureCeremonyTimeline from './SignatureCeremonyTimeline';
import {
  FinancingSignatory, SignatureCeremony,
  getCeremonyForOffer, signCeremonyStep, startFinancingSignature,
} from '@/services/signatureCeremonyService';

const ACCEPTED_STATUSES = ['internal_approved', 'leaser_approved', 'approved', 'accepted', 'validated'];

interface PartnerSignatureSectionProps {
  offerId: string;
  workflowStatus: string;
  partnerContactName?: string;
}

/**
 * Section « Contrat & signatures » du portail partenaire : saisie du signataire
 * final après acceptation, suivi de la séquence, contre-signature fournisseur.
 */
const PartnerSignatureSection: React.FC<PartnerSignatureSectionProps> = ({
  offerId, workflowStatus, partnerContactName,
}) => {
  const [ceremony, setCeremony] = useState<SignatureCeremony | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FinancingSignatory>({ first_name: '', last_name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  const load = useCallback(() => {
    getCeremonyForOffer(offerId)
      .then(setCeremony)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [offerId]);

  useEffect(() => { load(); }, [load]);

  const isAccepted = ACCEPTED_STATUSES.includes(workflowStatus);
  if (loading || (!isAccepted && !ceremony)) return null;

  const currentSigner = ceremony?.signers?.find((s) => s.step_order === ceremony.current_step);
  const partnerTurn = ceremony?.status === 'in_progress' && currentSigner?.role === 'partner';

  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Prénom, nom et email du signataire sont obligatoires');
      return;
    }
    try {
      setSubmitting(true);
      const res = await startFinancingSignature(offerId, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
      });
      if (res.success) {
        toast.success('Contrat généré — le client a reçu son lien de signature par email');
        load();
      } else {
        toast.error(res.error || 'Erreur lors du lancement de la signature');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const countersign = async (signatureData: string) => {
    try {
      setSigning(true);
      await signCeremonyStep(ceremony!.id, signatureData, partnerContactName);
      toast.success('Contrat contre-signé en tant que fournisseur');
      setSignOpen(false);
      load();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" /> Contrat & signatures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ceremony ? (
          <>
            <p className="text-sm text-muted-foreground">
              Votre demande est <span className="font-medium text-green-700">acceptée</span>.
              Renseignez la personne qui signera le contrat chez votre client : elle recevra
              immédiatement son lien de signature par email.
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
            <Button onClick={submit} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Génération du contrat…' : 'Générer le contrat et envoyer pour signature'}
            </Button>
          </>
        ) : (
          <>
            <SignatureCeremonyTimeline ceremony={ceremony} />
            {partnerTurn && (
              <Button onClick={() => setSignOpen(true)}>
                <PenLine className="h-4 w-4 mr-2" /> Contre-signer en tant que fournisseur
              </Button>
            )}
          </>
        )}

        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contre-signature fournisseur</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              En signant, vous confirmez fournir l'équipement décrit au contrat aux conditions convenues.
            </p>
            <SignaturePad onSave={countersign} disabled={signing} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PartnerSignatureSection;
