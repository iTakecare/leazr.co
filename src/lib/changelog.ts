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
export const ADMIN_VERSION = "1.3.32";

export const ADMIN_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.32",
    date: "2026-06-28",
    title: "Commandes fournisseurs : correction de l'onglet « Tous »",
    items: [
      "Le passage sur l'onglet « Tous » de l'écran des commandes fournisseurs ne provoque plus d'erreur : les lignes dont le statut était vide ou inconnu sont désormais affichées comme « À commander » par défaut au lieu de faire planter la page.",
    ],
  },
  {
    version: "1.3.31",
    date: "2026-06-26",
    title: "Envoi d'offre par mail : choix de la langue",
    items: [
      "La modale « Envoyer l'offre par email » propose un sélecteur de langue (FR/NL/EN/DE) pré-réglé sur la langue du client : objet, texte d'accompagnement et signature s'adaptent à la langue choisie.",
    ],
  },
  {
    version: "1.3.30",
    date: "2026-06-26",
    title: "Sélecteur de langue visible dans l'analyse de dossier",
    items: [
      "Un sélecteur de langue (FR/NL/EN/DE) est désormais affiché directement dans la modale d'analyse de dossier : Score B (demande de documents), Score C (email de refus) et Score D (clôture sans suite), ainsi que dans les modales d'acceptation et de relance.",
      "Il est pré-réglé sur la langue de communication du client mais modifiable à la volée pour chaque envoi. Le contenu de l'email s'adapte instantanément à la langue choisie.",
    ],
  },
  {
    version: "1.3.29",
    date: "2026-06-26",
    title: "Communications dans la langue du client (FR/NL/EN/DE)",
    items: [
      "Nouveau champ « Langue de communication » sur la fiche client (carte « Messagerie & appels IA ») : français par défaut, ou néerlandais, anglais, allemand. Cette langue pilote automatiquement toutes les communications envoyées à ce client.",
      "Les e-mails commerciaux sont désormais localisés : félicitations (acceptation de leasing), refus, clôture sans suite (Score D), relances de documents et d'offres, et confirmation de contrat signé.",
      "Les aperçus dans les modales (acceptation, refus, clôture) reflètent la langue du client avant l'envoi. Pour les relances en NL/EN/DE, un gabarit traduit intégré est utilisé ; le français conserve vos templates d'entreprise personnalisés.",
      "S'ajoute à la demande de documents déjà multilingue. La langue choisie au moment de l'envoi (modale de demande de documents) reste prioritaire sur la préférence du client.",
    ],
  },
  {
    version: "1.3.28",
    date: "2026-06-26",
    title: "Demande de documents : choix de la langue (FR/NL/EN/DE)",
    items: [
      "La modale « Demander des documents » (analyse de score, onglet Documents, Centre d'appels) propose désormais un sélecteur de langue : français par défaut, ou néerlandais, anglais et allemand.",
      "L'e-mail et le SMS/WhatsApp de demande — ainsi que les relances — sont alors rédigés dans la langue choisie : libellés des documents traduits, texte du message et bouton de téléversement localisés.",
      "En NL/EN/DE, si aucun gabarit personnalisé n'est configuré, un gabarit d'e-mail intégré et traduit est utilisé automatiquement (le français continue d'utiliser votre modèle d'entreprise habituel).",
    ],
  },
  {
    version: "1.3.27",
    date: "2026-06-24",
    title: "Alex multilingue : détection automatique de la langue",
    items: [
      "Nouvelle section « Langues & détection automatique » dans l'onglet Configuration d'Alex : elle affiche les langues activées sur l'agent (FR/NL/EN/DE) et un interrupteur « Détection automatique de la langue ».",
      "Une fois activée, Alex repère la langue parlée par le client — au téléphone comme sur un répondeur — et bascule tout seul vers le néerlandais, l'anglais ou l'allemand en cours d'appel, sans réglage préalable. Idéal pour relancer un public multilingue sur ses documents.",
    ],
  },
  {
    version: "1.3.26",
    date: "2026-06-24",
    title: "Badge Support : compteur des messages en attente",
    items: [
      "L'icône Support de la barre latérale affiche désormais une pastille rouge avec le nombre de conversations WhatsApp/SMS en attente de réponse, en plus des réponses de tickets non lues. Le compteur se met à jour en temps réel : plus besoin d'ouvrir le Support pour savoir qu'un client a écrit.",
    ],
  },
  {
    version: "1.3.25",
    date: "2026-06-24",
    title: "Bandeau « Nouvelle version » plus visible",
    items: [
      "La notification de mise à jour de Leazr est désormais une carte plus grande avec un gros bouton « Recharger maintenant », plus difficile à manquer.",
    ],
  },
  {
    version: "1.3.24",
    date: "2026-06-24",
    title: "Centre d'appels : onglet Configuration d'Alex",
    items: [
      "Nouvel onglet « Configuration » dans le Centre d'appels pour paramétrer l'agent vocal Alex directement depuis Leazr : prompt système, message d'ouverture par défaut, langue, voix et modèle ElevenLabs (voice ID, modèle TTS, stabilité, vitesse, similarité), modèle LLM et température. Les modifications sont enregistrées sur l'agent ElevenLabs en un clic.",
      "Coach Alex intégré à l'onglet : les rapports d'analyse des transcriptions (hebdomadaires + à la demande via « Analyser maintenant ») s'affichent désormais dans l'interface, plus seulement par email.",
      "Dialogue avec le Coach Alex : vous pouvez discuter avec le coach pour refondre le prompt sur la base de l'analyse des appels. Quand il propose un prompt système ou un message d'ouverture complet, un bouton « Appliquer » le verse directement dans le formulaire de configuration.",
    ],
  },
  {
    version: "1.3.23",
    date: "2026-06-24",
    title: "Lookup BCE : message d'erreur clair sur numéro invalide",
    items: [
      "Le lookup automatique BCE valide désormais le numéro d'entreprise belge (checksum modulo 97) avant d'interroger la Banque-Carrefour : si le numéro est invalide (ex. un identifiant de lead Meta collé par erreur dans le champ TVA), un message explicite l'indique au lieu de l'erreur technique « Edge Function returned a non-2xx status code ».",
      "Les échecs de lookup remontent maintenant proprement leur vraie cause dans la notification, plus seulement dans l'historique.",
    ],
  },
  {
    version: "1.3.22",
    date: "2026-06-24",
    title: "Alignement Grenke propagé à la demande et à la facture",
    items: [
      "Au « Pousser vers Billit » d'une facture bailleur alignée sur Grenke, les montants réels Grenke sont désormais propagés à la demande (prix de vente par bien + marge recalculée), au montant financé de l'offre et à la facture — tout affiche exactement les mêmes chiffres.",
      "Demande, facture et Billit sont ainsi parfaitement cohérents avec le dossier Grenke.",
    ],
  },
  {
    version: "1.3.21",
    date: "2026-06-23",
    title: "Leasers : mode de paiement et échéance des factures",
    items: [
      "Dans Paramètres → Leasers, chaque bailleur a désormais un « Mode de paiement » (virement, domiciliation…) et un « Délai de paiement (jours) ». Ils alimentent automatiquement la date d'échéance et le mode de paiement de la facture poussée vers Billit.",
      "La date d'échéance d'une facture bailleur = date de facture + le délai paramétré sur le bailleur.",
      "Si ces paramètres manquent, un avertissement s'affiche avant l'envoi vers Billit.",
      "Correctif au passage : la fréquence de facturation et la règle de démarrage de contrat du bailleur sont désormais bien enregistrées (elles ne l'étaient pas).",
    ],
  },
  {
    version: "1.3.20",
    date: "2026-06-23",
    title: "Statistiques Alex : tarif ElevenLabs pré-réglé",
    items: [
      "Le tarif des appels Alex est désormais pré-réglé sur l'abonnement ElevenLabs en cours (plan Creator : ≈ 0,068 €/1000 crédits) — le coût en euros s'affiche correctement sans rien saisir. Le champ reste modifiable si l'abonnement change.",
    ],
  },
  {
    version: "1.3.19",
    date: "2026-06-23",
    title: "Statistiques Alex : coût € basé sur la conso réelle ElevenLabs",
    items: [
      "Le coût en euros est désormais calculé sur la consommation RÉELLE de crédits ElevenLabs rapatriée pour chaque appel (et non plus une estimation à la minute) : coût total et coût par appel.",
      "Le tarif se règle en « €/1000 crédits » (selon votre abonnement ElevenLabs) ; le nombre de crédits réels par appel est affiché.",
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
export const CLIENT_VERSION = "1.2.0";

export const CLIENT_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-06-26",
    title: "Vos communications dans votre langue",
    items: [
      "Vos e-mails (confirmation d'acceptation, relances, demandes de documents, contrat signé…) peuvent désormais vous parvenir en français, néerlandais, anglais ou allemand.",
      "Indiquez votre langue préférée à votre interlocuteur : toutes vos communications s'y adapteront automatiquement.",
    ],
  },
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
