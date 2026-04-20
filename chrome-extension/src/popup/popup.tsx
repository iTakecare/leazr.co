import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import type { SourcingContext, SourceConnectionStatus } from "../lib/types";

interface SourceStatusRow {
  key: string;
  displayName: string;
  requiresCookies: boolean;
  loginUrl?: string;
  status: SourceConnectionStatus;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<SourcingContext | null>(null);
  const [tab, setTab] = useState<"home" | "sources">("home");
  const [sources, setSources] = useState<SourceStatusRow[] | null>(null);
  const [checkingSources, setCheckingSources] = useState(false);

  const supa = getSupabase();

  const refreshSources = async () => {
    setCheckingSources(true);
    try {
      const resp = await new Promise<{ success: boolean; sources?: SourceStatusRow[]; error?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: "check_all_sources_status" }, (r) => resolve(r));
      });
      if (resp?.success && resp.sources) setSources(resp.sources);
    } catch (e) {
      console.error("refresh sources failed", e);
    } finally {
      setCheckingSources(false);
    }
  };

  // Init: check session + context
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      setUser(session?.user ?? null);

      const r = await chrome.storage.local.get("sourcing_context");
      const ctx = r.sourcing_context as SourcingContext | undefined;
      if (ctx && new Date(ctx.expires_at).getTime() > Date.now()) {
        setContext(ctx);
      }

      setLoading(false);
    })();

    const { data: listener } = supa.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supa]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supa.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supa.auth.signOut();
    setUser(null);
  };

  const clearContext = async () => {
    await chrome.storage.local.remove("sourcing_context");
    setContext(null);
  };

  if (loading) {
    return (
      <div>
        <div className="hd">
          <span style={{ fontSize: 18 }}>🦎</span>
          <h1>Leazr Sourcing</h1>
        </div>
        <div className="empty">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <div className="hd">
          <span style={{ fontSize: 18 }}>🦎</span>
          <h1>Leazr Sourcing</h1>
        </div>
        <form onSubmit={handleLogin} className="stack">
          {error && <div className="err">{error}</div>}
          <div>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
              Email Leazr
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@itakecare.be"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
              Mot de passe
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            Se connecter
          </button>
        </form>
      </div>
    );
  }

  const timeLeft = context ? Math.max(0, new Date(context.expires_at).getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / 3_600_000);

  return (
    <div>
      <div className="hd">
        <span style={{ fontSize: 18 }}>🦎</span>
        <h1>Leazr Sourcing</h1>
        <span className="badge">v0.1</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
        <button
          className="btn btn-ghost"
          onClick={() => setTab("home")}
          style={{
            flex: 1,
            borderRadius: 0,
            borderBottom: tab === "home" ? "2px solid #4f46e5" : "2px solid transparent",
            color: tab === "home" ? "#3730a3" : "#64748b",
            fontWeight: tab === "home" ? 700 : 500,
          }}
        >
          Accueil
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setTab("sources");
            if (!sources) refreshSources();
          }}
          style={{
            flex: 1,
            borderRadius: 0,
            borderBottom: tab === "sources" ? "2px solid #4f46e5" : "2px solid transparent",
            color: tab === "sources" ? "#3730a3" : "#64748b",
            fontWeight: tab === "sources" ? 700 : 500,
          }}
        >
          Sources
        </button>
      </div>

      {tab === "sources" && (
        <div className="section">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Statut des fournisseurs</h2>
            <button
              className="btn btn-ghost"
              style={{ width: "auto", fontSize: 11 }}
              onClick={refreshSources}
              disabled={checkingSources}
            >
              {checkingSources ? "⏳" : "↻"} Retester
            </button>
          </div>
          {!sources && checkingSources && (
            <div className="empty">Vérification en cours…</div>
          )}
          {sources && (
            <div className="stack">
              {sources.map((s) => {
                const ok = s.status.connected;
                return (
                  <div
                    key={s.key}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${ok ? "#10b981" : "#ef4444"}`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18, marginTop: 2 }}>
                      {ok ? "🟢" : "🔴"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {s.displayName}
                        {s.requiresCookies && (
                          <span
                            style={{
                              marginLeft: 4,
                              fontSize: 9,
                              color: "#4338ca",
                              background: "#eef2ff",
                              padding: "1px 4px",
                              borderRadius: 3,
                            }}
                          >
                            AUTH
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {ok
                          ? ("user_info" in s.status && s.status.user_info) ||
                            "Connectée"
                          : "reason" in s.status && s.status.reason === "not_logged_in"
                          ? "Non connecté (cookies manquants)"
                          : "message" in s.status && s.status.message
                          ? s.status.message
                          : "Indisponible"}
                      </div>
                      {!ok && s.loginUrl && (
                        <button
                          className="btn btn-ghost"
                          style={{
                            marginTop: 6,
                            width: "auto",
                            fontSize: 11,
                            color: "#4f46e5",
                            borderColor: "#c7d2fe",
                          }}
                          onClick={() => chrome.tabs.create({ url: s.loginUrl! })}
                        >
                          🔗 Ouvrir le site
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 10, lineHeight: 1.5 }}>
            <strong>AUTH</strong> = source qui a besoin que tu sois connecté dans Chrome
            (Amazon Business par ex). Aucun mot de passe n'est stocké dans l'extension :
            elle réutilise tes cookies actifs.
          </div>
        </div>
      )}

      {tab === "home" && (
        <>
      <div className="section">
        <h2>Commande en cours</h2>
        {context ? (
          <div className="card">
            <div className="k">{context.type.replace(/_/g, " ")}</div>
            <div className="v">{context.label}</div>
            {context.order_label && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {context.order_label}
              </div>
            )}
            {context.client_name && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Client : {context.client_name}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
              Expire dans {hoursLeft}h
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, width: "100%" }}
              onClick={clearContext}
            >
              Retirer ce contexte
            </button>
          </div>
        ) : (
          <div className="empty">
            Aucune commande sélectionnée.<br />
            <span style={{ fontSize: 11 }}>
              Depuis Leazr, cliquez sur « Sourcer avec l'extension » dans une commande.
            </span>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Comment utiliser</h2>
        <div className="card" style={{ lineHeight: 1.6 }}>
          1. Dans Leazr, ouvrez une commande et cliquez sur « Sourcer avec extension »<br />
          2. Naviguez sur un site fournisseur (Coolblue, Mediamarkt…)<br />
          3. Un badge 🦎 apparaît sur la page produit<br />
          4. Cliquez sur « Ajouter à la commande »
        </div>
      </div>
        </>
      )}

      <div className="user-info">
        <span>{user.email}</span>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ width: "auto" }}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
