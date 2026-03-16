import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, BookOpen, Sparkles } from "lucide-react";
import { defaultKnowledgeBaseArticles } from "@/constants/defaultKnowledgeBaseArticles";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "contrats", label: "Contrats" },
  { value: "equipements", label: "Équipements" },
  { value: "facturation", label: "Facturation" },
];

const KnowledgeBaseManager = () => {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general" });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["knowledge-base", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_knowledge_base")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const upsertArticle = useMutation({
    mutationFn: async () => {
      if (editingArticle) {
        const { error } = await supabase
          .from("support_knowledge_base")
          .update({ title: form.title, content: form.content, category: form.category, updated_at: new Date().toISOString() })
          .eq("id", editingArticle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("support_knowledge_base")
          .insert({ company_id: companyId!, title: form.title, content: form.content, category: form.category });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success(editingArticle ? "Article mis à jour" : "Article créé");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("support_knowledge_base")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-base"] }),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success("Article supprimé");
    },
  });

  const resetForm = () => {
    setForm({ title: "", content: "", category: "general" });
    setEditingArticle(null);
    setDialogOpen(false);
  };

  const openEdit = (article: any) => {
    setEditingArticle(article);
    setForm({ title: article.title, content: article.content, category: article.category });
    setDialogOpen(true);
  };

  const prefillArticles = useMutation({
    mutationFn: async () => {
      const rows = defaultKnowledgeBaseArticles.map((a) => ({
        company_id: companyId!,
        title: a.title,
        content: a.content,
        category: a.category,
      }));
      const { error } = await supabase.from("support_knowledge_base").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success(`${defaultKnowledgeBaseArticles.length} articles ajoutés avec succès`);
    },
    onError: () => toast.error("Erreur lors du pré-remplissage"),
  });

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nouvel article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingArticle ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titre</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de l'article" />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contenu</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Contenu de l'article..." rows={8} />
              </div>
              <Button onClick={() => upsertArticle.mutate()} disabled={!form.title || !form.content || upsertArticle.isPending} className="w-full">
                {editingArticle ? "Mettre à jour" : "Créer l'article"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm mb-4">Aucun article dans la base de connaissances</p>
            {articles.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => prefillArticles.mutate()}
                disabled={prefillArticles.isPending}
              >
                <Sparkles className="h-4 w-4" />
                {prefillArticles.isPending ? "Ajout en cours..." : `Pré-remplir avec ${defaultKnowledgeBaseArticles.length} articles par défaut`}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <Card key={article.id} className="border-0 shadow-sm rounded-xl">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{article.title}</h4>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {CATEGORIES.find((c) => c.value === article.category)?.label || article.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{article.content}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{article.is_active ? "Actif" : "Inactif"}</span>
                    <Switch
                      checked={article.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: article.id, is_active: checked })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(article)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteArticle.mutate(article.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;
