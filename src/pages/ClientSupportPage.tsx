import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MessageSquare, FileText, Plus, Send, Clock, Loader2, ArrowLeft, Paperclip, Download, User, Shield, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getFileUploadClient } from "@/integrations/supabase/client";
import { useClientData } from "@/hooks/useClientData";
import { useTicketReplyNotifications } from "@/hooks/useTicketReplyNotifications";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  clientColors,
  CLIENT_GRADIENT,
  ClientPage,
  ClientPageHeader,
  ClientCard,
  StatusBadge,
  primaryBtnStyle,
  ghostBtnStyle,
  ClientEmptyState,
} from "@/components/client/clientUi";

const TICKET_CATEGORIES = [
  { value: "technical", label: "Problème technique" },
  { value: "billing", label: "Question facturation" },
  { value: "modification", label: "Demande de modification" },
  { value: "other", label: "Autre" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  color: clientColors.muted,
  margin: "0 0 12px",
};

/* ────────────────────────────  Bandeau contacts  ──────────────────────────── */

const CONTACT_ITEMS = [
  { icon: Phone, label: "Téléphone", value: "+32 (0)71 49 16 85" },
  { icon: Mail, label: "E-mail", value: "support@itakecare.be" },
  { icon: Clock, label: "Horaires", value: "Lun - Ven : 9h - 18h" },
];

const ContactsBanner = () => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 14,
      padding: "16px 18px",
      borderRadius: 14,
      background: "#F0F4FF",
      border: "1px solid #DCE5FB",
      marginBottom: 26,
    }}
  >
    {CONTACT_ITEMS.map(({ icon: Icon, label, value }) => (
      <div key={label} style={{ display: "flex", alignItems: "center", gap: 11, flex: "1 1 200px", minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 1px 2px rgba(16,24,40,.05)",
          }}
        >
          <Icon size={17} color={clientColors.indigo} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: clientColors.faint, textTransform: "uppercase", letterSpacing: ".03em" }}>
            {label}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: clientColors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ClientSupportPage = () => {
  const queryClient = useQueryClient();
  const { clientData } = useClientData();
  const [showForm, setShowForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", category: "technical", description: "" });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const subject = searchParams.get("subject");
    const category = searchParams.get("category");
    const description = searchParams.get("description");
    if (subject || description) {
      setForm({
        subject: subject || "",
        category: category || "technical",
        description: description || "",
      });
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const clientId = clientData?.id;
  const companyId = (clientData as any)?.company_id;

  // Fetch client tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["client-tickets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").insert({
        client_id: clientId!,
        company_id: companyId!,
        subject: form.subject,
        category: form.category,
        description: form.description,
        status: "open",
        priority: "medium",
        created_by_client: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      toast.success("Ticket créé avec succès");
      setForm({ subject: "", category: "technical", description: "" });
      setShowForm(false);
    },
    onError: () => toast.error("Erreur lors de la création du ticket"),
  });

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  if (selectedTicket) {
    return (
      <ClientTicketDetail
        ticket={selectedTicket}
        onBack={() => setSelectedTicketId(null)}
        clientName={clientData?.name || "Client"}
      />
    );
  }

  return (
    <ClientPage maxWidth={920}>
      <ClientPageHeader
        title="Support"
        subtitle="Une question, une panne ? Notre équipe vous répond sous 24h."
        action={
          <button style={primaryBtnStyle} onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            Ouvrir un ticket
          </button>
        }
      />

      {/* Bandeau contacts */}
      <ContactsBanner />

      {/* Formulaire de création */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 26 }}
        >
          <ClientCard pad={20}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: clientColors.ink, margin: "0 0 16px" }}>
              Nouveau ticket
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>
                  Sujet
                </label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Décrivez brièvement votre problème"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>
                  Catégorie
                </label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez votre problème en détail..."
                rows={4}
                className="rounded-xl"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={ghostBtnStyle} onClick={() => setShowForm(false)}>Annuler</button>
              <button
                style={{ ...primaryBtnStyle, opacity: !form.subject || !form.description || createTicket.isPending ? 0.55 : 1 }}
                onClick={() => createTicket.mutate()}
                disabled={!form.subject || !form.description || createTicket.isPending}
              >
                {createTicket.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Envoyer
              </button>
            </div>
          </ClientCard>
        </motion.div>
      )}

      {/* Mes tickets */}
      <div style={{ marginBottom: 30 }}>
        <p style={sectionLabelStyle}>Mes tickets ({tickets.length})</p>
        {ticketsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 70, borderRadius: 16, background: clientColors.borderSoft }} className="animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <ClientEmptyState
            icon={<FileText size={40} color={clientColors.faint} />}
            title="Aucun ticket pour le moment"
            description="Ouvrez un ticket pour contacter notre équipe support."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tickets.map((ticket: any) => {
              const replyCount = typeof ticket.reply_count === "number" ? ticket.reply_count : null;
              const catLabel = TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category;
              return (
                <ClientCard
                  key={ticket.id}
                  pad="14px 16px"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="ticket-row"
                  style={{ cursor: "pointer", transition: "border-color .15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#C9D2E4")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = clientColors.border)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ticket.subject}
                        </span>
                        <StatusBadge status={ticket.status} label={STATUS_LABELS[ticket.status] || ticket.status} />
                      </div>
                      <div style={{ fontSize: 12.5, color: clientColors.muted }}>
                        {catLabel} · {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                        {replyCount !== null && ` · ${replyCount} message${replyCount > 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <ChevronRight size={18} color={clientColors.faint} style={{ flexShrink: 0 }} />
                  </div>
                </ClientCard>
              );
            })}
          </div>
        )}
      </div>

    </ClientPage>
  );
};

// ---- Client Ticket Detail sub-component ----
interface ClientTicketDetailProps {
  ticket: any;
  onBack: () => void;
  clientName: string;
}

const ClientTicketDetail = ({ ticket, onBack, clientName }: ClientTicketDetailProps) => {
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { clientData } = useClientData();
  const { markRepliesAsRead } = useTicketReplyNotifications({ role: "client", clientId: clientData?.id });

  // Mark admin replies as read when opening the ticket
  useEffect(() => {
    markRepliesAsRead(ticket.id);
  }, [ticket.id, markRepliesAsRead]);

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["ticket-replies", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      setUploading(true);

      const uploadedFiles: { name: string; path: string; size: number }[] = [];
      for (const file of attachments) {
        const filePath = `${ticket.id}/${Date.now()}_${file.name}`;
        // getFileUploadClient() : sans le header JSON global qui casse les uploads
        const { error: uploadError } = await getFileUploadClient().storage
          .from("ticket-attachments")
          .upload(filePath, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedFiles.push({ name: file.name, path: filePath, size: file.size });
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticket.id,
        sender_type: "client",
        sender_id: user?.id || null,
        sender_name: clientName,
        message: replyMessage,
        attachments: uploadedFiles,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      setReplyMessage("");
      setAttachments([]);
      setUploading(false);
      toast.success("Réponse envoyée");
    },
    onError: () => {
      setUploading(false);
      toast.error("Erreur lors de l'envoi");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("ticket-attachments")
      .download(path);
    if (error || !data) {
      toast.error("Erreur de téléchargement");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <ClientPage maxWidth={920}>
      {/* Back */}
      <button
        style={{ ...ghostBtnStyle, border: 0, background: "transparent", padding: 0, height: "auto", marginBottom: 16 }}
        onClick={onBack}
      >
        <ArrowLeft size={16} />
        Retour aux tickets
      </button>

      {/* En-tête du ticket */}
      <ClientCard pad={20} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em", color: clientColors.ink, margin: 0 }}>
              {ticket.subject}
            </h2>
            <p style={{ fontSize: 12.5, color: clientColors.muted, margin: "6px 0 0" }}>
              Ouvert le {format(new Date(ticket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </p>
          </div>
          <StatusBadge status={ticket.status} label={STATUS_LABELS[ticket.status] || ticket.status} />
        </div>
        {ticket.description && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: clientColors.surface,
              border: `1px solid ${clientColors.borderSoft}`,
              fontSize: 13.5,
              color: clientColors.ink,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
            }}
          >
            {ticket.description}
          </div>
        )}
      </ClientCard>

      {/* Conversation */}
      <ClientCard pad={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 18px", borderBottom: `1px solid ${clientColors.borderSoft}` }}>
          <MessageSquare size={16} color={clientColors.indigo} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: clientColors.ink }}>Conversation</span>
        </div>

        {/* Fil de discussion */}
        <div style={{ background: clientColors.surface, padding: 18 }}>
          {repliesLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <Loader2 size={20} className="animate-spin" color={clientColors.faint} />
            </div>
          ) : replies.length === 0 ? (
            <p style={{ fontSize: 13, color: clientColors.muted, textAlign: "center", padding: "18px 0", margin: 0 }}>
              Aucune réponse pour le moment. L'équipe support va vous répondre prochainement.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {replies.map((reply: any) => {
                const isAdmin = reply.sender_type === "admin";
                const replyAttachments = (reply.attachments || []) as { name: string; path: string; size: number }[];
                return (
                  <div
                    key={reply.id}
                    style={{ display: "flex", justifyContent: isAdmin ? "flex-start" : "flex-end" }}
                  >
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "11px 14px",
                        borderRadius: 14,
                        background: isAdmin ? "#fff" : clientColors.indigo,
                        border: isAdmin ? `1px solid ${clientColors.border}` : "none",
                        color: isAdmin ? clientColors.ink : "#fff",
                        boxShadow: isAdmin ? "0 1px 2px rgba(16,24,40,.04)" : "0 4px 12px rgba(45,85,229,.22)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        {isAdmin ? (
                          <Shield size={12} color={clientColors.indigo} />
                        ) : (
                          <User size={12} color="rgba(255,255,255,.85)" />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{reply.sender_name}</span>
                        <span style={{ fontSize: 11, opacity: isAdmin ? 0.55 : 0.8 }}>
                          · {isAdmin ? "Support" : "Vous"}
                        </span>
                        <span style={{ fontSize: 11, marginLeft: "auto", opacity: isAdmin ? 0.5 : 0.75 }}>
                          {format(new Date(reply.created_at), "dd MMM à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.5 }}>{reply.message}</p>
                      {replyAttachments.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {replyAttachments.map((att, i) => (
                            <button
                              key={i}
                              onClick={() => downloadAttachment(att.path, att.name)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11.5,
                                fontWeight: 600,
                                padding: "4px 9px",
                                borderRadius: 8,
                                cursor: "pointer",
                                border: isAdmin ? `1px solid ${clientColors.border}` : "1px solid rgba(255,255,255,.4)",
                                background: isAdmin ? "#fff" : "rgba(255,255,255,.15)",
                                color: isAdmin ? clientColors.ink : "#fff",
                              }}
                            >
                              <Download size={12} />
                              {att.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Zone de réponse */}
        {!isClosed ? (
          <div style={{ padding: 18, borderTop: `1px solid ${clientColors.borderSoft}` }}>
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Rédigez votre réponse..."
              rows={3}
              className="resize-none rounded-xl"
            />

            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {attachments.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => removeAttachment(i)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 9px",
                      borderRadius: 8,
                      border: `1px solid ${clientColors.border}`,
                      background: clientColors.surface,
                      color: clientColors.ink,
                      cursor: "pointer",
                    }}
                  >
                    <Paperclip size={12} />
                    {file.name}
                    <X size={12} style={{ opacity: 0.6 }} />
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button style={ghostBtnStyle} onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={15} />
                  Joindre un fichier
                </button>
              </div>
              <button
                onClick={() => sendReply.mutate()}
                disabled={!replyMessage.trim() || uploading || sendReply.isPending}
                style={{ ...primaryBtnStyle, opacity: !replyMessage.trim() || uploading || sendReply.isPending ? 0.55 : 1 }}
              >
                {(uploading || sendReply.isPending) ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Répondre
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 18, borderTop: `1px solid ${clientColors.borderSoft}`, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: clientColors.muted, margin: 0 }}>
              Ce ticket est fermé. Ouvrez un nouveau ticket si nécessaire.
            </p>
          </div>
        )}
      </ClientCard>
    </ClientPage>
  );
};

export default ClientSupportPage;
