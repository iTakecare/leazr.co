import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Mail, Phone, MessageSquare, FileText, Plus, Send, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Paperclip, Download, User, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientData } from "@/hooks/useClientData";
import { useTicketReplyNotifications } from "@/hooks/useTicketReplyNotifications";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const TICKET_CATEGORIES = [
  { value: "technical", label: "Problème technique" },
  { value: "billing", label: "Question facturation" },
  { value: "modification", label: "Demande de modification" },
  { value: "other", label: "Autre" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Ouvert", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Clock },
  in_progress: { label: "En cours", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Loader2 },
  resolved: { label: "Résolu", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  closed: { label: "Fermé", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

const ClientSupportPage = () => {
  const queryClient = useQueryClient();
  const { clientData } = useClientData();
  const [showForm, setShowForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", category: "technical", description: "" });

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

  // Fetch FAQ from knowledge base
  const { data: faqArticles = [] } = useQuery({
    queryKey: ["client-faq", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_knowledge_base")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
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
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <HelpCircle className="h-8 w-8 text-primary" />
              Support Client
            </h1>
            <p className="text-muted-foreground">
              Nous sommes là pour vous aider. Créez un ticket ou consultez notre FAQ.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Ouvrir un ticket
          </Button>
        </div>
      </motion.div>

      {/* Contact rapide - bandeau visible */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">+32 (0)10 23 45 67</span>
          </div>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">support@itakecare.be</span>
          </div>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <span>Lun - Ven : 9h - 18h</span>
          </div>
        </div>
      </motion.div>

      {/* Ticket creation form */}
      {showForm && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Nouveau ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sujet</label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Décrivez brièvement votre problème"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catégorie</label>
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez votre problème en détail..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Annuler</Button>
                <Button
                  onClick={() => createTicket.mutate()}
                  disabled={!form.subject || !form.description || createTicket.isPending}
                  className="gap-2 rounded-xl"
                >
                  <Send className="h-4 w-4" /> Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tickets list */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Mes tickets ({tickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Aucun ticket pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket: any) => {
                  const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const StatusIcon = statusConf.icon;
                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                          <Badge className={`text-xs ${statusConf.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConf.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}</span>
                          <span>·</span>
                          <span>{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* FAQ dynamique */}
      {faqArticles.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <HelpCircle className="h-4 w-4 text-primary" />
                Questions Fréquentes
              </CardTitle>
              <CardDescription className="text-xs">
                Trouvez rapidement des réponses aux questions les plus courantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqArticles.map((article: any) => (
                  <AccordionItem key={article.id} value={article.id}>
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                      <div className="flex items-center gap-2 text-left">
                        {article.title}
                        <Badge variant="outline" className="text-xs shrink-0">{article.category}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground whitespace-pre-line">
                      {article.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Contact info */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Informations de Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Email</h4>
                  <p className="text-xs text-muted-foreground">support@itakecare.be</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Téléphone</h4>
                  <p className="text-xs text-muted-foreground">+32 (0)10 23 45 67</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Horaires</h4>
                  <p className="text-xs text-muted-foreground">Lun - Ven : 9h - 18h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
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

  const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConf.icon;

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
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file);
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
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux tickets
        </Button>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Créé le {format(new Date(ticket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                </p>
              </div>
              <Badge className={`${statusConf.color} border-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConf.label}
              </Badge>
            </div>
          </CardHeader>
          {ticket.description && (
            <CardContent>
              <div className="p-3 rounded-xl bg-muted/50 text-sm whitespace-pre-wrap">{ticket.description}</div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Conversation */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {repliesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune réponse pour le moment. L'équipe support va vous répondre prochainement.
              </p>
            ) : (
              <div className="space-y-3">
                {replies.map((reply: any) => {
                  const isAdmin = reply.sender_type === "admin";
                  const replyAttachments = (reply.attachments || []) as { name: string; path: string; size: number }[];
                  return (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-xl border ${isAdmin ? "bg-primary/5 border-primary/20 mr-4" : "bg-muted/50 border-border ml-4"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded-full ${isAdmin ? "bg-primary/10" : "bg-muted"}`}>
                          {isAdmin ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-medium">{reply.sender_name}</span>
                        <Badge variant="outline" className="text-xs">{isAdmin ? "Support" : "Vous"}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(reply.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      {replyAttachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {replyAttachments.map((att, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => downloadAttachment(att.path, att.name)}
                            >
                              <Download className="h-3 w-3" />
                              {att.name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply form - only if not closed */}
            {!isClosed ? (
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Rédigez votre réponse..."
                  rows={3}
                  className="resize-none rounded-xl"
                />

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeAttachment(i)}>
                        <Paperclip className="h-3 w-3" />
                        {file.name}
                        <span className="text-xs opacity-60">✕</span>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Joindre un fichier
                    </Button>
                  </div>
                  <Button
                    onClick={() => sendReply.mutate()}
                    disabled={!replyMessage.trim() || uploading || sendReply.isPending}
                    className="gap-2 rounded-xl"
                  >
                    {(uploading || sendReply.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Répondre
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t pt-4 text-center">
                <p className="text-sm text-muted-foreground">Ce ticket est fermé. Ouvrez un nouveau ticket si nécessaire.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientSupportPage;
