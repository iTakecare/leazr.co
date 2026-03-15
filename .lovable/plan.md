

## Problème identifié

Les données IMAP sont bien sauvegardées en base (confirmé : `ex5.mail.ovh.bet`, `hello@itakecare.be`, port 993, sync_days 10).

Le bug est dans `ImapSettingsForm.tsx` : le `setForm()` est appelé **à l'intérieur de `queryFn`**. Quand React Query retourne des données depuis le cache (navigation entre onglets), `queryFn` ne se ré-exécute pas, donc `setForm` n'est jamais appelé et le formulaire reste vide.

## Correction

Remplacer le pattern actuel (setState dans queryFn) par une initialisation du formulaire via un `useEffect` qui réagit aux données retournées par le query :

```tsx
const { data: existingSettings, isLoading } = useQuery({
  queryKey: ["imap-settings", user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_imap_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!user,
});

useEffect(() => {
  if (existingSettings) {
    setForm({
      imap_host: existingSettings.imap_host,
      imap_port: existingSettings.imap_port,
      imap_username: existingSettings.imap_username,
      imap_password: "",
      imap_use_ssl: existingSettings.imap_use_ssl,
      folder: existingSettings.folder,
      is_active: existingSettings.is_active,
      sync_days: (existingSettings as any).sync_days || 7,
    });
    setHasExisting(true);
  }
}, [existingSettings]);
```

### Fichier modifié
| Fichier | Modification |
|---------|-------------|
| `src/components/support/ImapSettingsForm.tsx` | Déplacer `setForm` dans un `useEffect` réactif aux données du query |

