import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import type { SourcingContext } from "../lib/types";

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<SourcingContext | null>(null);

  const supa = getSupabase();

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
