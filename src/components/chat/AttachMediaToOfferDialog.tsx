import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  attachChatMediaToOffer,
  DOCUMENT_TYPES,
  ADDITIONAL_DOCUMENT_TYPES,
} from '@/services/offers/offerDocuments';

interface OfferOption {
  id: string;
  offer_number: string | null;
  monthly_payment: number | null;
  created_at: string;
}

interface AttachMediaToOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName?: string | null;
  media: { path: string; contentType?: string | null; fileName: string } | null;
  onDone?: (result: { success: boolean; error?: string; offerNumber?: string | null }) => void;
}

// Rattache une pièce jointe reçue par WhatsApp/SMS à une demande (offre) du
// client, en tant que document administratif à valider.
export const AttachMediaToOfferDialog: React.FC<AttachMediaToOfferDialogProps> = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  media,
  onDone,
}) => {
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('additional:other');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    setLoadingOffers(true);
    supabase
      .from('offers')
      .select('id, offer_number, monthly_payment, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data ?? []) as OfferOption[];
        setOffers(list);
        if (list.length === 1) setSelectedOffer(list[0].id);
        setLoadingOffers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  const handleConfirm = async () => {
    if (!media || !selectedOffer) return;
    setSubmitting(true);
    const result = await attachChatMediaToOffer({
      mediaPath: media.path,
      contentType: media.contentType,
      fileName: media.fileName,
      offerId: selectedOffer,
      documentType,
    });
    setSubmitting(false);
    const offerNumber = offers.find((o) => o.id === selectedOffer)?.offer_number ?? null;
    onDone?.({ ...result, offerNumber });
    if (result.success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter à une demande</DialogTitle>
          <DialogDescription>
            Rattache « {media?.fileName} » aux documents de la demande de{' '}
            {clientName || 'ce client'}. Il apparaîtra dans l'onglet Documents, à valider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Demande</label>
            {loadingOffers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande trouvée pour ce client.
              </p>
            ) : (
              <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une demande" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.offer_number || o.id.slice(0, 8)}
                      {o.monthly_payment ? ` — ${o.monthly_payment} €/mois` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type de document</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Documents demandés</SelectLabel>
                  {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Autres documents</SelectLabel>
                  {Object.entries(ADDITIONAL_DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={`additional:${key}`} value={`additional:${key}`}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !selectedOffer}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck className="h-4 w-4" />
            )}
            Ajouter à la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
