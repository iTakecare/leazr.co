import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Shield } from "lucide-react";
import { toast } from "sonner";

const ImapSettingsForm = () => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    imap_host: "",
    imap_port: 993,
    imap_username: "",
    imap_password: "",
    imap_use_ssl: true,
    folder: "INBOX",
    is_active: true,
  });
  const [hasExisting, setHasExisting] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["imap-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_imap_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setForm({
          imap_host: data.imap_host,
          imap_port: data.imap_port,
          imap_username: data.imap_username,
          imap_password: "", // Don't show encrypted password
          imap_use_ssl: data.imap_use_ssl,
          folder: data.folder,
          is_active: data.is_active,
        });
        setHasExisting(true);
      }
      return data;
    },
    enabled: !!user,
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      // Use edge function to encrypt password and save
      const { error } = await supabase.functions.invoke("sync-imap-emails", {
        body: {
          action: "save_settings",
          user_id: user!.id,
          company_id: companyId!,
          settings: form,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imap-settings"] });
      toast.success("Paramètres IMAP sauvegardés");
      setHasExisting(true);
    },
    onError: (err: any) => {
      toast.error("Erreur : " + (err.message || "Impossible de sauvegarder"));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Configuration IMAP
        </CardTitle>
        <CardDescription>
          Connectez votre boîte mail pour synchroniser vos emails.
          Le mot de passe est chiffré avant stockage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serveur IMAP *</Label>
              <Input
                value={form.imap_host}
                onChange={(e) => setForm((p) => ({ ...p, imap_host: e.target.value }))}
                placeholder="imap.gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Port *</Label>
              <Input
                type="number"
                value={form.imap_port}
                onChange={(e) => setForm((p) => ({ ...p, imap_port: parseInt(e.target.value) || 993 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Identifiant (email) *</Label>
            <Input
              value={form.imap_username}
              onChange={(e) => setForm((p) => ({ ...p, imap_username: e.target.value }))}
              placeholder="vous@exemple.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Mot de passe {hasExisting ? "(laisser vide pour ne pas changer)" : "*"}</Label>
            <Input
              type="password"
              value={form.imap_password}
              onChange={(e) => setForm((p) => ({ ...p, imap_password: e.target.value }))}
              placeholder={hasExisting ? "••••••••" : "Mot de passe IMAP"}
              required={!hasExisting}
            />
          </div>

          <div className="space-y-2">
            <Label>Dossier</Label>
            <Input
              value={form.folder}
              onChange={(e) => setForm((p) => ({ ...p, folder: e.target.value }))}
              placeholder="INBOX"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.imap_use_ssl}
                onCheckedChange={(v) => setForm((p) => ({ ...p, imap_use_ssl: v }))}
              />
              <Label>Utiliser SSL/TLS</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
              <Label>Actif</Label>
            </div>
          </div>

          <Button type="submit" disabled={saveSettings.isPending}>
            {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ImapSettingsForm;
