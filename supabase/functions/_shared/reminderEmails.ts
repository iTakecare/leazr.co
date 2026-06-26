// Gabarit localisé (NL/EN/DE) des emails de relance, utilisé par send-reminder-email
// lorsque la langue du client n'est pas le français. En FR, on conserve les
// templates personnalisés par société (email_templates document_reminder_l{N} /
// offer_reminder_l{N}). Variables fournies par l'appelant.

export type Lang = "fr" | "nl" | "en" | "de";

export interface ReminderVars {
  clientName: string;
  companyName: string;
  offerAmount: string;       // déjà formaté
  monthlyPayment: string;    // déjà formaté
  contactEmail: string;
  contactPhone: string;
  uploadLink: string;
  requestedDocumentsHtml: string; // <ul>…</ul> ou ''
  offerLink: string;
  representativeName: string;
  customMessageHtml: string; // bloc HTML ou ''
  logoUrl: string;
}

type ReminderType = "document_reminder" | "offer_reminder";

interface Strings {
  docSubject: string;
  offerSubject: string;
  greeting: (n: string) => string;
  docIntro: string;
  docList: string;
  offerIntro: string;
  amountLabel: string;
  monthlyLabel: string;
  docCta: string;
  offerCta: string;
  contactLine: string;
  regards: string;
}

const S: Record<Lang, Strings> = {
  fr: {
    docSubject: "Rappel : documents en attente pour votre dossier",
    offerSubject: "Rappel : votre offre de leasing vous attend",
    greeting: (n) => `Bonjour ${n},`,
    docIntro: "Sauf erreur de notre part, nous n'avons pas encore reçu l'ensemble des documents nécessaires au traitement de votre dossier de leasing.",
    docList: "Documents encore attendus :",
    offerIntro: "Nous revenons vers vous au sujet de votre offre de leasing, qui reste disponible. N'hésitez pas à la consulter et à revenir vers nous.",
    amountLabel: "Montant financé",
    monthlyLabel: "Mensualité",
    docCta: "Téléverser mes documents",
    offerCta: "Consulter mon offre",
    contactLine: "Pour toute question :",
    regards: "Cordialement,",
  },
  nl: {
    docSubject: "Herinnering: documenten in afwachting voor uw dossier",
    offerSubject: "Herinnering: uw leasingofferte wacht op u",
    greeting: (n) => `Beste ${n},`,
    docIntro: "Behoudens vergissing hebben wij nog niet alle documenten ontvangen die nodig zijn om uw leasingdossier te behandelen.",
    docList: "Nog verwachte documenten:",
    offerIntro: "Wij komen terug op uw leasingofferte, die nog steeds beschikbaar is. Bekijk ze gerust en neem contact met ons op.",
    amountLabel: "Gefinancierd bedrag",
    monthlyLabel: "Maandbedrag",
    docCta: "Mijn documenten opladen",
    offerCta: "Mijn offerte bekijken",
    contactLine: "Met vragen:",
    regards: "Met vriendelijke groeten,",
  },
  en: {
    docSubject: "Reminder: documents pending for your file",
    offerSubject: "Reminder: your leasing offer is waiting for you",
    greeting: (n) => `Hello ${n},`,
    docIntro: "Unless we are mistaken, we have not yet received all the documents needed to process your leasing file.",
    docList: "Documents still expected:",
    offerIntro: "We're getting back to you about your leasing offer, which is still available. Feel free to review it and get back to us.",
    amountLabel: "Financed amount",
    monthlyLabel: "Monthly payment",
    docCta: "Upload my documents",
    offerCta: "View my offer",
    contactLine: "Any questions:",
    regards: "Kind regards,",
  },
  de: {
    docSubject: "Erinnerung: ausstehende Dokumente für Ihren Vorgang",
    offerSubject: "Erinnerung: Ihr Leasingangebot wartet auf Sie",
    greeting: (n) => `Guten Tag ${n},`,
    docIntro: "Sofern uns kein Fehler unterlaufen ist, haben wir noch nicht alle Dokumente erhalten, die zur Bearbeitung Ihres Leasingvorgangs erforderlich sind.",
    docList: "Noch erwartete Dokumente:",
    offerIntro: "Wir melden uns bezüglich Ihres Leasingangebots, das weiterhin verfügbar ist. Sehen Sie es sich gerne an und kontaktieren Sie uns.",
    amountLabel: "Finanzierter Betrag",
    monthlyLabel: "Monatsrate",
    docCta: "Meine Dokumente hochladen",
    offerCta: "Mein Angebot ansehen",
    contactLine: "Bei Fragen:",
    regards: "Mit freundlichen Grüßen,",
  },
};

export function reminderSubject(lang: Lang, type: ReminderType): string {
  const s = S[lang] ?? S.fr;
  return type === "document_reminder" ? s.docSubject : s.offerSubject;
}

export function buildReminderHtml(lang: Lang, type: ReminderType, v: ReminderVars): string {
  const s = S[lang] ?? S.fr;
  const isDoc = type === "document_reminder";
  const ctaLink = isDoc ? v.uploadLink : v.offerLink;
  const ctaLabel = isDoc ? s.docCta : s.offerCta;
  const intro = isDoc ? s.docIntro : s.offerIntro;

  const docsBlock = isDoc && v.requestedDocumentsHtml
    ? `<p style="margin:18px 0 6px;font-weight:bold;color:#0f172a;">${s.docList}</p>${v.requestedDocumentsHtml}`
    : "";

  const offerBlock = !isDoc
    ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:18px 0;font-size:14px;">
         <div style="padding:4px 0;"><span style="color:#6b7280;">${s.amountLabel} :</span> <strong>${v.offerAmount} €</strong></div>
         <div style="padding:4px 0;"><span style="color:#6b7280;">${s.monthlyLabel} :</span> <strong>${v.monthlyPayment} €</strong></div>
       </div>`
    : "";

  const ctaBlock = ctaLink
    ? `<div style="text-align:center;margin:28px 0;">
         <a href="${ctaLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;">${ctaLabel}</a>
       </div>`
    : "";

  const contactBits = [v.contactEmail, v.contactPhone].filter(Boolean).join(" · ");
  const contactBlock = contactBits
    ? `<p style="font-size:13px;color:#64748b;">${s.contactLine} ${contactBits}</p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      ${v.logoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${v.logoUrl}" alt="${v.companyName}" style="max-height:48px;max-width:200px;"></div>` : ""}
      <p style="font-size:16px;">${s.greeting(v.clientName)}</p>
      <p style="font-size:15px;line-height:1.5;">${intro}</p>
      ${docsBlock}
      ${offerBlock}
      ${v.customMessageHtml || ""}
      ${ctaBlock}
      ${contactBlock}
      <p style="font-size:14px;color:#475569;margin-top:24px;">${s.regards}<br><strong>${v.representativeName || v.companyName}</strong></p>
    </div>
  </body></html>`;
}
