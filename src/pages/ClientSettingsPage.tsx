import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  MapPin,
  Receipt,
  UserCog,
  Users,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateClientFromProfile } from "@/services/clientService";
import { useClientData } from "@/hooks/useClientData";
import {
  clientColors,
  ClientPage,
  ClientPageHeader,
  ClientCard,
  ClientEmptyState,
  primaryBtnStyle,
  ghostBtnStyle,
} from "@/components/client/clientUi";

/* ────────────────────────────  Primitives locales (présentation)  ──────────────────────────── */

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: clientColors.muted,
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  fontSize: 13.5,
  color: clientColors.ink,
  background: "#fff",
  border: `1px solid ${clientColors.border}`,
  borderRadius: 10,
  outline: "none",
  fontFamily: "Inter, sans-serif",
};

const Field: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}> = ({ id, label, type = "text", value, onChange, placeholder, disabled, hint }) => (
  <div>
    <label htmlFor={id} style={fieldLabelStyle}>
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        ...inputStyle,
        background: disabled ? clientColors.surface : "#fff",
        color: disabled ? clientColors.faint : clientColors.ink,
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
    {hint && (
      <p style={{ fontSize: 11.5, color: clientColors.faint, margin: "5px 0 0" }}>{hint}</p>
    )}
  </div>
);

/** Tuile d'information lecture seule (maquette : fond surface, bord doux). */
const InfoTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  lines: (string | undefined)[];
}> = ({ icon, title, lines }) => {
  const shown = lines.filter((l) => l && l.trim());
  return (
    <div
      style={{
        background: clientColors.surface,
        border: `1px solid ${clientColors.borderSoft}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: clientColors.indigo, display: "inline-flex" }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: clientColors.ink }}>{title}</span>
      </div>
      {shown.length ? (
        shown.map((l, i) => (
          <div
            key={i}
            style={{ fontSize: 12.5, color: i === 0 ? clientColors.ink : clientColors.muted, lineHeight: 1.5 }}
          >
            {l}
          </div>
        ))
      ) : (
        <div style={{ fontSize: 12.5, color: clientColors.faint }}>Non renseigné</div>
      )}
    </div>
  );
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: clientColors.ink,
  margin: 0,
};

const cardSubStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: clientColors.muted,
  margin: "2px 0 0",
};

/* avatars collaborateurs : couleurs stables d'après l'initiale */
const AVATAR_PALETTE = [
  "#2D55E5",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#059669",
  "#EA580C",
];
const avatarColor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};
const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

/* ────────────────────────────  Page  ──────────────────────────── */

const ClientSettingsPage = () => {
  const { user } = useAuth();
  const { clientData, loading: clientLoading, error: clientError } = useClientData();

  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || user?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [personalInfoLoading, setPersonalInfoLoading] = useState(false);

  const [company, setCompany] = useState(clientData?.company || "");
  const [address, setAddress] = useState(clientData?.address || "");
  const [city, setCity] = useState(clientData?.city || "");
  const [postalCode, setPostalCode] = useState(clientData?.postal_code || "");
  const [country, setCountry] = useState(clientData?.country || "");
  const [vatNumber, setVatNumber] = useState(clientData?.vat_number || "");

  useEffect(() => {
    if (clientData) {
      setCompany(clientData.company || "");
      setAddress(clientData.address || "");
      setCity(clientData.city || "");
      setPostalCode(clientData.postal_code || "");
      setCountry(clientData.country || "");
      setVatNumber(clientData.vat_number || "");
    }
  }, [clientData]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSavePersonalInfo = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Le prénom et le nom sont obligatoires");
      return;
    }

    setPersonalInfoLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        },
      });

      if (updateError) throw updateError;

      if (user?.id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          })
          .eq("id", user.id);

        if (profileError) console.warn("Erreur profil:", profileError);

        if (clientData?.id) {
          const { error: clientErr } = await supabase
            .from("clients")
            .update({
              name: `${firstName.trim()} ${lastName.trim()}`,
              company: company.trim(),
              phone: phone.trim(),
              address: address.trim(),
              city: city.trim(),
              postal_code: postalCode.trim(),
              country: country.trim(),
              vat_number: vatNumber.trim(),
            })
            .eq("id", clientData.id);

          if (clientErr) console.warn("Erreur client:", clientErr);
        } else {
          await updateClientFromProfile(user.id, firstName.trim(), lastName.trim(), phone.trim());
        }
      }

      toast.success("Informations personnelles mises à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour: " + error.message);
    } finally {
      setPersonalInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Tous les champs du mot de passe sont obligatoires");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe modifié avec succès !");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Données société réelles (jamais inventées)
  const collaborators = clientData?.collaborators ?? [];
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  const vatCityLine = [vatNumber, cityLine].filter(Boolean).join(" · ");
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <ClientPage maxWidth={920}>
      <ClientPageHeader
        title="Paramètres"
        subtitle="Gérez votre entreprise et vos collaborateurs."
      />

      {clientError && (
        <ClientCard pad={16} style={{ marginBottom: 18, borderColor: "#FECACA", background: "#FEF2F2" }}>
          <span style={{ fontSize: 13, color: "#B91C1C" }}>
            Impossible de charger les informations de votre entreprise.
          </span>
        </ClientCard>
      )}

      {/* ──────────  Entreprise  ────────── */}
      <ClientCard pad={20} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Logo / tuile */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: clientData?.logo_url ? "#fff" : "linear-gradient(135deg,#16243F,#0E1A30)",
              border: clientData?.logo_url ? `1px solid ${clientColors.border}` : "none",
            }}
          >
            {clientData?.logo_url ? (
              <img
                src={clientData.logo_url}
                alt={company || "Logo"}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <Building2 size={26} color="#fff" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: clientColors.ink }}>
              {company || "Votre entreprise"}
            </div>
            <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 2 }}>
              {vatCityLine || "TVA & adresse à compléter"}
            </div>
          </div>

          <button
            style={ghostBtnStyle}
            onClick={() =>
              document.getElementById("company")?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            <UserCog size={15} />
            Modifier
          </button>
        </div>

        {/* Grille tuiles info (données réelles) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <InfoTile
            icon={<Receipt size={15} />}
            title="Contact facturation"
            lines={[fullName, user?.email, phone]}
          />
          <InfoTile
            icon={<MapPin size={15} />}
            title="Adresse"
            lines={[address, cityLine, country]}
          />
        </div>

        {/* Édition des champs société (préserve les handlers existants) */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${clientColors.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Field id="company" label="Société" value={company} onChange={setCompany} placeholder="Nom de votre société" />
            <Field id="vatNumber" label="Numéro de TVA / SIRET" value={vatNumber} onChange={setVatNumber} placeholder="BE 0123 456 789" />
            <Field id="address" label="Adresse" value={address} onChange={setAddress} placeholder="123 rue de la Paix" />
            <Field id="city" label="Ville" value={city} onChange={setCity} placeholder="Bruxelles" />
            <Field id="postalCode" label="Code postal" value={postalCode} onChange={setPostalCode} placeholder="1000" />
            <Field id="country" label="Pays" value={country} onChange={setCountry} placeholder="Belgique" />
          </div>
        </div>
      </ClientCard>

      {/* ──────────  Informations personnelles  ────────── */}
      <ClientCard pad={20} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <User size={17} color={clientColors.indigo} />
          <div>
            <h2 style={cardTitleStyle}>Informations personnelles</h2>
            <p style={cardSubStyle}>Gérez les informations de votre profil.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Field id="firstName" label="Prénom" value={firstName} onChange={setFirstName} />
          <Field id="lastName" label="Nom" value={lastName} onChange={setLastName} />
          <Field
            id="email"
            label="Email"
            type="email"
            value={user?.email || ""}
            disabled
            hint="L'email ne peut pas être modifié."
          />
          <Field id="phone" label="Téléphone" value={phone} onChange={setPhone} placeholder="+32 1 23 45 67 89" />
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            style={{ ...primaryBtnStyle, opacity: personalInfoLoading ? 0.7 : 1 }}
            onClick={handleSavePersonalInfo}
            disabled={personalInfoLoading}
          >
            {personalInfoLoading ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </ClientCard>

      {/* ──────────  Collaborateurs  ────────── */}
      <ClientCard pad={20} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={17} color={clientColors.indigo} />
            <div>
              <h2 style={cardTitleStyle}>Collaborateurs</h2>
              <p style={cardSubStyle}>Les personnes rattachées à votre entreprise.</p>
            </div>
          </div>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 13px",
              border: "none",
              borderRadius: 10,
              background: "#F0F4FF",
              color: clientColors.indigo,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
            onClick={() =>
              toast.info("L'invitation de collaborateurs sera bientôt disponible. Contactez votre conseiller Leazr.")
            }
          >
            <Plus size={15} />
            Inviter
          </button>
        </div>

        {clientLoading ? (
          <div style={{ fontSize: 13, color: clientColors.muted }}>Chargement…</div>
        ) : collaborators.length === 0 ? (
          <ClientEmptyState
            icon={<Users size={28} color={clientColors.faint} />}
            title="Aucun collaborateur"
            description="Invitez les membres de votre équipe pour partager l'accès à votre espace."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {collaborators.map((c, i) => {
              const color = avatarColor(c.email || c.name || String(i));
              return (
                <div
                  key={c.id || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${clientColors.borderSoft}`,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: `${color}18`,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: clientColors.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.name}
                      {c.is_primary && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: clientColors.indigo,
                            background: "#F0F4FF",
                            padding: "2px 7px",
                            borderRadius: 20,
                          }}
                        >
                          Principal
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: clientColors.faint, marginTop: 1 }}>
                      {c.role || "Collaborateur"}
                      {c.department ? ` · ${c.department}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: clientColors.muted, display: "none" }} />
                  {c.email && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: clientColors.muted,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Mail size={13} color={clientColors.faint} />
                      <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.email}
                      </span>
                    </div>
                  )}
                  <button
                    aria-label="Options"
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      border: "none",
                      background: "transparent",
                      borderRadius: 8,
                      color: clientColors.faint,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => toast.info("Options du collaborateur bientôt disponibles.")}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ClientCard>

      {/* ──────────  Sécurité  ────────── */}
      <ClientCard pad={20}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Shield size={17} color={clientColors.indigo} />
          <div>
            <h2 style={cardTitleStyle}>Sécurité</h2>
            <p style={cardSubStyle}>Modifiez votre mot de passe.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Field
            id="currentPassword"
            label="Mot de passe actuel"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <Field
            id="newPassword"
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <Field
            id="confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            style={{ ...primaryBtnStyle, opacity: passwordLoading ? 0.7 : 1 }}
            onClick={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? "Modification…" : "Changer le mot de passe"}
          </button>
        </div>
      </ClientCard>
    </ClientPage>
  );
};

export default ClientSettingsPage;
