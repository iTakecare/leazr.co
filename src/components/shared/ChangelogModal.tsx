import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { APP_VERSION, CHANGELOG, compareVersions } from "@/lib/changelog";
import { Button } from "@/components/ui/button";

const KEY = "changelog_dismissed_version";

// Modale « Nouveautés » affichée au chargement tant que la dernière version n'a
// pas été marquée comme vue via « Ne plus afficher ».
export default function ChangelogModal() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== APP_VERSION;
    } catch {
      return false;
    }
  });
  if (!open) return null;

  const dismissed = (() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  })();

  // Entrées non encore vues (ou seulement la dernière à la toute première fois).
  const entries = dismissed
    ? CHANGELOG.filter((e) => compareVersions(e.version, dismissed) > 0)
    : [CHANGELOG[0]];
  const shown = entries.length > 0 ? entries : [CHANGELOG[0]];

  const dontShowAgain = () => {
    try {
      localStorage.setItem(KEY, APP_VERSION);
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
            <h2 className="font-semibold">Nouveautés de Leazr</h2>
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">v{APP_VERSION}</span>
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

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Plus tard
          </Button>
          <Button size="sm" onClick={dontShowAgain}>
            Ne plus afficher
          </Button>
        </div>
      </div>
    </div>
  );
}
