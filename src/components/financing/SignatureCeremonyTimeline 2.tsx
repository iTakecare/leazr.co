import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Mail, User, Store, Landmark } from 'lucide-react';
import { CeremonySigner, SignatureCeremony } from '@/services/signatureCeremonyService';

const roleLabel: Record<string, string> = {
  client: 'Client final',
  partner: 'Fournisseur (partenaire)',
  financeur: 'Financeur',
};

const roleIcon: Record<string, React.ElementType> = {
  client: User,
  partner: Store,
  financeur: Landmark,
};

const signerBadge = (signer: CeremonySigner, isCurrent: boolean) => {
  if (signer.status === 'signed') {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Signé
        {signer.signed_at && ` le ${new Date(signer.signed_at).toLocaleDateString('fr-BE')}`}
      </Badge>
    );
  }
  if (signer.status === 'refused') {
    return <Badge variant="destructive">Refusé</Badge>;
  }
  if (isCurrent) {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
        <Clock className="h-3 w-3 mr-1" /> {signer.status === 'notified' ? 'Notifié — en attente' : 'En attente'}
      </Badge>
    );
  }
  return <Badge variant="secondary">À venir</Badge>;
};

/** Timeline de la séquence de signature (client → partenaire → financeur). */
const SignatureCeremonyTimeline: React.FC<{ ceremony: SignatureCeremony }> = ({ ceremony }) => {
  const signers = ceremony.signers || [];
  return (
    <div className="space-y-2">
      {signers.map((s) => {
        const Icon = roleIcon[s.role] || User;
        const isCurrent = ceremony.status === 'in_progress' && s.step_order === ceremony.current_step;
        return (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-md border p-2.5 ${
              isCurrent ? 'border-amber-300 bg-amber-50/50' : s.status === 'signed' ? 'border-green-200 bg-green-50/40' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {s.step_order}. {roleLabel[s.role] || s.role}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.name}
                  {s.email && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5">
                      <Mail className="h-3 w-3" /> {s.email}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {signerBadge(s, isCurrent)}
          </div>
        );
      })}
      {ceremony.status === 'completed' && (
        <p className="text-sm text-green-700 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Contrat entièrement signé par les trois parties.
        </p>
      )}
    </div>
  );
};

export default SignatureCeremonyTimeline;
