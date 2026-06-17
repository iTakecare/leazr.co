import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertOctagon,
  Archive,
  FileText,
  Forward,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  Pen,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import EmailDetail from "@/components/support/EmailDetail";
import MailComposer, { ComposeMode, ImapAccount } from "./MailComposer";

interface ImapFolder {
  id: string;
  account_id: string;
  path: string;
  name: string;
  special_use: string | null;
  is_synced: boolean;
  last_uid?: number;
}

interface SyncedEmail {
  id: string;
  account_id: string;
  folder_path: string;
  from_address: string | null;
  from_name: string | null;
  to_address: string | null;
  cc_address: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string;
  is_read: boolean;
  is_hidden: boolean;
  has_attachments: boolean;
  [key: string]: unknown;
}

type MailSelection =
  | { kind: "unified" }
  | { kind: "folder"; accountId: string; folderPath: string };

interface ComposerState {
  open: boolean;
  mode: ComposeMode;
  defaultAccountId?: string;
  replyToEmailId?: string;
  defaultTo?: string[];
  defaultCc?: string[];
  defaultSubject?: string;
}

interface MailboxPageProps {
  onManageAccounts?: () => void;
}

const PAGE_SIZE = 50;
const SELECTION_STORAGE_KEY = "leazr_mail_selection";

// Ordre traditionnel Outlook : Réception, Brouillons, Envoyés, Corbeille,
// Indésirables, Archives, puis les dossiers personnalisés (alphabétiques).
const SPECIAL_USE_ORDER: Record<string, number> = {
  "\\Inbox": 1,
  "\\Drafts": 2,
  "\\Sent": 3,
  "\\Trash": 4,
  "\\Junk": 5,
  "\\Archive": 6,
};
const CUSTOM_FOLDER_ORDER = 50;

const folderPriority = (f: ImapFolder): number => {
  if (f.special_use && SPECIAL_USE_ORDER[f.special_use]) return SPECIAL_USE_ORDER[f.special_use];
  if (!f.special_use && f.path.toUpperCase() === "INBOX") return 1;
  return CUSTOM_FOLDER_ORDER;
};

const folderIcon = (specialUse: string | null) => {
  switch (specialUse) {
    case "\\Sent":
      return Send;
    case "\\Trash":
      return Trash2;
    case "\\Drafts":
      return FileText;
    case "\\Junk":
      return AlertOctagon;
    case "\\Archive":
      return Archive;
    default:
      return Inbox;
  }
};

const loadStoredSelection = (): MailSelection => {
  try {
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MailSelection;
      if (parsed && (parsed.kind === "unified" || parsed.kind === "folder")) {
        return parsed;
      }
    }
  } catch {
    // valeur corrompue : on ignore
  }
  return { kind: "unified" };
};

const parseAddressList = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const formatEmailTime = (receivedAt: string): string => {
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) return "";
  return isToday(date)
    ? format(date, "HH:mm", { locale: fr })
    : format(date, "d MMM", { locale: fr });
};

const withPrefix = (prefix: string, subject: string): string => {
  const trimmed = subject.trim();
  return trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    ? trimmed
    : `${prefix} ${trimmed}`.trim();
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

const MailboxPage: React.FC<MailboxPageProps> = ({ onManageAccounts }) => {
  const queryClient = useQueryClient();

  const [selection, setSelection] = useState<MailSelection>(loadStoredSelection);
  const [selectedEmail, setSelectedEmail] = useState<SyncedEmail | null>(null);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [syncing, setSyncing] = useState(false);
  const [composer, setComposer] = useState<ComposerState>({ open: false, mode: "new" });

  // Persistance de la sélection
  useEffect(() => {
    try {
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // stockage indisponible : non bloquant
    }
  }, [selection]);

  // Comptes actifs — uniquement MES boîtes (owner = moi). Chaque
  // collaborateur ne voit que les siennes dans la boîte mail ; les autres
  // (ex. sales@ = celle de Tohann) restent gérables/assignables dans
  // l'onglet « Comptes mail ».
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["mail-accounts"],
    queryFn: async (): Promise<ImapAccount[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("imap_accounts")
        .select("*")
        .eq("is_active", true)
        .eq("owner_user_id", uid)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as ImapAccount[];
    },
  });

  // Dossiers synchronisés
  const { data: folders = [] } = useQuery({
    queryKey: ["mail-folders", accounts.map((a) => a.id).join(",")],
    queryFn: async (): Promise<ImapFolder[]> => {
      const { data, error } = await supabase
        .from("imap_folders")
        .select("*")
        .in("account_id", accounts.map((a) => a.id))
        .eq("is_synced", true)
        .order("path");
      if (error) throw error;
      return (data ?? []) as ImapFolder[];
    },
    enabled: accounts.length > 0,
  });

  // Compteurs de non-lus par dossier — restreints à MES comptes uniquement
  // (la RLS de synced_emails est partagée par société, donc on filtre côté requête).
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["mail-unread", accounts.map((a) => a.id).join(",")],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("synced_emails")
        .select("account_id, folder_path")
        .in("account_id", accounts.map((a) => a.id))
        .eq("is_read", false)
        .eq("is_hidden", false);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as Pick<SyncedEmail, "account_id" | "folder_path">[]) {
        const key = `${row.account_id}|${row.folder_path}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    },
    enabled: accounts.length > 0,
  });

  const accountById = useMemo(() => {
    const map = new Map<string, ImapAccount>();
    for (const account of accounts) map.set(account.id, account);
    return map;
  }, [accounts]);

  const foldersByAccount = useMemo(() => {
    const map = new Map<string, ImapFolder[]>();
    for (const folder of folders) {
      const list = map.get(folder.account_id) ?? [];
      list.push(folder);
      map.set(folder.account_id, list);
    }
    for (const [accountId, list] of map) {
      // Déduplication : certains serveurs (Exchange) exposent plusieurs
      // dossiers pour le même rôle (Sent / Sent Messages / Éléments envoyés).
      // On ne garde que le plus actif (last_uid le plus haut) par special_use.
      const bySpecial = new Map<string, ImapFolder>();
      const customs: ImapFolder[] = [];
      for (const f of list) {
        if (f.special_use) {
          const cur = bySpecial.get(f.special_use);
          if (!cur || (f.last_uid ?? 0) > (cur.last_uid ?? 0)) bySpecial.set(f.special_use, f);
        } else if (f.path.toUpperCase() === "INBOX") {
          bySpecial.set("\\Inbox", f);
        } else {
          customs.push(f);
        }
      }
      const deduped = [...bySpecial.values(), ...customs];
      deduped.sort((a, b) => {
        const pa = folderPriority(a);
        const pb = folderPriority(b);
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name, "fr");
      });
      map.set(accountId, deduped);
    }
    return map;
  }, [folders]);

  // Chemins des boîtes de réception pour la vue unifiée
  const inboxPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const folder of folders) {
      if (folder.special_use === "\\Inbox" || folder.path.toUpperCase() === "INBOX") {
        paths.add(folder.path);
      }
    }
    if (paths.size === 0) paths.add("INBOX");
    return Array.from(paths);
  }, [folders]);

  // Réinitialiser pagination + sélection d'email quand le contexte change
  useEffect(() => {
    setLimit(PAGE_SIZE);
    setSelectedEmail(null);
  }, [selection, search]);

  // Liste des emails
  const { data: emailsResult, isLoading: emailsLoading } = useQuery({
    queryKey: ["mail-emails", selection, search, limit, accounts.map((a) => a.id).join(",")],
    queryFn: async (): Promise<{ emails: SyncedEmail[]; hasMore: boolean }> => {
      let query = supabase
        .from("synced_emails")
        .select("*")
        .eq("is_hidden", false)
        .order("received_at", { ascending: false })
        .range(0, limit); // limit + 1 lignes pour détecter la suite

      if (selection.kind === "folder") {
        query = query
          .eq("account_id", selection.accountId)
          .eq("folder_path", selection.folderPath);
      } else {
        // Vue unifiée : INBOX de MES comptes uniquement (pas toute la société).
        query = query
          .in("account_id", accounts.map((a) => a.id))
          .in("folder_path", inboxPaths);
      }

      const term = search.trim().replace(/[,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `subject.ilike.%${term}%,from_address.ilike.%${term}%,from_name.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as SyncedEmail[];
      return { emails: rows.slice(0, limit), hasMore: rows.length > limit };
    },
    enabled: selection.kind === "folder" || folders.length > 0 || accounts.length === 0,
  });

  const emails = emailsResult?.emails ?? [];
  const hasMore = emailsResult?.hasMore ?? false;

  // Realtime : nouveaux emails
  useEffect(() => {
    const channel = supabase
      .channel("mailbox-synced-emails")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "synced_emails" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["mail-emails"] });
          queryClient.invalidateQueries({ queryKey: ["mail-unread"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ["mail-emails"] });
    queryClient.invalidateQueries({ queryKey: ["mail-unread"] });
  };

  const handleSelectEmail = (email: SyncedEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      // EmailDetail marque l'email comme lu à l'ouverture : on rafraîchit ensuite
      setTimeout(refreshLists, 1500);
    }
  };

  const handleHide = async (id: string) => {
    const { error } = await supabase
      .from("synced_emails")
      .update({ is_hidden: true })
      .eq("id", id);
    if (error) {
      toast.error("Impossible de supprimer cet email");
      return;
    }
    toast.success("Email supprimé");
    setSelectedEmail(null);
    refreshLists();
  };

  const handleSyncAll = async () => {
    if (accounts.length === 0) {
      toast.error("Aucun compte actif à synchroniser");
      return;
    }
    setSyncing(true);
    let totalSynced = 0;
    const failures: string[] = [];
    for (const account of accounts) {
      try {
        const result = await invokeMailFunction("mail-sync", {
          action: "sync_account",
          account_id: account.id,
        });
        totalSynced += Number(result.synced ?? 0);
      } catch {
        failures.push(account.display_name);
      }
    }
    setSyncing(false);
    if (failures.length > 0) {
      toast.error(`Échec de synchronisation : ${failures.join(", ")}`);
    } else {
      toast.success(`Synchronisation terminée (${totalSynced} email(s))`);
    }
    refreshLists();
    queryClient.invalidateQueries({ queryKey: ["mail-folders"] });
  };

  const openComposer = (mode: ComposeMode, email?: SyncedEmail) => {
    if (mode === "new" || !email) {
      setComposer({ open: true, mode: "new" });
      return;
    }

    const account = accountById.get(email.account_id);
    const ownAddress = (account?.email_address ?? "").toLowerCase();
    const excludeOwn = (addresses: string[]) =>
      addresses.filter((address) => address.toLowerCase() !== ownAddress);
    const dedupe = (addresses: string[]) => {
      const seen = new Set<string>();
      return addresses.filter((address) => {
        const key = address.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const subject = email.subject ?? "";
    let defaultTo: string[] = [];
    let defaultCc: string[] = [];
    let defaultSubject = subject;

    if (mode === "reply") {
      defaultTo = email.from_address ? [email.from_address] : [];
      defaultSubject = withPrefix("Re:", subject);
    } else if (mode === "reply_all") {
      defaultTo = dedupe(
        excludeOwn([
          ...(email.from_address ? [email.from_address] : []),
          ...parseAddressList(email.to_address),
        ])
      );
      defaultCc = dedupe(excludeOwn(parseAddressList(email.cc_address)));
      defaultSubject = withPrefix("Re:", subject);
    } else if (mode === "forward") {
      defaultSubject = withPrefix("Tr:", subject);
    }

    setComposer({
      open: true,
      mode,
      defaultAccountId: email.account_id,
      replyToEmailId: email.id,
      defaultTo,
      defaultCc,
      defaultSubject,
    });
  };

  const renderFolderButton = (account: ImapAccount, folder: ImapFolder) => {
    const Icon = folderIcon(folder.special_use);
    const isSelected =
      selection.kind === "folder" &&
      selection.accountId === account.id &&
      selection.folderPath === folder.path;
    const unread = unreadCounts[`${account.id}|${folder.path}`] ?? 0;

    return (
      <button
        key={folder.id}
        type="button"
        onClick={() =>
          setSelection({ kind: "folder", accountId: account.id, folderPath: folder.path })
        }
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
        {unread > 0 && (
          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-xs">
            {unread}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-lg border bg-background">
      {/* COLONNE GAUCHE : comptes et dossiers */}
      <div className="flex w-[240px] shrink-0 flex-col border-r">
        <div className="p-3">
          <Button className="w-full" onClick={() => openComposer("new")}>
            <Pen className="mr-2 h-4 w-4" />
            Nouveau message
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3">
          <button
            type="button"
            onClick={() => setSelection({ kind: "unified" })}
            className={`mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              selection.kind === "unified"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">Toutes les boîtes</span>
          </button>

          {accountsLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!accountsLoading && accounts.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Aucun compte email configuré.
            </p>
          )}

          {accounts.map((account) => (
            <div key={account.id} className="mb-3">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: account.color || "#888888" }}
                />
                <span className="truncate text-xs font-semibold uppercase text-muted-foreground">
                  {account.display_name}
                </span>
              </div>
              <div className="space-y-0.5">
                {(foldersByAccount.get(account.id) ?? []).map((folder) =>
                  renderFolderButton(account, folder)
                )}
                {(foldersByAccount.get(account.id) ?? []).length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    Aucun dossier synchronisé
                  </p>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
        <Separator />
        <div className="space-y-1 p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Synchroniser
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={onManageAccounts}
          >
            <Settings className="mr-2 h-4 w-4" />
            Gérer les comptes
          </Button>
        </div>
      </div>

      {/* COLONNE MILIEU : liste des emails */}
      <div className="flex w-[380px] shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {emailsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!emailsLoading && emails.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Mail className="h-8 w-8" />
              <p className="text-sm">Aucun email</p>
            </div>
          )}

          {emails.map((email) => {
            const account = accountById.get(email.account_id);
            const isSelected = selectedEmail?.id === email.id;
            return (
              <button
                key={email.id}
                type="button"
                onClick={() => handleSelectEmail(email)}
                className={`block w-full border-b px-3 py-2.5 text-left transition-colors ${
                  isSelected ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {selection.kind === "unified" && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: account?.color || "#888888" }}
                    />
                  )}
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      email.is_read ? "" : "font-bold"
                    }`}
                  >
                    {email.from_name || email.from_address || "(expéditeur inconnu)"}
                  </span>
                  {email.has_attachments && (
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatEmailTime(email.received_at)}
                  </span>
                </div>
                <p
                  className={`truncate text-sm ${
                    email.is_read ? "text-muted-foreground" : "font-semibold"
                  }`}
                >
                  {email.subject || "(sans objet)"}
                </p>
                {email.body_text && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {email.body_text}
                  </p>
                )}
              </button>
            );
          })}

          {hasMore && (
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              >
                Charger plus
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* COLONNE DROITE : détail */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedEmail ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Mail className="h-12 w-12" />
            <p className="text-sm">Sélectionnez un email pour l'afficher</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 border-b p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openComposer("reply", selectedEmail)}
              >
                <Reply className="mr-2 h-4 w-4" />
                Répondre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openComposer("reply_all", selectedEmail)}
              >
                <ReplyAll className="mr-2 h-4 w-4" />
                Répondre à tous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openComposer("forward", selectedEmail)}
              >
                <Forward className="mr-2 h-4 w-4" />
                Transférer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleHide(selectedEmail.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <EmailDetail
                  email={selectedEmail}
                  onBack={() => setSelectedEmail(null)}
                  onHide={handleHide}
                />
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <MailComposer
        open={composer.open}
        onOpenChange={(open) => setComposer((prev) => ({ ...prev, open }))}
        accounts={accounts}
        defaultAccountId={composer.defaultAccountId}
        mode={composer.mode}
        replyToEmailId={composer.replyToEmailId}
        defaultTo={composer.defaultTo}
        defaultCc={composer.defaultCc}
        defaultSubject={composer.defaultSubject}
      />
    </div>
  );
};

export default MailboxPage;
