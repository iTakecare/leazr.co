// Shown in the Grenke workflow panel when grenke_state === 'AwaitingPartnerSignature':
// the client has signed and it's now iTakecare's turn to counter-sign.
//
// Grenke's API does not expose a DocuSign signing URL (probed: only POST
// /e-signature to start, and GET /e-signature/configuration for signee counts —
// no recipient-view / signing-url endpoint). The partner therefore signs via
// the DocuSign email Grenke sends. This modal makes that explicit and offers a
// one-click status refresh so the team sees the dossier advance once signed.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PenLine, RefreshCw, Mail } from "lucide-react";

interface GrenkePartnerSignatureCardProps {
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
}

export default function GrenkePartnerSignatureCard({ onRefresh, refreshing }: GrenkePartnerSignatureCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/50 p-3">
      <div className="flex items-start gap-2">
        <PenLine className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-900">À vous de signer — fournisseur (iTakecare)</div>
          <p className="text-xs text-amber-800 mt-0.5">
            Le client a signé. C'est maintenant à iTakecare de contre-signer le contrat pour qu'il poursuive
            vers la confirmation de livraison.
          </p>
          <Button
            size="sm"
            className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setOpen(true)}
          >
            <PenLine className="h-3.5 w-3.5 mr-1.5" /> Signer le contrat (fournisseur)
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-amber-600" /> Signature fournisseur (iTakecare)
            </DialogTitle>
            <DialogDescription>Contre-signature DocuSign du contrat par iTakecare.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
              <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p>
                DocuSign a envoyé un <strong>email de signature</strong> au signataire fournisseur (iTakecare).
                Ouvrez cet email et signez le contrat directement dans DocuSign.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              La contre-signature se fait via le lien DocuSign reçu par email (Grenke ne permet pas de signer
              directement dans Leazr). Une fois signé, cliquez sur « Rafraîchir le statut » pour voir le dossier
              passer à l'étape suivante (confirmation de livraison).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Fermer</Button>
            <Button size="sm" className="gap-1.5" disabled={refreshing} onClick={async () => { await onRefresh(); }}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Rafraîchir le statut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
