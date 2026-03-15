

## Plan : Corriger la synchronisation complète et ajouter la suppression visuelle

### Problème 1 : Seuls les emails du 5/03 s'affichent
La fonction `sync-imap-emails` limite le téléchargement à **20 emails par exécution** (`MAX_NEW_EMAILS = 20`). Les enveloppes (métadonnées) des 10 derniers jours sont bien récupérées, mais seuls 20 corps complets sont téléchargés par sync. Avec beaucoup d'emails, il faudrait cliquer "Synchroniser" de nombreuses fois pour rattraper le retard.

**Solution** : Augmenter la limite à **100 emails par batch** et ajuster le timeout de sécurité. La fonction priorise déjà les emails les plus récents grâce au tri, mais les enveloppes ne sont pas triées par date — il faut inverser l'ordre pour traiter les plus récents d'abord.

### Problème 2 : Pas de suppression depuis l'interface
Aucune colonne `is_hidden` n'existe. L'utilisateur ne peut pas masquer un email non pertinent.

**Solution** : Ajouter une colonne `is_hidden` (boolean, default false) à la table `synced_emails`, filtrer les emails cachés dans la requête du frontend, et ajouter un bouton de suppression (icône poubelle) sur chaque ligne + dans le détail.

### Modifications

| Fichier | Action |
|---------|--------|
| `supabase/functions/sync-imap-emails/index.ts` | Passer `MAX_NEW_EMAILS` de 20 à 100, trier les enveloppes par date DESC pour syncer les plus récents d'abord |
| `src/components/support/EmailInbox.tsx` | Ajouter filtre `.eq("is_hidden", false)` dans la requête, ajouter bouton supprimer par ligne (met `is_hidden = true`), confirmation avant suppression |
| `src/components/support/EmailDetail.tsx` | Ajouter bouton "Masquer cet email" dans la vue détail |
| **Migration SQL** | `ALTER TABLE synced_emails ADD COLUMN is_hidden boolean DEFAULT false;` |

### Détail technique

**Edge Function** — Tri des enveloppes pour priorité aux récents :
```typescript
const MAX_NEW_EMAILS = 100;
// Après collecte des enveloppes, trier par date DESC
newEnvelopes.sort((a, b) => {
  const dateA = new Date(a.envelope?.date || 0).getTime();
  const dateB = new Date(b.envelope?.date || 0).getTime();
  return dateB - dateA; // plus récents d'abord
});
```

**Frontend** — Bouton masquer avec stopPropagation pour ne pas ouvrir le détail :
```tsx
<Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); hideEmail(email.id); }}>
  <Trash2 className="h-4 w-4" />
</Button>
```

