import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  ADMIN_VERSION, ADMIN_CHANGELOG,
  CLIENT_VERSION, CLIENT_CHANGELOG,
  compareVersions, type ChangelogEntry,
} from "@/lib/changelog";
import { Button } from "@/components/ui/button";

// Détermine l'audience à partir de l'URL : la modale ne s'affiche que dans les
// espaces admin et client (jamais sur les pages publiques / login).
function resolveAudience() {
  const m = window.location.pathname.match(/^\/([^/]+)\/(admin|client)(\/|$)/);
  if (!m) return null;
  const slug = m[1];
  const space = m[2] as "admin" | "client";
  if (space === "admin") {
    return {
      key: "changelog_dismissed_version_admin",
      version: ADMIN_VERSION,
      changelog: ADMIN_CHANGELOG,
      title: "Nouveautés de Leazr",
      helpHref: `/${slug}/admin/aide`,
    };
  }
  return {
    key: "changelog_dismissed_version_client",
    version: CLIENT_VERSION,
    changelog: CLIENT_CHANGELOG,
    title: "Nouveautés de votre espace",
    helpHref: `/${slug}/client/aide`,
  };
}

// Modale « Nouveautés » affichée au chargement tant que la dernière version n'a
// pas été marquée comme vue via « Ne plus afficher ».
export default function ChangelogModal() {
  const audience = resolveAudience();

  const [open, setOpen] = useState(() => {
    if (!audience) return false;
    try {
      return localStorage.getItem(audience.key) !== audience.version;
    } catch {
      return false;
    }
  });

  if (!audience || !open) return null;
  const { key, version, changelog, title, helpHref } = audience;

  const dismissed = (() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  })();

  // Entrées non encore vues (ou seulement la dernière à la toute première fois).
  const entries: ChangelogEntry[] = dismissed
    ? changelog.filter((e) => compareVersions(e.version, dismissed) > 0)
    : [changelog[0]];
  const shown = entries.length > 0 ? entries : [changelog[0]];

  const dontShowAgain = () => {
    try {
      localStorage.setItem(key, version);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <h2 className="font-semibold">{title}</h2>
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">v{version}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 hover:bg-white/15 rounded-lg"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {shown.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{entry.title}</h3>
                <span className="text-xs text-muted-foreground">
                  v{entry.version} ·{" "}
                  {new Date(entry.date).toLocaleDateString("fr-BE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <ul className="space-y-1.5">
                {entry.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <a href={helpHref} className="text-xs text-primary hover:underline">
            Voir toute l'aide & l'historique
          </a>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Plus tard
            </Button>
            <Button size="sm" onClick={dontShowAgain}>
              Ne plus afficher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
