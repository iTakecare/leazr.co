import { useState, useMemo } from "react";
import {
  Rocket, BarChart3, UserCheck, ClipboardList, FileText, Package,
  Truck, Calculator, Wallet, FolderOpen, MessageSquare, Settings,
  Search, HelpCircle, Sparkles, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_CHANGELOG as CHANGELOG, ADMIN_VERSION as APP_VERSION } from "@/lib/changelog";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" });

interface Article {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  articles: Article[];
}

// Catégorie « Nouveautés » générée depuis le changelog (versioning + dates).
const NOUVEAUTES_CATEGORY: Category = {
  id: "nouveautes",
  label: "Nouveautés & versions",
  icon: Sparkles,
  articles: CHANGELOG.map((e) => ({
    id: `version-${e.version}`,
    category: "nouveautes",
    title: `v${e.version} — ${e.title}`,
    tags: ["nouveautés", "version", "changelog", e.version, e.date],
    content: `## ${e.title}\n\n*Version ${e.version} — ${fmtDate(e.date)}*\n\n${e.items.map((i) => `- ${i}`).join("\n")}`,
  })),
};

const categories: Category[] = [
  NOUVEAUTES_CATEGORY,
  {
    id: "demarrage",
    label: "Démarrage rapide",
    icon: Rocket,
    articles: [
      {
        id: "premiers-pas",
        category: "demarrage",
        title: "Premiers pas sur Leazr",
        tags: ["démarrage", "présentation", "modules", "navigation", "leasing"],
        content: `## Bienvenue sur Leazr
Leazr est la plateforme tout-en-un de gestion du leasing d'équipement professionnel (B2B). Elle couvre l'ensemble du cycle : demande, offre, signature, contrat, facturation et suivi.

## Les modules disponibles
- CRM / Clients : gérez vos sociétés clientes, contacts et dossiers KYC
- Demandes : créez et suivez vos offres de leasing (devis)
- Contrats : pilotez les contrats signés et leur cycle de vie (Grenke, e-signature)
- Catalogue : produits, marques, catégories et packs
- Commandes, Sourcing & Stock : équipements à commander et inventaire
- Factures : facturation de vente (Billit / Peppol)
- Gestion : factures d'achat fournisseurs et analyse des coûts
- Documents : pièces des clients et contrats signés
- Collaboration : tâches, chat, support et centre d'appels
- Tableau de bord : vue d'ensemble de l'activité

## Comment naviguer dans l'interface
- La barre latérale gauche donne accès à tous les modules ; survolez-la ou dépliez-la pour voir les libellés.
- Le tableau de bord est accessible en haut de la sidebar.
- La recherche globale (en haut de la sidebar dépliée) retrouve clients, offres et contrats.
- Votre profil et la déconnexion sont en bas de la sidebar.

💡 Conseil : commencez par créer une société cliente dans le CRM — elle sera ensuite disponible dans les demandes, contrats et factures.`,
      },
      {
        id: "cycle-leasing",
        category: "demarrage",
        title: "Le cycle d'une affaire de leasing",
        tags: ["cycle", "workflow", "offre", "contrat", "facture", "démarrage"],
        content: `## De la demande au contrat
Leazr suit le parcours complet d'une opération de leasing :

1. Client : créez (ou retrouvez) la société cliente dans le CRM.
2. Demande / Offre : composez l'équipement depuis le catalogue, la mensualité est calculée à partir du coefficient du bailleur.
3. Envoi & signature : l'offre est envoyée au client, qui la signe électroniquement.
4. Contrat : l'offre signée devient un contrat ; selon le bailleur (ex. Grenke), la signature et le suivi sont synchronisés.
5. Commande & livraison : l'équipement est commandé puis livré.
6. Facturation : les factures de vente sont émises (Billit / Peppol) et les loyers suivis.

## Bon à savoir
- La mensualité = montant financé × coefficient / 100. La vérité comptable reste la mensualité × coefficient.
- Chaque étape conserve l'historique : vous pouvez revenir sur une offre ou un contrat sans perdre de données.

💡 Conseil : travaillez toujours depuis la fiche client ou l'offre pour pré-remplir automatiquement les informations et éviter les erreurs de saisie.`,
      },
    ],
  },
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: BarChart3,
    articles: [
      {
        id: "comprendre-dashboard",
        category: "dashboard",
        title: "Comprendre le tableau de bord",
        tags: ["dashboard", "KPI", "indicateurs", "aperçu", "pilotage"],
        content: `## Accéder au tableau de bord
Cliquez sur « Dashboard » en haut de la sidebar.

## Ce que vous y trouvez
- Les indicateurs clés de l'activité (offres en cours, contrats actifs, facturation).
- Un aperçu des dernières demandes et contrats à traiter.
- Des raccourcis vers les actions courantes.

## Interpréter les chiffres
- Suivez le volume d'offres et leur taux de transformation en contrats.
- Repérez les contrats et factures nécessitant une action (signature, relance, livraison).

💡 Conseil : consultez le tableau de bord chaque matin pour prioriser les dossiers de la journée.`,
      },
    ],
  },
  {
    id: "crm",
    label: "CRM & Clients",
    icon: UserCheck,
    articles: [
      {
        id: "gerer-clients",
        category: "crm",
        title: "Gérer les sociétés clientes",
        tags: ["clients", "CRM", "société", "fiche", "B2B"],
        content: `## Accéder aux clients
Allez dans CRM depuis la sidebar (menu « CRM », route Clients).

## Créer un client
1. Cliquez sur « Nouveau client ».
2. Renseignez la raison sociale, le numéro de TVA/entreprise et les coordonnées.
3. Ajoutez l'adresse et les informations de contact.
4. Enregistrez : le client est désormais disponible dans les demandes, contrats et factures.

## La fiche client
La fiche centralise : informations société, contacts, offres, contrats, documents et historique. Leazr étant exclusivement B2B, chaque client est une société (jamais un particulier).

💡 Conseil : renseignez précisément le numéro de TVA dès la création — il est indispensable pour la facturation et les bailleurs.`,
      },
      {
        id: "multi-utilisateurs-client",
        category: "crm",
        title: "Plusieurs accès pour un même client",
        tags: ["multi-utilisateurs", "accès", "espace client", "contacts"],
        content: `## Plusieurs collaborateurs par société
Un même client peut donner accès à son espace à plusieurs de ses collaborateurs.

## Ajouter un utilisateur à un client
1. Ouvrez la fiche du client.
2. Dans la section des accès / contacts, ajoutez l'adresse e-mail du collaborateur.
3. Une invitation lui permet de créer son accès à l'espace client.

## Bon à savoir
- Chaque utilisateur rattaché au client accède aux mêmes contrats, documents et demandes de la société.
- Vous gardez la maîtrise des accès depuis la fiche client.

💡 Conseil : invitez l'interlocuteur signataire et le responsable comptable de la société pour fluidifier signatures et factures.`,
      },
      {
        id: "kyc",
        category: "crm",
        title: "Dossiers KYC et doublons",
        tags: ["KYC", "doublons", "conformité", "qualité données"],
        content: `## File KYC
La file KYC regroupe les clients dont le dossier de connaissance client doit être complété ou vérifié (pièces, identité, conformité).

## Traiter un dossier
1. Ouvrez la file KYC depuis le CRM.
2. Vérifiez les pièces fournies par le client.
3. Validez ou demandez les documents manquants.

## Détection des doublons
La vue « Doublons » identifie les fiches clients potentiellement en double afin de les fusionner et garder une base propre.

💡 Conseil : traitez le KYC en amont de la signature pour éviter de bloquer la mise en place du contrat côté bailleur.`,
      },
    ],
  },
  {
    id: "offers",
    label: "Demandes & Offres",
    icon: ClipboardList,
    articles: [
      {
        id: "creer-offre",
        category: "offers",
        title: "Créer une offre de leasing",
        tags: ["offre", "demande", "devis", "mensualité", "coefficient", "catalogue"],
        content: `## Accéder aux demandes
Allez dans « Demandes » depuis la sidebar, puis « Nouvelle offre » (ou « Créer une offre »).

## Composer l'offre
1. Sélectionnez le client (ou créez-le).
2. Ajoutez l'équipement depuis le catalogue (produits, packs).
3. Choisissez le bailleur et la durée : la mensualité est calculée via le coefficient.
4. Ajustez la marge / le prix si nécessaire.
5. Vérifiez le récapitulatif (montant financé, mensualité, durée).

## Mensualité et montant financé
- Mensualité = montant financé × coefficient / 100.
- La durée (36, 48 mois…) influe sur le coefficient : vérifiez toujours la cohérence durée / coefficient.

💡 Conseil : une remise commerciale doit être répercutée correctement sur les montants envoyés au bailleur — vérifiez le total avant envoi.`,
      },
      {
        id: "envoi-signature",
        category: "offers",
        title: "Envoyer et faire signer une offre",
        tags: ["envoi", "signature électronique", "statuts", "client"],
        content: `## Envoyer l'offre au client
Depuis la fiche de l'offre, utilisez l'action d'envoi : le client reçoit un lien pour consulter et signer l'offre en ligne.

## Signature électronique
- Le client signe directement depuis son navigateur.
- Selon le bailleur, la signature peut passer par le parcours e-signature du bailleur (ex. Grenke).

## Suivre le statut
L'offre évolue selon son statut (brouillon, envoyée, signée, transformée en contrat). Le statut vous indique l'action suivante à mener.

💡 Conseil : relancez les offres « envoyées » non signées depuis la liste pour accélérer la conversion.`,
      },
    ],
  },
  {
    id: "contracts",
    label: "Contrats",
    icon: FileText,
    articles: [
      {
        id: "gerer-contrats",
        category: "contracts",
        title: "Suivre les contrats",
        tags: ["contrats", "leasing", "statuts", "durée", "bailleur"],
        content: `## Accéder aux contrats
Allez dans « Contrats » depuis la sidebar.

## Origine d'un contrat
Un contrat naît de la transformation d'une offre signée. Il reprend l'équipement, le bailleur, la durée, la mensualité et le client.

## La fiche contrat
Elle centralise : équipement, échéancier / mensualité, documents signés, et le suivi du cycle de vie (mise en place, livraison, en cours, terminé).

## Durée et cohérence
Vérifiez toujours la durée et le coefficient : une durée erronée fausse la mensualité et le montant financé.

💡 Conseil : contrôlez la cohérence mensualité × coefficient à la mise en place pour éviter les écarts dans les indicateurs.`,
      },
      {
        id: "grenke",
        category: "contracts",
        title: "Bailleur Grenke & signature",
        tags: ["Grenke", "bailleur", "e-signature", "BE", "FR", "LU"],
        content: `## Intégration Grenke
Leazr est connecté à Grenke (Belgique, France, Luxembourg) pour les contrats ClassicLease.

## Signature électronique Grenke
- Le parcours de signature peut être délégué à l'e-signature Grenke.
- Le statut du contrat et les documents sont synchronisés automatiquement.

## Documents signés
Le contrat signé (PDF) est récupéré et mis à disposition dans la fiche contrat et dans le centre de documents du client.

💡 Conseil : assurez-vous que le KYC du client est complet avant de soumettre à Grenke afin d'éviter les rejets.`,
      },
      {
        id: "demande-factures-bailleur",
        category: "contracts",
        title: "Demander des factures au bailleur",
        tags: ["factures", "bailleur", "e-mail", "contrat"],
        content: `## Depuis un contrat
Vous pouvez demander au bailleur les factures liées à un contrat directement depuis Leazr.

## Comment faire
1. Ouvrez la fiche du contrat concerné.
2. Lancez la demande de factures au bailleur.
3. Un éditeur d'e-mail complet s'ouvre : vous pouvez modifier l'objet et le corps avant l'envoi.
4. Envoyez : la demande part vers le bailleur.

💡 Conseil : relisez l'e-mail pré-rempli et adaptez-le au contexte du contrat avant d'envoyer.`,
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalogue & Produits",
    icon: Package,
    articles: [
      {
        id: "gerer-catalogue",
        category: "catalog",
        title: "Gérer le catalogue",
        tags: ["catalogue", "produits", "marques", "catégories", "packs"],
        content: `## Accéder au catalogue
Allez dans « Catalogue » depuis la sidebar.

## Produits, marques et catégories
- Créez et éditez les produits avec leurs caractéristiques et prix.
- Chaque produit doit être rattaché à une marque et une catégorie.

## Packs
Des packs regroupent plusieurs produits pour accélérer la composition des offres.

## Catalogue public
Le catalogue peut être exposé publiquement via l'URL de votre société (slug), permettant aux prospects de parcourir l'offre.

💡 Conseil : un produit sans marque ni catégorie peut rester invisible dans certaines listes — renseignez toujours ces deux champs.`,
      },
      {
        id: "import-catalogue",
        category: "catalog",
        title: "Importer des produits",
        tags: ["import", "catalogue", "produits", "fichier"],
        content: `## Import du catalogue
Depuis le catalogue, utilisez la fonction d'import pour ajouter des produits en masse.

## Étapes
1. Préparez votre fichier source de produits.
2. Lancez l'import depuis le catalogue.
3. Vérifiez la correspondance des champs (nom, marque, catégorie, prix).
4. Validez : les produits sont ajoutés au catalogue.

💡 Conseil : vérifiez marques et catégories après import pour garantir la visibilité des produits dans les offres.`,
      },
    ],
  },
  {
    id: "operations",
    label: "Commandes, Sourcing & Stock",
    icon: Truck,
    articles: [
      {
        id: "commandes-equipement",
        category: "operations",
        title: "Commandes d'équipement",
        tags: ["commandes", "équipement", "fournisseurs", "livraison"],
        content: `## Accéder aux commandes
Allez dans « Commandes » depuis la sidebar.

## Rôle du module
Suivez les équipements à commander auprès des fournisseurs pour honorer les contrats signés, jusqu'à la livraison au client.

## Suivre une commande
- Repérez les équipements à commander.
- Suivez l'état d'avancement (à commander, en cours, reçu).

💡 Conseil : déclenchez les commandes dès la signature du contrat pour réduire les délais de livraison.`,
      },
      {
        id: "sourcing",
        category: "operations",
        title: "Sourcing & optimisation",
        tags: ["sourcing", "optimisation", "achat", "prix"],
        content: `## Module Sourcing
Le sourcing vous aide à optimiser l'approvisionnement des équipements (recherche et comparaison d'options d'achat).

## Utilisation
Lancez une analyse de sourcing pour identifier les meilleures options d'équipement à intégrer dans vos offres.

💡 Conseil : utilisez le sourcing en amont de la composition d'offre pour sécuriser vos marges.`,
      },
      {
        id: "stock",
        category: "operations",
        title: "Gérer le stock",
        tags: ["stock", "inventaire", "équipement"],
        content: `## Accéder au stock
Allez dans « Stock » depuis la sidebar.

## Rôle du module
Suivez l'inventaire des équipements disponibles, en commande ou affectés à des contrats.

💡 Conseil : maintenez le stock à jour à chaque réception pour disposer d'une vision fiable des équipements disponibles.`,
      },
    ],
  },
  {
    id: "invoicing",
    label: "Facturation",
    icon: Calculator,
    articles: [
      {
        id: "gerer-factures",
        category: "invoicing",
        title: "Émettre et suivre les factures",
        tags: ["factures", "vente", "Billit", "Peppol", "statuts"],
        content: `## Accéder à la facturation
Allez dans « Factures » depuis la sidebar.

## Émettre une facture
- Les factures de vente sont générées pour les opérations facturables (loyers, équipements).
- En Belgique, l'envoi peut passer par Billit / Peppol pour la facturation électronique.

## Suivre les factures
Suivez le statut de chaque facture (brouillon, envoyée, payée) et identifiez les montants en attente.

💡 Conseil : vérifiez régulièrement les factures en attente pour suivre votre encaissement.`,
      },
    ],
  },
  {
    id: "gestion",
    label: "Gestion (achats)",
    icon: Wallet,
    articles: [
      {
        id: "factures-achat",
        category: "gestion",
        title: "Factures d'achat & analyse des coûts",
        tags: ["gestion", "achats", "fournisseurs", "Billit", "Peppol", "IA"],
        content: `## Accéder à la gestion
Allez dans « Gestion » depuis la sidebar.

## Factures d'achat
Le module centralise les factures d'achat fournisseurs, importées notamment via Billit / Peppol.

## Catégorisation, matching et analyse
- Les factures sont catégorisées et rapprochées (matching) des opérations correspondantes.
- Une analyse IA aide à comprendre la structure des coûts.

💡 Conseil : vérifiez les rapprochements automatiques pour garantir la fiabilité de l'analyse des marges.`,
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FolderOpen,
    articles: [
      {
        id: "centre-documents",
        category: "documents",
        title: "Centre de documents",
        tags: ["documents", "contrats signés", "pièces", "clients"],
        content: `## Accéder aux documents
Allez dans « Documents » depuis la sidebar.

## Ce que vous y trouvez
- Les contrats signés (PDF récupérés auprès des bailleurs).
- Les documents liés aux contrats et aux clients.

## Côté client
Les clients retrouvent leurs contrats signés et documents directement dans leur espace client.

💡 Conseil : centraliser les documents ici évite les échanges d'e-mails et facilite l'accès du client à ses pièces.`,
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: MessageSquare,
    articles: [
      {
        id: "taches",
        category: "collaboration",
        title: "Tâches",
        tags: ["tâches", "équipe", "assignation", "suivi"],
        content: `## Accéder aux tâches
Allez dans « Tâches » depuis la sidebar.

## Rôle du module
Créez, assignez et suivez des tâches au sein de votre équipe. Un badge indique les tâches non lues qui vous sont assignées.

💡 Conseil : reliez les tâches aux dossiers (offre, contrat, client) pour garder le contexte au même endroit.`,
      },
      {
        id: "messagerie-support",
        category: "collaboration",
        title: "Chat, messagerie & support",
        tags: ["chat", "messagerie", "WhatsApp", "SMS", "e-mail", "support"],
        content: `## Chat Admin
Le chat centralise les conversations avec vos clients et prospects.

## Messagerie multicanale
Leazr prend en charge plusieurs canaux : e-mail (boîtes IMAP/SMTP), WhatsApp et SMS. Vous gérez les échanges depuis une boîte unifiée, avec des suggestions assistées par IA.

## Support
Le module « Support » regroupe conversations, demandes de contact, tickets et e-mails entrants. Un badge signale les éléments en attente.

💡 Conseil : utilisez les modèles d'e-mail et les suggestions IA pour répondre plus vite tout en gardant un ton cohérent.`,
      },
      {
        id: "centre-appels",
        category: "collaboration",
        title: "Centre d'appels & téléphonie",
        tags: ["téléphonie", "appels", "softphone", "transcription", "IA vocale"],
        content: `## Accéder au centre d'appels
Allez dans « Centre d'appels » depuis la sidebar.

## Fonctions de téléphonie
- Softphone intégré pour passer et recevoir des appels.
- Transcription automatique des appels.
- Gestion des appels entrants depuis le centre d'appels.

💡 Conseil : retrouvez la transcription d'un appel pour reprendre le contexte avant de rappeler un client.`,
      },
    ],
  },
  {
    id: "espace-client",
    label: "Espace client",
    icon: Users,
    articles: [
      {
        id: "espace-client-presentation",
        category: "espace-client",
        title: "L'espace client",
        tags: ["espace client", "documents", "contrats", "demandes", "multi-utilisateurs"],
        content: `## À quoi sert l'espace client
L'espace client donne à vos clients un accès autonome à leurs informations : contrats, documents signés, demandes et catalogue.

## Ce que le client peut faire
- Consulter ses contrats et documents (contrats signés, pièces).
- Demander des factures au bailleur depuis un contrat.
- Accéder à plusieurs (plusieurs collaborateurs d'une même société peuvent disposer d'un accès).

## Gérer l'accès
Les accès se pilotent depuis la fiche client dans le CRM (voir « Plusieurs accès pour un même client »).

💡 Conseil : invitez vos clients à utiliser leur espace pour réduire les sollicitations par e-mail.`,
      },
    ],
  },
  {
    id: "parametres",
    label: "Paramètres",
    icon: Settings,
    articles: [
      {
        id: "parametres-generaux",
        category: "parametres",
        title: "Paramètres de la société",
        tags: ["paramètres", "société", "branding", "abonnement", "utilisateurs"],
        content: `## Accéder aux paramètres
Cliquez sur « Paramètres » en bas de la sidebar.

## Ce que vous pouvez configurer
- Informations et identité de la société (branding, logo).
- Utilisateurs et accès de votre équipe.
- Abonnement et options de votre compte Leazr.
- Réglages liés aux modules (catalogue, intégrations, etc.).

💡 Conseil : soignez le branding (logo, nom) — il apparaît sur les offres, l'espace client et les documents transmis à vos clients.`,
      },
    ],
  },
];

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="text-muted-foreground ml-4 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${key}`} className="space-y-1 mb-3 list-decimal ml-6">
          {orderedItems.map((item, i) => (
            <li key={i} className="text-muted-foreground">
              {item}
            </li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList(String(i));
      elements.push(
        <h3 key={i} className="font-semibold text-foreground mt-4 mb-2 text-base border-b border-border pb-1">
          {line.replace("## ", "")}
        </h3>
      );
    } else if (line.startsWith("💡")) {
      flushList(String(i));
      elements.push(
        <div key={i} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-amber-800 dark:text-amber-300 text-sm mt-3 flex items-start gap-2">
          <span className="flex-shrink-0">💡</span>
          <span>{line.replace("💡 ", "").replace("💡", "")}</span>
        </div>
      );
    } else if (line.startsWith("- ")) {
      if (orderedItems.length > 0) flushList(String(i));
      listItems.push(line.replace("- ", ""));
    } else if (/^\d+\.\s/.test(line)) {
      if (listItems.length > 0) flushList(String(i));
      orderedItems.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList(String(i));
    } else {
      flushList(String(i));
      elements.push(
        <p key={i} className="text-muted-foreground mb-2 text-sm leading-relaxed">
          {line.replace(/\*(.+?)\*/g, "$1")}
        </p>
      );
    }
  });
  flushList("end");

  return elements;
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("demarrage");
  const [selectedArticle, setSelectedArticle] = useState("premiers-pas");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query) ||
            article.tags.some((tag) => tag.toLowerCase().includes(query))
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [searchQuery]);

  const currentArticle = useMemo(() => {
    for (const cat of filteredCategories) {
      const article = cat.articles.find((a) => a.id === selectedArticle);
      if (article) return article;
    }
    if (filteredCategories.length > 0 && filteredCategories[0].articles.length > 0) {
      return filteredCategories[0].articles[0];
    }
    return null;
  }, [filteredCategories, selectedArticle]);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    const cat = filteredCategories.find((c) => c.id === catId);
    if (cat && cat.articles.length > 0) {
      setSelectedArticle(cat.articles[0].id);
    }
  };

  const handleArticleClick = (articleId: string, catId: string) => {
    setSelectedCategory(catId);
    setSelectedArticle(articleId);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <HelpCircle className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Aide & Guide</h1>
            <p className="text-sm text-muted-foreground">
              Documentation complète de Leazr ·{" "}
              <span className="font-medium text-foreground">Version {APP_VERSION}</span> · mis à jour le{" "}
              {fmtDate(CHANGELOG[0].date)}
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative max-w-2xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar categories */}
        <div className="w-64 flex-shrink-0 bg-card border-r border-border overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center mt-8">
              Aucun résultat pour
              <br />
              <span className="font-medium text-foreground">"{searchQuery}"</span>
            </div>
          ) : (
            <nav className="p-3 space-y-1">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const isActiveCat = selectedCategory === cat.id;
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => handleCategoryClick(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                        isActiveCat
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      <span>{cat.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{cat.articles.length}</span>
                    </button>
                    {isActiveCat && cat.articles.length > 0 && (
                      <div className="ml-7 mt-1 mb-1 space-y-0.5">
                        {cat.articles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => handleArticleClick(article.id, cat.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                              selectedArticle === article.id
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            {article.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Article content */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentArticle ? (
            <div className="max-w-3xl">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                {(() => {
                  const cat = categories.find((c) => c.id === currentArticle.category);
                  return (
                    <>
                      <span>{cat?.label}</span>
                      <span>/</span>
                      <span className="text-foreground">{currentArticle.title}</span>
                    </>
                  );
                })()}
              </div>

              {/* Article header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">{currentArticle.title}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {currentArticle.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Article body */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                {renderContent(currentArticle.content)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <HelpCircle size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">Aucun article trouvé</p>
              <p className="text-sm">Essayez une autre recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
