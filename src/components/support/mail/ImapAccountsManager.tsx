import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderTree,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Plug,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ImapAccountRow {
  id: string;
  display_name: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_use_tls: boolean;
  smtp_username: string | null;
  color: string | null;
  signature_html: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

interface ServerFolder {
  path: string;
  name: string;
  special_use: string | null;
  is_synced: boolean;
}

interface AccountForm {
  id?: string;
  display_name: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_username: string;
  color: string;
  signature_html: string;
  is_active: boolean;
}

const EMPTY_FORM: AccountForm = {
  display_name: "",
  email_address: "",
  imap_host: "",
  imap_port: 993,
  imap_use_ssl: true,
  imap_username: "",
  smtp_host: "",
  smtp_port: 465,
  smtp_use_tls: true,
  smtp_username: "",
  color: "#6366f1",
  signature_html: "",
  is_active: true,
};

async function invokeMailFunction(
  name: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  let result = data as Record<string, unknown> | null;
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        result = (await ctx.json()) as Record<string, unknown>;
      } catch {
        // corps non JSON
      }
    }
    if (!result) {
      throw new Error((error as Error).message || "Erreur de communication avec le serveur");
    }
  }
  if (result && result.success === false) {
    const message =
      (result.error as string) || (result.message as string) || "L'opération a échoué";
    throw new Error(message);
  }
  return result ?? {};
}

const ImapAccountsManager: React.FC = () => {
  const queryClient = useQueryClient();

  // Édition / création
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Test de connexion
  const [testingId, setTestingId] = useState<string | null>(null);

  // Suppression
  const [accountToDelete, setAccountToDelete] = useState<ImapAccountRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dossiers
  const [foldersAccount, setFoldersAccount] = useState<ImapAccountRow | null>(null);
  const [serverFolders, setServerFolders] = useState<ServerFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [togglingPath, setTogglingPath] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["imap-accounts-admin"],
    queryFn: async (): Promise<ImapAccountRow[]> => {
      const { data, error } = await supabase
        .from("imap_accounts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ImapAccountRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["imap-accounts-admin"] });
    queryClient.invalidateQueries({ queryKey: ["mail-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["mail-folders"] });
  };

  const updateForm = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPassword("");
    setEditOpen(true);
  };

  const openEdit = (account: ImapAccountRow) => {
    setForm({
      id: account.id,
      display_name: account.display_name ?? "",
      email_address: account.email_address ?? "",
      imap_host: account.imap_host ?? "",
      imap_port: account.imap_port ?? 993,
      imap_use_ssl: account.imap_use_ssl ?? true,
      imap_username: account.imap_username ?? "",
      smtp_host: account.smtp_host ?? "",
      smtp_port: account.smtp_port ?? 465,
      smtp_use_tls: account.smtp_use_tls ?? true,
      smtp_username: account.smtp_username ?? "",
      color: account.color ?? "#6366f1",
      signature_html: account.signature_html ?? "",
      is_active: account.is_active ?? true,
    });
    setPassword("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() || !form.email_address.trim() || !form.imap_host.trim()) {
      toast.error("Nom, adresse email et serveur IMAP sont obligatoires");
      return;
    }
    if (!form.id && !password) {
      toast.error("Le mot de passe est obligatoire pour un nouveau compte");
      return;
    }
    setSaving(true);
    try {
      const result = await invokeMailFunction("mail-sync", {
        action: "save_account",
        account: form,
        ...(password ? { password } : {}),
      });
      toast.success((result.message as string) || "Compte enregistré");
      setEditOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'enregistrement a échoué");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (account: ImapAccountRow) => {
    setTestingId(account.id);
    try {
      const result = await invokeMailFunction("mail-sync", {
        action: "test_account",
        account_id: account.id,
      });
      toast.success((result.message as string) || "Connexion réussie");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le test de connexion a échoué");
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setDeleting(true);
    try {
      await invokeMailFunction("mail-sync", {
        action: "delete_account",
        account_id: accountToDelete.id,
      });
      toast.success("Compte supprimé");
      setAccountToDelete(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La suppression a échoué");
    } finally {
      setDeleting(false);
    }
  };

  const openFolders = async (account: ImapAccountRow) => {
    setFoldersAccount(account);
    setServerFolders([]);
    setFoldersLoading(true);
    try {
      const result = await invokeMailFunction("mail-sync", {
        action: "list_server_folders",
        account_id: account.id,
      });
      setServerFolders((result.folders as ServerFolder[]) ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de lister les dossiers du serveur"
      );
      setFoldersAccount(null);
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleToggleFolder = async (folder: ServerFolder, isSynced: boolean) => {
    if (!foldersAccount) return;
    setTogglingPath(folder.path);
    // Mise à jour optimiste
    setServerFolders((prev) =>
      prev.map((f) => (f.path === folder.path ? { ...f, is_synced: isSynced } : f))
    );
    try {
      await invokeMailFunction("mail-sync", {
        action: "set_folder_sync",
        account_id: foldersAccount.id,
        path: folder.path,
        is_synced: isSynced,
      });
      queryClient.invalidateQueries({ queryKey: ["mail-folders"] });
    } catch (err) {
      // Retour arrière en cas d'échec
      setServerFolders((prev) =>
        prev.map((f) => (f.path === folder.path ? { ...f, is_synced: !isSynced } : f))
      );
      toast.error(err instanceof Error ? err.message : "Impossible de modifier ce dossier");
    } finally {
      setTogglingPath(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comptes email</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un compte
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Mail className="h-8 w-8" />
            <p className="text-sm">Aucun compte email configuré pour le moment.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: account.color || "#888888" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{account.display_name}</span>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {account.email_address} — {account.imap_host}:{account.imap_port}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.last_sync_at
                    ? `Dernière synchronisation : ${format(
                        new Date(account.last_sync_at),
                        "d MMMM yyyy 'à' HH:mm",
                        { locale: fr }
                      )}`
                    : "Jamais synchronisé"}
                </p>
                {account.last_sync_error && (
                  <p className="mt-1 text-xs text-red-600">{account.last_sync_error}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(account)}
                  disabled={testingId === account.id}
                >
                  {testingId === account.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="mr-2 h-4 w-4" />
                  )}
                  Tester
                </Button>
                <Button variant="outline" size="sm" onClick={() => openFolders(account)}>
                  <FolderTree className="mr-2 h-4 w-4" />
                  Dossiers
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(account)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setAccountToDelete(account)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog d'édition / création */}
      <Dialog open={editOpen} onOpenChange={(open) => !saving && setEditOpen(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier le compte" : "Ajouter un compte"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4 p-0.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name">Nom d'affichage</Label>
                  <Input
                    id="acc-name"
                    value={form.display_name}
                    onChange={(e) => updateForm("display_name", e.target.value)}
                    placeholder="Support iTakecare"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-email">Adresse email</Label>
                  <Input
                    id="acc-email"
                    type="email"
                    value={form.email_address}
                    onChange={(e) => updateForm("email_address", e.target.value)}
                    placeholder="support@exemple.com"
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium">Réception (IMAP)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-imap-host">Serveur IMAP</Label>
                  <Input
                    id="acc-imap-host"
                    value={form.imap_host}
                    onChange={(e) => updateForm("imap_host", e.target.value)}
                    placeholder="imap.exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-imap-port">Port IMAP</Label>
                  <Input
                    id="acc-imap-port"
                    type="number"
                    value={form.imap_port}
                    onChange={(e) =>
                      updateForm("imap_port", parseInt(e.target.value, 10) || 993)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="acc-imap-ssl">Connexion SSL</Label>
                <Switch
                  id="acc-imap-ssl"
                  checked={form.imap_use_ssl}
                  onCheckedChange={(checked) => updateForm("imap_use_ssl", checked)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-imap-user">Identifiant IMAP</Label>
                  <Input
                    id="acc-imap-user"
                    value={form.imap_username}
                    onChange={(e) => updateForm("imap_username", e.target.value)}
                    placeholder="support@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-password">Mot de passe</Label>
                  <Input
                    id="acc-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={form.id ? "Laisser vide pour ne pas changer" : ""}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium">Envoi (SMTP)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-smtp-host">Serveur SMTP</Label>
                  <Input
                    id="acc-smtp-host"
                    value={form.smtp_host}
                    onChange={(e) => updateForm("smtp_host", e.target.value)}
                    placeholder="smtp.exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-smtp-port">Port SMTP</Label>
                  <Input
                    id="acc-smtp-port"
                    type="number"
                    value={form.smtp_port}
                    onChange={(e) =>
                      updateForm("smtp_port", parseInt(e.target.value, 10) || 465)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="acc-smtp-tls">Connexion TLS</Label>
                <Switch
                  id="acc-smtp-tls"
                  checked={form.smtp_use_tls}
                  onCheckedChange={(checked) => updateForm("smtp_use_tls", checked)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-smtp-user">Identifiant SMTP</Label>
                <Input
                  id="acc-smtp-user"
                  value={form.smtp_username}
                  onChange={(e) => updateForm("smtp_username", e.target.value)}
                  placeholder="identique IMAP"
                />
              </div>

              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-color">Couleur</Label>
                  <Input
                    id="acc-color"
                    type="color"
                    value={form.color}
                    onChange={(e) => updateForm("color", e.target.value)}
                    className="h-10 w-20 p-1"
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="acc-active">Compte actif</Label>
                  <Switch
                    id="acc-active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => updateForm("is_active", checked)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-signature">Signature (HTML)</Label>
                <Textarea
                  id="acc-signature"
                  value={form.signature_html}
                  onChange={(e) => updateForm("signature_html", e.target.value)}
                  className="min-h-[100px] font-mono text-xs"
                  placeholder="<p>Cordialement,<br>L'équipe support</p>"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog des dossiers serveur */}
      <Dialog
        open={foldersAccount !== null}
        onOpenChange={(open) => !open && setFoldersAccount(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Dossiers — {foldersAccount?.display_name ?? ""}
            </DialogTitle>
          </DialogHeader>
          {foldersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-1 pr-3">
                {serverFolders.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucun dossier trouvé sur le serveur.
                  </p>
                )}
                {serverFolders.map((folder) => (
                  <div
                    key={folder.path}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{folder.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{folder.path}</p>
                    </div>
                    <Switch
                      checked={folder.is_synced}
                      disabled={togglingPath === folder.path}
                      onCheckedChange={(checked) => handleToggleFolder(folder, checked)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog
        open={accountToDelete !== null}
        onOpenChange={(open) => !open && !deleting && setAccountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte « {accountToDelete?.display_name} » (
              {accountToDelete?.email_address}) et ses emails synchronisés seront supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImapAccountsManager;
