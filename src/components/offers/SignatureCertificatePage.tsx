import React from 'react';

export interface SignatureCertificateData {
  signatureData: string;          // image data-URL de la signature manuscrite
  signerName: string;
  signedAt: string;               // ISO
  signerIp?: string | null;
  signerUserAgent?: string | null;
  payloadHash?: string | null;    // SHA-256 du contenu signé
  certificateId?: string | null;
  offerNumber?: string;
  clientCompany?: string;
  companyName?: string;
}

/**
 * Page ajoutée au PDF UNIQUEMENT lorsque l'offre a été signée en ligne.
 * Une offre non signée produit le PDF habituel, sans cette page.
 *
 * Elle porte les éléments qui donnent sa valeur probante à la signature :
 * l'empreinte manuscrite, l'horodatage, l'adresse IP et le navigateur observés
 * côté serveur, et l'empreinte SHA-256 du contenu signé — c'est elle qui
 * distingue « le client a signé » de « le client a signé CECI ».
 */
const SignatureCertificatePage: React.FC<SignatureCertificateData> = ({
  signatureData,
  signerName,
  signedAt,
  signerIp,
  signerUserAgent,
  payloadHash,
  certificateId,
  offerNumber,
  clientCompany,
  companyName,
}) => {
  const signed = new Date(signedAt);

  // Horodatage explicitement daté au fuseau belge : un certificat qui affiche
  // une heure sans fuseau ne vaut rien pour arbitrer un litige.
  const dateLabel = signed.toLocaleDateString('fr-BE', {
    timeZone: 'Europe/Brussels',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = signed.toLocaleTimeString('fr-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Signataire', value: signerName },
    { label: 'Date de signature', value: dateLabel },
    { label: 'Heure de signature', value: `${timeLabel} (heure de Bruxelles)` },
    { label: 'Adresse IP', value: signerIp || 'non enregistrée' },
    ...(offerNumber ? [{ label: 'Référence de l’offre', value: offerNumber }] : []),
    ...(clientCompany ? [{ label: 'Société', value: clientCompany }] : []),
    ...(certificateId ? [{ label: 'N° de certificat', value: certificateId }] : []),
  ];

  return (
    <div className="page page-signature">
      <div style={{ padding: '18mm 16mm', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '6mm', marginBottom: '8mm' }}>
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            Annexe
          </p>
          <h1 style={{ margin: '2mm 0 0', fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
            Certificat de signature électronique
          </h1>
          <p style={{ margin: '2mm 0 0', fontSize: '11px', color: '#64748b' }}>
            Ce document atteste de la signature en ligne de l'offre commerciale ci-avant.
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td
                  style={{
                    padding: '3mm 0',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#64748b',
                    width: '45%',
                    verticalAlign: 'top',
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    padding: '3mm 0',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#0f172a',
                    fontWeight: 600,
                    wordBreak: 'break-word',
                  }}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '10mm' }}>
          <p
            style={{
              margin: '0 0 3mm',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            Signature manuscrite
          </p>
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              background: '#ffffff',
              padding: '5mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '38mm',
            }}
          >
            <img
              src={signatureData}
              alt={`Signature de ${signerName}`}
              style={{ maxWidth: '100%', maxHeight: '34mm', objectFit: 'contain' }}
            />
          </div>
          <p style={{ margin: '2mm 0 0', fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>
            {signerName}
          </p>
        </div>

        {payloadHash && (
          <div style={{ marginTop: '9mm' }}>
            <p
              style={{
                margin: '0 0 2mm',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              Empreinte du document signé (SHA-256)
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '9px',
                lineHeight: 1.6,
                color: '#334155',
                wordBreak: 'break-all',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '3px',
                padding: '3mm',
              }}
            >
              {payloadHash}
            </p>
            <p style={{ margin: '2mm 0 0', fontSize: '9.5px', color: '#64748b', lineHeight: 1.5 }}>
              Cette empreinte est calculée sur les montants, la durée et la liste des équipements
              au moment de la signature. Toute modification ultérieure de l'offre produirait une
              empreinte différente.
            </p>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '8mm' }}>
          {signerUserAgent && (
            <p style={{ margin: '0 0 3mm', fontSize: '8.5px', color: '#94a3b8', lineHeight: 1.5 }}>
              Navigateur du signataire : {signerUserAgent}
            </p>
          )}
          <p
            style={{
              margin: 0,
              fontSize: '9px',
              color: '#64748b',
              lineHeight: 1.6,
              borderTop: '1px solid #e2e8f0',
              paddingTop: '4mm',
            }}
          >
            L'adresse IP et l'horodatage ont été relevés par les serveurs de {companyName || 'Leazr'}
            au moment de la signature. Conformément au règlement eIDAS (UE) n° 910/2014, une
            signature électronique ne peut être privée d'effet juridique au seul motif qu'elle se
            présente sous forme électronique.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignatureCertificatePage;
