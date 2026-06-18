import { useState, useMemo } from "react";
import {
  Rocket, LayoutDashboard, FileText, FolderOpen, Laptop, Package,
  Clock, HelpCircle, Settings, Search, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CLIENT_CHANGELOG, CLIENT_VERSION } from "@/lib/changelog";

const ACCENT = "#2D55E5";
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

// Catégorie « Nouveautés » générée depuis le changelog CLIENT.
const NOUVEAUTES_CATEGORY: Category = {
  id: "nouveautes",
  label: "Nouveautés",
  icon: Sparkles,
  articles: CLIENT_CHANGELOG.map((e) => ({
    id: `version-${e.version}`,
    category: "nouveautes",
    title: `${e.title}`,
    tags: ["nouveautés", "version", e.version, e.date],
    content: `## ${e.title}\n\n*Version ${e.version} — ${fmtDate(e.date)}*\n\n${e.items.map((i) => `- ${i}`).join("\n")}`,
  })),
};

const categories: Category[] = [
  NOUVEAUTES_CATEGORY,
  {
    id: "demarrage",
    label: "Bienvenue",
    icon: Rocket,
    articles: [
      {
        id: "bienvenue",
        category: "demarrage",
        title: "Bienvenue dans votre espace client",
        tags: ["démarrage", "présentation", "navigation"],
        content: `## Votre espace, en un coup d'œil
Votre espace client centralise tout ce qui concerne vos contrats de leasing : suivi, documents, équipements et demandes.

## Ce que vous pouvez faire
- Consulter vos contrats et leur état.
- Retrouver et télécharger vos documents (contrats signés, pièces).
- Suivre vos équipements financés.
- Parcourir le catalogue et faire de nouvelles demandes.
- Contacter le support.

## Naviguer
- Le menu de gauche donne accès à toutes les sections.
- Le bouton « Nouvelle demande » en haut à droite lance une demande à tout moment.
- La recherche en haut retrouve vos contrats et documents.

💡 Conseil : commencez par vérifier vos contrats et documents pour avoir une vue complète de votre parc.`,
      },
    ],
  },
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    articles: [
      {
        id: "tableau-de-bord",
        category: "dashboard",
        title: "Votre tableau de bord",
        tags: ["dashboard", "aperçu", "contrats", "équipements"],
        content: `## Accéder au tableau de bord
Cliquez sur « Tableau de bord » dans le menu.

## Ce que vous y trouvez
- Un aperçu de vos contrats en cours.
- Vos équipements et leur statut.
- Les actions en attente (documents à fournir, demandes en cours).

💡 Conseil : consultez-le régulièrement pour repérer les éléments qui demandent une action de votre part.`,
      },
    ],
  },
  {
    id: "contracts",
    label: "Mes contrats",
    icon: FileText,
    articles: [
      {
        id: "consulter-contrats",
        category: "contracts",
        title: "Consulter vos contrats",
        tags: ["contrats", "leasing", "mensualité", "durée"],
        content: `## Accéder à vos contrats
Cliquez sur « Contrats » dans le menu.

## Le détail d'un contrat
Ouvrez un contrat pour voir : l'équipement financé, la durée, la mensualité, et les documents associés (dont le contrat signé).

💡 Conseil : gardez un œil sur la durée restante de vos contrats pour anticiper les renouvellements.`,
      },
      {
        id: "demander-factures",
        category: "contracts",
        title: "Demander vos factures",
        tags: ["factures", "bailleur", "e-mail", "contrat"],
        content: `## Depuis un contrat
Vous pouvez demander vos factures liées à un contrat directement depuis votre espace.

## Comment faire
1. Ouvrez le contrat concerné.
2. Lancez la demande de factures.
3. Un e-mail pré-rempli s'affiche : vous pouvez le relire et l'ajuster.
4. Envoyez : votre demande part vers le bailleur.

💡 Conseil : vérifiez le contenu de l'e-mail avant l'envoi pour préciser la période ou les factures souhaitées.`,
      },
    ],
  },
  {
    id: "documents",
    label: "Mes documents",
    icon: FolderOpen,
    articles: [
      {
        id: "centre-documents",
        category: "documents",
        title: "Le centre de documents",
        tags: ["documents", "contrats signés", "téléchargement"],
        content: `## Accéder à vos documents
Cliquez sur « Documents » dans le menu.

## Ce que vous y trouvez
- Vos contrats signés (PDF).
- Les documents liés à vos contrats.

## Télécharger
Ouvrez un document pour le consulter ou le télécharger.

💡 Conseil : tous vos documents sont réunis ici — plus besoin de rechercher dans vos e-mails.`,
      },
    ],
  },
  {
    id: "equipment",
    label: "Mes équipements",
    icon: Laptop,
    articles: [
      {
        id: "gerer-equipements",
        category: "equipment",
        title: "Suivre vos équipements",
        tags: ["équipements", "parc", "matériel", "logiciels"],
        content: `## Accéder à vos équipements
Cliquez sur « Équipements » dans le menu.

## Ce que vous y trouvez
La liste des équipements (et logiciels) financés via vos contrats, avec leurs informations.

💡 Conseil : utilisez cette vue pour faire l'inventaire de votre parc financé.`,
      },
    ],
  },
  {
    id: "requests",
    label: "Catalogue & demandes",
    icon: Package,
    articles: [
      {
        id: "faire-demande",
        category: "requests",
        title: "Faire une nouvelle demande",
        tags: ["catalogue", "panier", "demande", "leasing"],
        content: `## Parcourir le catalogue
Cliquez sur « Catalogue » (ou « Logiciels ») dans le menu pour découvrir les équipements disponibles.

## Composer votre demande
1. Ajoutez les produits souhaités à votre panier.
2. Ouvrez le panier et vérifiez votre sélection.
3. Validez pour transmettre votre demande.

## Bouton « Nouvelle demande »
Le bouton en haut à droite vous permet de démarrer une demande à tout moment.

💡 Conseil : regroupez vos besoins dans une même demande pour faciliter le traitement.`,
      },
      {
        id: "suivre-demandes",
        category: "requests",
        title: "Suivre vos demandes",
        tags: ["demandes", "suivi", "statuts"],
        content: `## Accéder à vos demandes
Cliquez sur « Mes demandes » dans le menu. Un badge indique les demandes nécessitant votre attention.

## Suivre l'avancement
Ouvrez une demande pour voir son état et les prochaines étapes (offre à signer, informations à fournir).

💡 Conseil : pensez à signer vos offres rapidement pour accélérer la mise en place de vos contrats.`,
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: HelpCircle,
    articles: [
      {
        id: "contacter-support",
        category: "support",
        title: "Contacter le support",
        tags: ["support", "aide", "contact", "tickets"],
        content: `## Accéder au support
Cliquez sur « Support » dans le menu.

## Comment ça marche
Posez vos questions et suivez les réponses. Un badge vous signale les nouvelles réponses à vos messages.

💡 Conseil : décrivez précisément votre demande (contrat ou équipement concerné) pour une réponse plus rapide.`,
      },
    ],
  },
  {
    id: "settings",
    label: "Mon compte",
    icon: Settings,
    articles: [
      {
        id: "parametres",
        category: "settings",
        title: "Paramètres & accès",
        tags: ["paramètres", "compte", "accès", "collaborateurs"],
        content: `## Accéder aux paramètres
Cliquez sur « Paramètres » dans le menu.

## Gérer votre compte
- Mettez à jour vos informations.
- Plusieurs collaborateurs de votre société peuvent disposer d'un accès à l'espace client.

💡 Conseil : invitez les bonnes personnes (signataire, comptabilité) pour fluidifier signatures et factures.`,
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
        <ul key={`ul-${key}`} style={{ margin: "0 0 12px", padding: 0, listStyle: "none" }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 8, color: "#475569", fontSize: 14, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT, flex: "none", marginTop: 7 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${key}`} style={{ margin: "0 0 12px", paddingLeft: 22, color: "#475569", fontSize: 14 }}>
          {orderedItems.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{item}</li>
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
        <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "18px 0 8px", borderBottom: "1px solid #EEF1F6", paddingBottom: 5 }}>
          {line.replace("## ", "")}
        </h3>
      );
    } else if (line.startsWith("💡")) {
      flushList(String(i));
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: 12, color: "#9A3412", fontSize: 13.5, marginTop: 12 }}>
          <span style={{ flex: "none" }}>💡</span>
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
        <p key={i} style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>
          {line.replace(/\*(.+?)\*/g, "$1")}
        </p>
      );
    }
  });
  flushList("end");
  return elements;
}

export default function ClientHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("demarrage");
  const [selectedArticle, setSelectedArticle] = useState("bienvenue");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [searchQuery]);

  const currentArticle = useMemo(() => {
    for (const cat of filteredCategories) {
      const a = cat.articles.find((x) => x.id === selectedArticle);
      if (a) return a;
    }
    if (filteredCategories.length > 0 && filteredCategories[0].articles.length > 0) {
      return filteredCategories[0].articles[0];
    }
    return null;
  }, [filteredCategories, selectedArticle]);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    const cat = filteredCategories.find((c) => c.id === catId);
    if (cat && cat.articles.length > 0) setSelectedArticle(cat.articles[0].id);
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-.02em", margin: 0 }}>
            Aide & Guide
          </h1>
          <p style={{ fontSize: 13.5, color: "#64748B", marginTop: 4 }}>
            Tout pour bien utiliser votre espace client · Version {CLIENT_VERSION} · mis à jour le {fmtDate(CLIENT_CHANGELOG[0].date)}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 460, marginBottom: 18 }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 11, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", background: "#fff", color: "#0F172A" }}
          />
        </div>

        {/* Body */}
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Categories */}
          <div style={{ width: 250, flex: "none", background: "#fff", border: "1px solid #E6E9EF", borderRadius: 14, padding: 10, minWidth: 220 }}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13.5, color: "#64748B", textAlign: "center" }}>
                Aucun résultat pour<br /><strong>"{searchQuery}"</strong>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const activeCat = selectedCategory === cat.id;
                return (
                  <div key={cat.id} style={{ marginBottom: 2 }}>
                    <button
                      onClick={() => handleCategoryClick(cat.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 11px",
                        borderRadius: 10, border: 0, cursor: "pointer", textAlign: "left",
                        fontSize: 13.5, fontWeight: 600,
                        background: activeCat ? "rgba(45,85,229,.08)" : "transparent",
                        color: activeCat ? ACCENT : "#475569",
                      }}
                    >
                      <Icon size={16} style={{ flex: "none" }} />
                      <span style={{ flex: 1 }}>{cat.label}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>{cat.articles.length}</span>
                    </button>
                    {activeCat && cat.articles.length > 0 && (
                      <div style={{ marginLeft: 26, marginTop: 2, marginBottom: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        {cat.articles.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => { setSelectedCategory(cat.id); setSelectedArticle(a.id); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8, border: 0, cursor: "pointer",
                              fontSize: 12.5,
                              background: selectedArticle === a.id ? ACCENT : "transparent",
                              color: selectedArticle === a.id ? "#fff" : "#64748B",
                              fontWeight: selectedArticle === a.id ? 600 : 500,
                            }}
                          >
                            {a.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Article */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {currentArticle ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>
                  <span>{categories.find((c) => c.id === currentArticle.category)?.label}</span>
                  <span>/</span>
                  <span style={{ color: "#475569" }}>{currentArticle.title}</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 8px", letterSpacing: "-.02em" }}>
                  {currentArticle.title}
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                  {currentArticle.tags.map((tag) => (
                    <span key={tag} style={{ padding: "2px 9px", background: "rgba(45,85,229,.08)", color: ACCENT, borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ background: "#fff", border: "1px solid #E6E9EF", borderRadius: 14, padding: 24 }}>
                  {renderContent(currentArticle.content)}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#94A3B8", padding: "60px 0" }}>
                <HelpCircle size={44} style={{ opacity: 0.4, marginBottom: 12 }} />
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Aucun article trouvé</p>
                <p style={{ fontSize: 13 }}>Essayez une autre recherche</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
