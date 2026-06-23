// Versioning de Leazr : sources des modales « Nouveautés » et des historiques
// d'aide. DEUX changelogs distincts selon l'audience :
//   - ADMIN_CHANGELOG  : équipe / société (espace /admin)
//   - CLIENT_CHANGELOG : clients finaux (espace /client)
// À chaque lot déployé, ajouter une entrée EN TÊTE du bon tableau et bumper la
// version correspondante (ADMIN_VERSION / CLIENT_VERSION).

export interface ChangelogEntry {
  version: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  items: string[];
}

// ─────────────────────────── ADMIN (espace /admin) ───────────────────────────
export const ADMIN_VERSION = "1.3.2";

export const ADMIN_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.2",
    date: "2026-06-23",
    title: "Centre d'appels : client auto-reconnu + campagnes intégrées",
    items: [
      "Quand vous composez le numéro d'un client connu, sa fiche s'affiche automatiquement — plus besoin de cliquer sur « Rechercher ce numéro ». Si le numéro n'est rattaché à aucun client, le bouton « Associer à un client » reste disponible.",
      "Les « Campagnes Alex » sont désormais un onglet du Centre d'appels (au lieu d'une entrée de menu séparée).",
    ],
  },
  {
    version: "1.3.1",
    date: "2026-06-23",
    title: "WhatsApp : repli SMS automatique en cas d'échec",
    items: [
      "Quand un message WhatsApp ne peut pas être délivré (fenêtre de 24 h fermée ou template non disponible — erreur 63016), le même message part automatiquement en SMS pour que la relance arrive quand même.",
      "Le client n'est plus marqué « pas de WhatsApp » dans ce cas (son compte WhatsApp reste valide).",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-06-23",
    title: "Campagnes d'appels groupés avec Alex (IA)",
    items: [
      "Depuis le CRM, sélectionnez plusieurs clients (cases à cocher) puis « Appeler en groupe avec Alex » : l'agent IA les appelle un par un.",
      "Nouvelle page « Campagnes Alex » : suivez en direct l'avancement de chaque campagne et le résultat de chaque appel (client joint, message laissé, pas de réponse, occupé…), avec le résumé IA de la conversation.",
      "À la fin de chaque campagne, un rapport récapitulatif est envoyé automatiquement par email à l'initiateur.",
      "Seuls les clients ayant donné leur consentement RGPD aux appels IA et disposant d'un numéro valide sont appelés ; les autres sont signalés comme ignorés.",
      "Alex peut désormais laisser un message lorsqu'il tombe sur un répondeur (détection de messagerie vocale).",
    ],
  },
  {
    version: "1.2.3",
    date: "2026-06-23",
    title: "Softphone : messages d'erreur d'appel plus clairs",
    items: [
      "Les échecs d'appel du softphone affichent désormais une cause lisible (ex. « correspondant injoignable, éteint ou occupé ») au lieu d'un code technique opaque (31005).",
      "Si le numéro d'appel sortant n'est pas configuré, l'appel échoue avec un message explicite plutôt qu'un raccrochage silencieux.",
    ],
  },
  {
    version: "1.2.2",
    date: "2026-06-23",
    title: "Commandes fournisseurs : export Excel filtré",
    items: [
      "Le bouton « Exporter Excel » ouvre désormais une fenêtre permettant de choisir ce que l'on exporte : statut (à commander, commandé, reçu, annulé), année, fournisseur et client.",
      "La fenêtre reprend automatiquement les filtres déjà appliqués sur la page (ce que vous voyez = ce que vous exportez).",
      "Nouvelle colonne « Caractéristiques » dans l'export (mémoire, capacité, connectivité…) pour transmettre la commande complète au fournisseur.",
      "Le nombre d'équipements correspondant aux critères s'affiche en temps réel avant l'export.",
    ],
  },
  {
    version: "1.2.1",
    date: "2026-06-22",
    title: "Grenke : rafraîchissement du statut plus robuste",
    items: [
      "Le bouton « Rafraîchir le statut » d'un dossier Grenke retente automatiquement lorsqu'un hoquet temporaire de l'API Grenke (erreur 500) survient, au lieu d'afficher l'erreur directement.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-06-22",
    title: "SKU client pour les fournisseurs",
    items: [
      "Nouveau « SKU client » propre à votre société (préfixe + caractéristiques produit, max 14 caractères, ex. ITCHPPRB440G11), distinct du SKU d'origine du fabricant.",
      "Préfixe SKU configurable dans Personnalisation, et génération automatique (modifiable) du SKU sur chaque fiche produit.",
      "SKU client affiché dans le catalogue et export Excel du catalogue.",
      "Vue catalogue (liste) réorganisée en colonnes : Produit, SKU client, descriptif, marque et prix « à partir de ».",
      "Commandes fournisseurs : colonne « SKU client » dans le tableau et dans l'export Excel à transmettre au fournisseur.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-06-18",
    title: "Demande de factures, contrats & centre d'aide",
    items: [
      "Demande de factures au bailleur depuis un contrat, avec un éditeur d'e-mail enrichi (gras, souligné, listes) modifiable avant l'envoi.",
      "Contrats : case « équipement non sérialisé » qui replie et grise les numéros de série lorsqu'ils ne s'appliquent pas.",
      "Grenke : la remise commerciale est désormais correctement répercutée sur les montants envoyés au bailleur.",
      "Assignation d'équipement : une seule unité est assignée à la fois (au lieu de toute la ligne).",
      "Nouveau centre d'aide par module avec historique des versions, et popup « Nouveautés » à chaque déploiement.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-17",
    title: "Espace client enrichi, PDF d'offre & Grenke",
    items: [
      "Espace client : centre de documents (contrats signés + documents de contrat), multi-utilisateurs par client, notifications et recherche.",
      "PDF d'offre : moteur de rendu unifié et carte promo « prestataire » avec champs marketing par produit (accroche, spécificité, mention).",
      "Grenke : récupération de la mensualité réelle (TotalInstalment) avec synchronisation et auto-réparation au cron.",
      "Renforcement de la sécurité et de la confidentialité des données entre clients (isolation RLS).",
    ],
  },
];

// ────────────────────────── CLIENT (espace /client) ──────────────────────────
export const CLIENT_VERSION = "1.1.0";

export const CLIENT_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-06-18",
    title: "Documents, factures & multi-accès",
    items: [
      "Nouveau centre de documents : retrouvez vos contrats signés et tous les documents liés à vos contrats en un seul endroit.",
      "Demandez vos factures directement depuis un contrat, avec un e-mail pré-rempli que vous pouvez relire avant l'envoi.",
      "Plusieurs accès pour votre société : invitez vos collaborateurs à accéder à votre espace client.",
      "Une cloche de notifications et une recherche pour retrouver rapidement vos contrats et documents.",
      "Un nouveau centre d'aide dédié à votre espace, avec l'historique des nouveautés.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-17",
    title: "Un espace client tout neuf",
    items: [
      "Refonte complète de l'interface de votre espace client, plus claire et plus moderne.",
      "Le logo de votre bailleur apparaît désormais sur chaque contrat.",
      "Vos contrats sont mieux présentés : tri par date, statut de livraison à jour, contrats annulés masqués.",
      "Affichage de la date de début de contrat et du descriptif d'équipement simplifié.",
    ],
  },
];

// Comparaison sémantique « a.b.c » : > 0 si version a plus récente que b.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
