import React, { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, Trash2, Loader2, Copy, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClientCard, clientColors, primaryBtnStyle, ghostBtnStyle, badgeStyle } from "@/components/client/clientUi";

interface Member {
  user_id: string;
  name: string;
  email: string;
  is_primary: boolean;
  role: string;
}

const ClientTeamAccess: React.FC<{ clientId?: string }> = ({ clientId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "" });
  const [created, setCreated] = useState<{ email: string; password: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("invite-client-user", {
        body: { action, client_id: clientId, ...extra },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    [clientId]
  );

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await call("list");
      setMembers(data.members || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId, call]);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!form.email.trim()) { toast.error("L'email est requis."); return; }
    setSaving(true);
    setCreated(null);
    try {
      const data = await call("invite", { email: form.email, first_name: form.first_name, last_name: form.last_name });
      if (data.temp_password) {
        setCreated({ email: data.email, password: data.temp_password });
        toast.success("Utilisateur invité — communiquez-lui son mot de passe.");
      } else {
        toast.success(data.already_existed ? "Compte existant rattaché à votre espace." : "Utilisateur invité.");
      }
      setForm({ email: "", first_name: "", last_name: "" });
      setShowInvite(false);
      load();
    } catch (e: any) {
      toast.error("Échec de l'invitation : " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Member) => {
    if (!confirm(`Retirer l'accès de ${m.name} ?`)) return;
    try {
      await call("remove", { user_id: m.user_id });
      setMembers((arr) => arr.filter((x) => x.user_id !== m.user_id));
      toast.success("Accès retiré");
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message || ""));
    }
  };

  const copyPwd = () => {
    if (!created?.password) return;
    navigator.clipboard.writeText(created.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <ClientCard pad={22} style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} color={clientColors.indigo} /> Utilisateurs ayant accès
          </div>
          <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 3 }}>
            Donnez l'accès à votre espace à vos collègues. Chacun a son propre identifiant.
          </div>
        </div>
        <button style={primaryBtnStyle} onClick={() => { setShowInvite((v) => !v); setCreated(null); }}>
          <UserPlus size={15} /> Inviter
        </button>
      </div>

      {showInvite && (
        <div style={{ background: clientColors.surface, border: `1px solid ${clientColors.borderSoft}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} style={inputStyle} />
            <input placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} style={inputStyle} />
          </div>
          <input placeholder="email@société.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button style={ghostBtnStyle} onClick={() => setShowInvite(false)}>Annuler</button>
            <button style={primaryBtnStyle} onClick={invite} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Envoyer l'invitation
            </button>
          </div>
        </div>
      )}

      {created?.password && (
        <div style={{ background: "#E7F6F0", border: "1px solid #C7EBDA", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#047857", display: "flex", alignItems: "center", gap: 7 }}>
            <ShieldCheck size={15} /> Compte créé pour {created.email}
          </div>
          <div style={{ fontSize: 12.5, color: "#047857", marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
            Mot de passe : <code style={{ background: "#fff", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>{created.password}</code>
            <button onClick={copyPwd} style={{ ...ghostBtnStyle, height: 28, padding: "0 10px" }}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: "#047857", marginTop: 6, opacity: 0.85 }}>
            Transmettez-le par un canal sûr. Invitez la personne à le changer à la première connexion.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: clientColors.faint, fontSize: 13, padding: "14px 0" }}>
          <Loader2 size={15} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: clientColors.surface, border: `1px solid ${clientColors.borderSoft}`, borderRadius: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(140deg,#7C3AED,#2D55E5)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {initials(m.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: clientColors.ink }}>{m.name}</span>
                  {m.is_primary && <span style={badgeStyle("#EAF0FF", "#1D4ED8")}>Principal</span>}
                </div>
                <div style={{ fontSize: 12, color: clientColors.faint }}>{m.email}</div>
              </div>
              {!m.is_primary && (
                <button onClick={() => remove(m)} title="Retirer l'accès" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E5EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
                  <Trash2 size={14} color="#DC2626" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </ClientCard>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #E2E5EC",
  borderRadius: 11,
  padding: "0 13px",
  fontSize: 13.5,
  outline: "none",
  background: "#fff",
};

export default ClientTeamAccess;
