// Contenus localisés des emails de leasing (acceptation / refus), utilisés par
// les modales d'aperçu (EmailConfirmationModal, RejectionEmailModal). DOIT rester
// synchronisé avec supabase/functions/_shared/leasingEmails.ts (source de vérité
// côté envoi). L'aperçu affiché à l'admin reflète ainsi l'email réellement envoyé.

export type CommLang = "fr" | "nl" | "en" | "de";

export const COMM_LANGS: CommLang[] = ["fr", "nl", "en", "de"];

export function normalizeCommLang(value: unknown): CommLang {
  return COMM_LANGS.includes(value as CommLang) ? (value as CommLang) : "fr";
}

interface AcceptStrings {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  celebration: string;
  nextStepsTitle: string;
  nextStep1: string;
  nextStep2: string;
  warningTitle: string;
  warning1: string;
  warning2: string;
  questions: string;
  goodDay: string;
  regards: string;
  team: string;
}

const ACCEPT: Record<CommLang, AcceptStrings> = {
  fr: {
    subject: "🙌 Félicitations - Votre demande de leasing a été acceptée !",
    greeting: (n) => `Bonjour <strong>${n}</strong>,`,
    intro: "Ce mail de confirmation pour vous annoncer que votre demande de leasing informatique concernant :",
    celebration: "A ÉTÉ ACCEPTÉE 🎉",
    nextStepsTitle: "Prochaines étapes :",
    nextStep1: "Dans quelques instants, vous allez recevoir le contrat de notre partenaire financier à signer de manière électronique.",
    nextStep2: "Dès réception de la signature du contrat, nous procéderons à la commande de matériel et nous vous contacterons pour définir une date de livraison (comptez 3 à 4 jours ouvrables pour la réception du matériel).",
    warningTitle: "⚠️ Actions requises :",
    warning1: "• Pouvez-vous nous envoyer la copie ou une photo lisible recto/verso de votre carte d'identité par retour de mail.",
    warning2: "• Pouvez-vous également prendre connaissance des modalités de leasing ci-jointes, cela évitera tout malentendus.",
    questions: "N'hésitez pas à revenir vers nous si vous avez la moindre question.",
    goodDay: "Bonne journée,",
    regards: "Cordialement,",
    team: "L'équipe iTakecare",
  },
  nl: {
    subject: "🙌 Gefeliciteerd - Uw leasingaanvraag is goedgekeurd!",
    greeting: (n) => `Beste <strong>${n}</strong>,`,
    intro: "Met deze e-mail bevestigen wij u dat uw aanvraag voor IT-leasing betreffende:",
    celebration: "WERD GOEDGEKEURD 🎉",
    nextStepsTitle: "Volgende stappen:",
    nextStep1: "Binnen enkele ogenblikken ontvangt u het contract van onze financiële partner om elektronisch te ondertekenen.",
    nextStep2: "Zodra wij de ondertekening van het contract ontvangen, plaatsen wij de bestelling van het materiaal en nemen wij contact met u op om een leveringsdatum te bepalen (reken op 3 tot 4 werkdagen voor de ontvangst van het materiaal).",
    warningTitle: "⚠️ Vereiste acties:",
    warning1: "• Kunt u ons per kerende e-mail een leesbare kopie of foto van voor- en achterzijde van uw identiteitskaart bezorgen.",
    warning2: "• Gelieve ook kennis te nemen van de bijgevoegde leasingvoorwaarden, zo vermijden we elk misverstand.",
    questions: "Aarzel niet om contact met ons op te nemen bij de minste vraag.",
    goodDay: "Een fijne dag,",
    regards: "Met vriendelijke groeten,",
    team: "Het team van iTakecare",
  },
  en: {
    subject: "🙌 Congratulations - Your leasing request has been approved!",
    greeting: (n) => `Hello <strong>${n}</strong>,`,
    intro: "This confirmation email is to let you know that your IT leasing request concerning:",
    celebration: "HAS BEEN APPROVED 🎉",
    nextStepsTitle: "Next steps:",
    nextStep1: "In a few moments, you will receive the contract from our financial partner to sign electronically.",
    nextStep2: "As soon as we receive the signed contract, we will order the equipment and contact you to schedule a delivery date (allow 3 to 4 business days to receive the equipment).",
    warningTitle: "⚠️ Required actions:",
    warning1: "• Please send us a legible copy or photo of the front and back of your ID card by reply email.",
    warning2: "• Please also review the attached leasing terms; this will avoid any misunderstanding.",
    questions: "Please don't hesitate to get back to us with any questions.",
    goodDay: "Have a great day,",
    regards: "Kind regards,",
    team: "The iTakecare team",
  },
  de: {
    subject: "🙌 Herzlichen Glückwunsch - Ihr Leasingantrag wurde genehmigt!",
    greeting: (n) => `Guten Tag <strong>${n}</strong>,`,
    intro: "Mit dieser Bestätigungs-E-Mail teilen wir Ihnen mit, dass Ihr IT-Leasingantrag bezüglich:",
    celebration: "WURDE GENEHMIGT 🎉",
    nextStepsTitle: "Nächste Schritte:",
    nextStep1: "In wenigen Augenblicken erhalten Sie den Vertrag unseres Finanzpartners zur elektronischen Unterzeichnung.",
    nextStep2: "Sobald wir den unterzeichneten Vertrag erhalten, bestellen wir das Material und kontaktieren Sie, um einen Liefertermin zu vereinbaren (rechnen Sie mit 3 bis 4 Werktagen bis zum Erhalt des Materials).",
    warningTitle: "⚠️ Erforderliche Maßnahmen:",
    warning1: "• Bitte senden Sie uns per Antwort-E-Mail eine lesbare Kopie oder ein Foto der Vorder- und Rückseite Ihres Personalausweises.",
    warning2: "• Bitte nehmen Sie auch die beigefügten Leasingbedingungen zur Kenntnis, um jegliches Missverständnis zu vermeiden.",
    questions: "Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
    goodDay: "Einen schönen Tag,",
    regards: "Mit freundlichen Grüßen,",
    team: "Das iTakecare-Team",
  },
};

const FOOTER = `iTakecare SRL | BE0795.642.894<br>
    Avenue Général Michel 1E - 6000 Charleroi<br>
    <a href="https://www.itakecare.be">www.itakecare.be</a> | <a href="mailto:hello@itakecare.be">hello@itakecare.be</a>`;

export function buildAcceptanceHtml(lang: CommLang, clientFirstName: string, equipmentListHtml: string): string {
  const t = ACCEPT[lang] ?? ACCEPT.fr;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .equipment-list { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .equipment-list ul { margin: 0; padding-left: 20px; }
    .celebration { text-align: center; font-size: 48px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .warning-title { font-weight: bold; color: #92400e; margin-bottom: 5px; }
    .divider { border: none; border-top: 2px solid #e5e7eb; margin: 30px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.subject}</h1>
  </div>
  <div class="content">
    <p>${t.greeting(clientFirstName)}</p>
    <p>${t.intro}</p>
    <div class="equipment-list">
      <ul>
        ${equipmentListHtml}
      </ul>
    </div>
    <div class="celebration">${t.celebration}</div>
    <hr class="divider">
    <p><strong>${t.nextStepsTitle}</strong></p>
    <p>${t.nextStep1}</p>
    <p>${t.nextStep2}</p>
    <div class="warning">
      <div class="warning-title">${t.warningTitle}</div>
      <p style="margin: 5px 0;">${t.warning1}</p>
      <p style="margin: 5px 0;">${t.warning2}</p>
    </div>
    <p>${t.questions}</p>
    <p>${t.goodDay}</p>
    <p><strong>${t.regards}</strong><br>
    ${t.team}</p>
  </div>
  <div class="footer">
    <p>${FOOTER}</p>
  </div>
</body>
</html>
  `;
}

// ───────────────────────── Notification d'offre (envoi par mail) ─────────────────────────
interface OfferEmailStrings {
  subject: (offerNumber: string) => string;
  title: string;
  greeting: (name: string) => string;
  greetingNoName: string;
  intro: (offerNumber: string) => string;
  validity: (days: string) => string;
  closing: string;
  regards: string;
  teamFallback: string;
  labelTel: string;
  labelMail: string;
  labelWeb: string;
  labelAddress: string;
}

const OFFER_EMAIL: Record<CommLang, OfferEmailStrings> = {
  fr: {
    subject: (n) => `Votre offre de leasing iTakecare - ${n}`,
    title: "Votre offre commerciale est prête",
    greeting: (name) => `Bonjour <strong>${name}</strong>,`,
    greetingNoName: "Bonjour,",
    intro: (n) => `Nous avons le plaisir de vous transmettre votre offre commerciale <strong>${n}</strong>.`,
    validity: (d) => `<strong>⏰ Validité :</strong> Cette offre est valable ${d} jours à compter de ce jour.`,
    closing: "Vous trouverez ci-joint le détail complet de notre proposition. N'hésitez pas à nous contacter pour toute question, ou marquer votre accord par retour de mail.",
    regards: "Cordialement,",
    teamFallback: "L'équipe commerciale",
    labelTel: "Tel direct :",
    labelMail: "Mail :",
    labelWeb: "Web :",
    labelAddress: "Adresse :",
  },
  nl: {
    subject: (n) => `Uw iTakecare-leasingofferte - ${n}`,
    title: "Uw commerciële offerte is klaar",
    greeting: (name) => `Beste <strong>${name}</strong>,`,
    greetingNoName: "Beste,",
    intro: (n) => `Met genoegen bezorgen wij u uw commerciële offerte <strong>${n}</strong>.`,
    validity: (d) => `<strong>⏰ Geldigheid:</strong> Deze offerte is ${d} dagen geldig vanaf vandaag.`,
    closing: "U vindt in bijlage het volledige detail van ons voorstel. Aarzel niet om ons te contacteren bij vragen, of bevestig uw akkoord per kerende e-mail.",
    regards: "Met vriendelijke groeten,",
    teamFallback: "Het commerciële team",
    labelTel: "Tel direct:",
    labelMail: "Mail:",
    labelWeb: "Web:",
    labelAddress: "Adres:",
  },
  en: {
    subject: (n) => `Your iTakecare leasing offer - ${n}`,
    title: "Your commercial offer is ready",
    greeting: (name) => `Hello <strong>${name}</strong>,`,
    greetingNoName: "Hello,",
    intro: (n) => `We are pleased to send you your commercial offer <strong>${n}</strong>.`,
    validity: (d) => `<strong>⏰ Validity:</strong> This offer is valid for ${d} days from today.`,
    closing: "You will find the full details of our proposal attached. Please don't hesitate to contact us with any questions, or confirm your agreement by reply email.",
    regards: "Kind regards,",
    teamFallback: "The sales team",
    labelTel: "Direct line:",
    labelMail: "Mail:",
    labelWeb: "Web:",
    labelAddress: "Address:",
  },
  de: {
    subject: (n) => `Ihr iTakecare-Leasingangebot - ${n}`,
    title: "Ihr Angebot ist bereit",
    greeting: (name) => `Guten Tag <strong>${name}</strong>,`,
    greetingNoName: "Guten Tag,",
    intro: (n) => `Gerne übermitteln wir Ihnen Ihr Angebot <strong>${n}</strong>.`,
    validity: (d) => `<strong>⏰ Gültigkeit:</strong> Dieses Angebot ist ${d} Tage ab heute gültig.`,
    closing: "Die vollständigen Details unseres Vorschlags finden Sie im Anhang. Bei Fragen kontaktieren Sie uns gerne, oder bestätigen Sie Ihr Einverständnis per Antwort-E-Mail.",
    regards: "Mit freundlichen Grüßen,",
    teamFallback: "Das Vertriebsteam",
    labelTel: "Direkt-Tel.:",
    labelMail: "Mail:",
    labelWeb: "Web:",
    labelAddress: "Adresse:",
  },
};

export function offerEmailStrings(lang: CommLang): OfferEmailStrings {
  return OFFER_EMAIL[lang] ?? OFFER_EMAIL.fr;
}

// Clôture sans suite (Score D) — le corps garde le placeholder {{client_name}},
// remplacé côté edge (send-no-follow-up-email) avant envoi.
export function noFollowUpSubject(lang: CommLang): string {
  switch (lang) {
    case "nl": return "📁 Afsluiting van uw dossier";
    case "en": return "📁 Closure of your file";
    case "de": return "📁 Schließung Ihres Vorgangs";
    default: return "📁 Clôture de votre dossier";
  }
}

export function noFollowUpBodyTemplate(lang: CommLang): string {
  switch (lang) {
    case "nl": return `<p>Beste {{client_name}},</p>

<p>Wij hebben meermaals geprobeerd u te bereiken in verband met uw aanvraag voor IT-leasing, maar wij hebben jammer genoeg niets van u vernomen.</p>

<p>Bij gebrek aan reactie zien wij ons genoodzaakt <strong>uw dossier af te sluiten</strong>.</p>

<p>Mocht het om een vergetelheid gaan of is uw situatie gewijzigd, aarzel dan niet om opnieuw contact met ons op te nemen. Wij hernemen graag de behandeling van uw aanvraag.</p>

<p>Wij blijven tot uw beschikking.</p>

<p>Met vriendelijke groeten,<br/>Het team van iTakecare</p>`;
    case "en": return `<p>Hello {{client_name}},</p>

<p>We have tried to reach you several times regarding your IT leasing request, but unfortunately we have not heard back from you.</p>

<p>In the absence of a reply, we have no choice but to <strong>close your file</strong>.</p>

<p>If this was an oversight or if your situation has changed, please don't hesitate to contact us again. We would be glad to resume reviewing your request.</p>

<p>We remain at your disposal.</p>

<p>Kind regards,<br/>The iTakecare team</p>`;
    case "de": return `<p>Guten Tag {{client_name}},</p>

<p>Wir haben mehrfach versucht, Sie bezüglich Ihres IT-Leasingantrags zu erreichen, haben aber leider nichts von Ihnen gehört.</p>

<p>Da keine Rückmeldung erfolgt ist, sind wir gezwungen, <strong>Ihren Vorgang zu schließen</strong>.</p>

<p>Sollte es sich um ein Versehen handeln oder hat sich Ihre Situation geändert, kontaktieren Sie uns gerne erneut. Wir nehmen die Prüfung Ihres Antrags gerne wieder auf.</p>

<p>Wir stehen Ihnen weiterhin zur Verfügung.</p>

<p>Mit freundlichen Grüßen,<br/>Das iTakecare-Team</p>`;
    default: return `<p>Bonjour {{client_name}},</p>

<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>

<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>

<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>

<p>Nous restons à votre disposition.</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>`;
  }
}

export function rejectionTitle(lang: CommLang): string {
  switch (lang) {
    case "nl": return "😕 Het spijt ons, uw leasingaanvraag werd niet goedgekeurd";
    case "en": return "😕 We're sorry, your leasing request was not approved";
    case "de": return "😕 Es tut uns leid, Ihr Leasingantrag wurde nicht genehmigt";
    default: return "😕 Nous sommes désolés, votre demande de leasing n'a pas été acceptée";
  }
}

// Variante HTML (paragraphes <p>) du corps de refus, pour les composeurs ReactQuill
// (ScoringModal). Même contenu que rejectionBody mais formaté en HTML.
export function rejectionBodyHtml(lang: CommLang): string {
  switch (lang) {
    case "nl": return `<p>Beste,</p>
<p>Het spijt ons u te moeten meedelen dat onze financiële partner ons heeft laten weten dat hij geen gevolg kan geven aan uw leasingaanvraag.</p>
<p>Wij kunnen u deze keer dus geen materiaal aanbieden.<br/>Wij wensen u alle goeds voor het vervolg van uw activiteiten.</p>
<p>Tot binnenkort,<br/>Het team van iTakecare</p>`;
    case "en": return `<p>Hello,</p>
<p>We are sorry to inform you that our financial partner has told us they are unable to proceed with your leasing request.</p>
<p>We will therefore not be able to offer you equipment this time.<br/>We wish you all the best for the continuation of your activities.</p>
<p>See you soon,<br/>The iTakecare team</p>`;
    case "de": return `<p>Guten Tag,</p>
<p>Es tut uns leid, Ihnen mitteilen zu müssen, dass unser Finanzpartner uns mitgeteilt hat, dass er Ihrem Leasingantrag nicht stattgeben kann.</p>
<p>Wir können Ihnen daher dieses Mal kein Material anbieten.<br/>Wir wünschen Ihnen alles Gute für die Fortsetzung Ihrer Tätigkeiten.</p>
<p>Bis bald,<br/>Das iTakecare-Team</p>`;
    default: return `<p>Bonjour,</p>
<p>Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.</p>
<p>Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.<br/>Je vous souhaite tout le meilleur pour la suite de vos activités.</p>
<p>À bientôt,<br/>L'équipe iTakecare</p>`;
  }
}

export function rejectionBody(lang: CommLang): string {
  switch (lang) {
    case "nl": return `Beste,

Het spijt ons u te moeten meedelen dat onze financiële partner ons heeft laten weten dat hij geen gevolg kan geven aan uw leasingaanvraag.

Wij kunnen u deze keer dus geen materiaal aanbieden.
Wij wensen u alle goeds voor het vervolg van uw activiteiten.
Tot binnenkort,

Het team van iTakecare`;
    case "en": return `Hello,

We are sorry to inform you that our financial partner has told us they are unable to proceed with your leasing request.

We will therefore not be able to offer you equipment this time.
We wish you all the best for the continuation of your activities.
See you soon,

The iTakecare team`;
    case "de": return `Guten Tag,

Es tut uns leid, Ihnen mitteilen zu müssen, dass unser Finanzpartner uns mitgeteilt hat, dass er Ihrem Leasingantrag nicht stattgeben kann.

Wir können Ihnen daher dieses Mal kein Material anbieten.
Wir wünschen Ihnen alles Gute für die Fortsetzung Ihrer Tätigkeiten.
Bis bald,

Das iTakecare-Team`;
    default: return `Bonjour,

Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.

Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.
Je vous souhaite tout le meilleur pour la suite de vos activités.
À bientôt,

L'équipe iTakecare`;
  }
}
