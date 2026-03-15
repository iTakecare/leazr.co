

## Deux corrections

### 1. Layout de la page Support — trop collée

La page `SupportPage.tsx` utilise `<div className="space-y-6">` sans padding, alors que les autres pages admin (Tasks, StockManagement, EquipmentOrders) utilisent `p-6 space-y-6`. Le composant Layout ne fournit aucun padding dans `<main>`.

**Correction** : Ajouter `p-6` au conteneur principal de `SupportPage.tsx` :
```
<div className="space-y-6"> → <div className="space-y-6 p-6">
```

### 2. Erreur de sauvegarde IMAP — "Failed to send a request to the Edge Function"

Les logs de l'edge function montrent que **la sauvegarde fonctionne** (16:46:40 - "Settings saved"). L'erreur "Failed to send a request" vient du SDK Supabase côté client — c'est une erreur réseau/CORS transitoire ou un timeout.

**Corrections** :
- **`ImapSettingsForm.tsx`** : Ajouter un meilleur traitement de l'erreur réseau avec un message explicite et un retry. Aussi ajouter un `try/catch` autour de l'invoke pour capturer les erreurs réseau spécifiquement.
- **Edge function** : Redéployer la fonction `sync-imap-emails` pour s'assurer que la dernière version est active (les logs montrent que ça fonctionne, mais le client peut avoir un cache périmé).

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/SupportPage.tsx` | Ajouter `p-6` au conteneur |
| `src/components/support/ImapSettingsForm.tsx` | Meilleure gestion erreur réseau |
| `supabase/functions/sync-imap-emails/index.ts` | Redéploiement |

