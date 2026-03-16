import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Mail, Phone, MessageSquare, FileText, Plus, Send, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientData } from "@/hooks/useClientData";
import { toast } from "sonner";

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
                {tickets.map((ticket) => {
                  const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const StatusIcon = statusConf.icon;
                  return (
                    <div key={ticket.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
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
              <div className="space-y-3">
                {faqArticles.map((article) => (
                  <div key={article.id} className="p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{article.title}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">{article.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{article.content}</p>
                  </div>
                ))}
              </div>
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

export default ClientSupportPage;
