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
export const ADMIN_VERSION = "1.3.18";

export const ADMIN_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.18",
    date: "2026-06-23",
    title: "Statistiques Alex : coût en euros (total et par appel)",
    items: [
      "Le coût des appels Alex est désormais affiché en euros : coût total et coût moyen par appel, calculés sur le temps facturé (répondeurs inclus).",
      "Un champ « Tarif €/min » modifiable en haut de la page permet de saisir votre tarif ElevenLabs réel ; il est mémorisé pour les prochaines visites.",
    ],
  },
  {
    version: "1.3.17",
    date: "2026-06-23",
    title: "Statistiques Alex : KPI « Conversations réelles »",
    items: [
      "Nouveau KPI « Conversations réelles » : part des appels où un humain a non seulement décroché mais a réellement échangé (≥ 30 s), pour distinguer « a décroché » de « a vraiment parlé ».",
      "Cette étape s'ajoute aussi à l'entonnoir d'efficacité (Appelés → Humain joint → Conversations réelles → Documents déposés).",
    ],
  },
  {
    version: "1.3.16",
    date: "2026-06-23",
    title: "Facture bailleur = valeurs réelles du dossier Grenke",
    items: [
      "La facture poussée vers Billit reprend désormais les montants par bien EXACTEMENT tels qu'ils figurent dans le dossier Grenke (y compris les ajustements manuels effectués par le représentant Grenke).",
      "Ces valeurs sont rapatriées automatiquement depuis Grenke (détail par bien + montant financé réel) lors de la synchronisation de statut, et figées sur la demande.",
      "Un indicateur « Montants par bien alignés sur le dossier Grenke » s'affiche dans la carte d'envoi Billit. À défaut de rapatriement (ancien dossier), un calcul de repli au prorata du loyer est utilisé.",
    ],
  },
  {
    version: "1.3.15",
    date: "2026-06-23",
    title: "Centre d'appels : « Créer une fiche client » ouvre le formulaire",
    items: [
      "Depuis le Centre d'appels, « Créer une fiche client » ouvre désormais directement le formulaire de nouvelle fiche client, au lieu d'afficher la liste du CRM.",
    ],
  },
  {
    version: "1.3.14",
    date: "2026-06-23",
    title: "Statistiques Alex : répondeurs correctement comptés",
    items: [
      "Correction : les anciens appels tombés sur répondeur étaient comptés comme « humain joint » (gonflant le taux à 100%). Ils sont désormais reclassés en « répondeur » à partir de leur transcription, et la détection future combine motif d'appel, analyse IA et contenu de la transcription.",
      "Le coût des appels est affiché en crédits ElevenLabs (et non en euros).",
    ],
  },
  {
    version: "1.3.13",
    date: "2026-06-23",
    title: "Statistiques Alex : pistes d'amélioration",
    items: [
      "Sous les statistiques d'Alex, une section « Pistes d'amélioration » indique combien de demandes en attente de documents sont réellement joignables par Alex, et combien sont bloquées par un numéro manquant ou un consentement IA non donné — à corriger dans les fiches.",
      "Graphique des documents qui bloquent le plus (à expliquer ou pré-collecter en amont) et du meilleur créneau horaire pour joindre un humain.",
      "Recommandations automatiques basées sur vos données pour améliorer le taux de réponse et la récupération des documents.",
    ],
  },
  {
    version: "1.3.12",
    date: "2026-06-23",
    title: "Facture Grenke : prix par bien alignés sur le portail",
    items: [
      "Les montants par équipement de la facture poussée vers Billit correspondent désormais exactement aux valeurs « détails du bien » du portail Grenke.",
      "Correction : le montant financé est réparti au prorata du LOYER de chaque bien (mensualité par ligne), comme le fait Grenke — et non plus au prorata du prix d'achat + marge.",
    ],
  },
  {
    version: "1.3.11",
    date: "2026-06-23",
    title: "Centre d'appels : onglet Statistiques Alex",
    items: [
      "Nouvel onglet « Statistiques » dans le Centre d'appels : KPI et graphiques sur l'efficacité d'Alex — taux d'humains joints, répondeurs, durée moyenne, coût, et répartition des résultats.",
      "KPI clé « Conversion documents » : part des appels (liés à une demande) suivis d'un dépôt de document dans les 14 jours, avec entonnoir Appelés → Joints → Documents déposés.",
      "Les appels Alex (manuels et campagnes) sont désormais reliés à leur demande pour permettre ce suivi de conversion.",
    ],
  },
  {
    version: "1.3.10",
    date: "2026-06-23",
    title: "Facture Billit : n° de dossier dans Objet et Votre référence",
    items: [
      "Lors de la poussée d'une facture bailleur vers Billit, les champs « Objet » et « Votre référence / (PO) » sont désormais pré-remplis avec le numéro de dossier leaseur, précédé du mot « DOSSIER » en majuscules (ex. « DOSSIER 180-33054 »).",
    ],
  },
  {
    version: "1.3.9",
    date: "2026-06-23",
    title: "Facture Billit : « non sérialisé » respecté pour Grenke",
    items: [
      "Un équipement coché « non sérialisé » (câble, écran, accessoire...) ne déclenche plus l'avertissement « n° de série manquant — obligatoire pour Grenke » lors de la préparation de la facture à pousser vers Billit.",
    ],
  },
  {
    version: "1.3.8",
    date: "2026-06-23",
    title: "Menu : « Demandes » avant « Contrats »",
    items: [
      "Dans le menu latéral, l'entrée « Demandes » passe avant « Contrats » pour suivre l'ordre logique du cycle de vie d'un dossier (une demande devient un contrat).",
    ],
  },
  {
    version: "1.3.7",
    date: "2026-06-23",
    title: "Facturation possible dès le statut « Livré »",
    items: [
      "Le bouton « Générer la facture » d'un contrat s'active désormais aussi quand le contrat est au statut « Livré » (en plus de « Commandé » et « Actif »). Inutile de passer le contrat en « Actif » au préalable pour facturer.",
    ],
  },
  {
    version: "1.3.6",
    date: "2026-06-23",
    title: "Coach Alex : analyse hebdomadaire des appels",
    items: [
      "Chaque semaine, une IA analyse les transcriptions des appels d'Alex et vous envoie par email des suggestions concrètes pour améliorer son discours (ouverture, gestion du répondeur, objections).",
      "Rien n'est appliqué automatiquement : vous gardez la main sur les ajustements.",
    ],
  },
  {
    version: "1.3.5",
    date: "2026-06-23",
    title: "Alex : répondeur mieux détecté dans le suivi",
    items: [
      "Les appels d'Alex tombés sur une messagerie vocale sont désormais correctement marqués « Message laissé (répondeur) » dans l'historique et les rapports de campagne, même quand l'opérateur ne le signale pas explicitement (détection via le résumé de l'appel).",
    ],
  },
  {
    version: "1.3.4",
    date: "2026-06-23",
    title: "Alex : ouverture d'appel revue (moins de raccrochages)",
    items: [
      "Alex annonce désormais le motif de l'appel dès la première phrase (« il nous manque encore tel document pour finaliser votre dossier »), avec un ton plus humain, pour que le client comprenne tout de suite et reste en ligne.",
      "La mention d'enregistrement et le droit de parler à un humain sont conservés, mais condensés après le motif.",
    ],
  },
  {
    version: "1.3.3",
    date: "2026-06-23",
    title: "Campagnes Alex : on coche les Demandes (pas le CRM)",
    items: [
      "Les campagnes de relance se lancent désormais depuis la liste des Demandes : on coche les demandes en attente de documents et Alex rappelle chaque client pour SES documents manquants (déterminés automatiquement par demande).",
      "Chaque appel reste transcrit et résumé, pour savoir s'il faut rappeler ou si l'on est tombé sur la messagerie.",
    ],
  },
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
    title: "Campagnes de relance documents avec Alex (IA)",
    items: [
      "Depuis la liste des Demandes, cochez plusieurs demandes en attente de documents puis « Appeler en groupe avec Alex » : l'agent IA rappelle chaque client, un par un, pour redemander ses documents manquants (calculés automatiquement par demande).",
      "Onglet « Campagnes Alex » dans le Centre d'appels : suivez en direct chaque campagne et le résultat de chaque appel (client joint, message laissé, pas de réponse, occupé…), avec la transcription et le résumé IA de la conversation.",
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
