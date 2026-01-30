
# Correction du flux OAuth GoCardless

## Problème identifié

L'erreur "something went wrong... contact partner software" dans GoCardless est causée par une **confusion entre deux URLs de redirection** :

| Flux | Description | URL requise |
|------|-------------|-------------|
| **OAuth Callback** | Quand l'admin connecte son compte GoCardless | Doit être une page qui reçoit `code` et `state` et appelle `gocardless-oauth-callback` |
| **Billing Request Flow** | Quand le client signe son mandat SEPA | `https://leazr.co/itakecare/gocardless/complete` (déjà en place) |

Actuellement, le secret `GOCARDLESS_REDIRECT_URI` pointe vers la page du Billing Request Flow, qui ne sait pas traiter le callback OAuth.

---

## Solution

Créer une page dédiée pour le **OAuth Callback** et mettre à jour la configuration.

---

## Fichiers à créer

### 1. `src/pages/admin/GoCardlessOAuthCallbackPage.tsx`

Page qui traite le retour OAuth après que l'admin a autorisé la connexion GoCardless :

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Connexion GoCardless                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Loading] Connexion en cours...                                 │
│                                                                  │
│  OU                                                              │
│                                                                  │
│  [✅] Connexion réussie !                                        │
│  Votre compte GoCardless est maintenant connecté.                │
│  Redirection vers les paramètres...                              │
│                                                                  │
│  OU                                                              │
│                                                                  │
│  [❌] Erreur de connexion                                        │
│  [Message d'erreur]                                              │
│  [Retour aux paramètres]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fonctionnement :**
1. Récupère `code` et `state` depuis les query params
2. Appelle `gocardless-oauth-callback` avec ces paramètres
3. Affiche le résultat (succès ou erreur)
4. Redirige vers `/admin/settings` après succès

---

## Fichiers à modifier

### 2. `src/App.tsx`

Ajouter la route pour le callback OAuth :

```tsx
// Importer la nouvelle page
import GoCardlessOAuthCallbackPage from "@/pages/admin/GoCardlessOAuthCallbackPage";

// Dans les routes admin (après les autres routes admin)
<Route path="/:companySlug/admin/settings/gocardless/callback" element={<GoCardlessOAuthCallbackPage />} />

// OU une route publique si nécessaire (l'utilisateur peut ne plus avoir de session active après la redirection)
<Route path="/:companySlug/gocardless/oauth/callback" element={<GoCardlessOAuthCallbackPage />} />
```

---

## Configuration à mettre à jour

### 3. Secret Supabase : `GOCARDLESS_REDIRECT_URI`

Doit être mis à jour vers l'URL de la nouvelle page OAuth callback :

**Valeur actuelle (incorrecte pour OAuth) :**
```
https://leazr.co/itakecare/gocardless/complete
```

**Nouvelle valeur à configurer :**
```
https://leazr.co/itakecare/gocardless/oauth/callback
```

### 4. Dashboard GoCardless Partner

Dans **Developer → OAuth apps**, mettre à jour le Redirect URI pour correspondre exactement à la nouvelle valeur du secret.

---

## Flux complet après correction

```text
[Admin clique "Connecter GoCardless"]
           │
           ▼
[Edge Function: gocardless-oauth-start]
  └── Génère authorizeUrl avec redirect_uri
           │
           ▼
[GoCardless OAuth Page]
  └── L'admin autorise l'accès
           │
           ▼
[Redirection vers redirect_uri]
  └── https://leazr.co/itakecare/gocardless/oauth/callback?code=XXX&state=YYY
           │
           ▼
[GoCardlessOAuthCallbackPage.tsx]
  └── Appelle gocardless-oauth-callback
  └── Affiche succès/erreur
  └── Redirige vers /admin/settings
```

---

## Détails techniques de la page OAuth Callback

```typescript
// Fonctionnement simplifié
const GoCardlessOAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { companySlug } = useParams();
  
  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (!code || !state) {
        setError("Paramètres OAuth manquants");
        return;
      }
      
      // Pas besoin de session active car gocardless-oauth-callback
      // valide via le state token stocké en base
      const { data, error } = await supabase.functions.invoke(
        'gocardless-oauth-callback',
        { body: { code, state } }
      );
      
      if (error || !data?.success) {
        setError(data?.error || "Erreur de connexion");
        return;
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/${companySlug}/admin/settings`);
      }, 2000);
    };
    
    processCallback();
  }, []);
};
```

---

## Résumé des actions

| Ordre | Action | Responsable |
|-------|--------|-------------|
| 1 | Créer `GoCardlessOAuthCallbackPage.tsx` | Lovable |
| 2 | Ajouter la route dans `App.tsx` | Lovable |
| 3 | Mettre à jour le secret `GOCARDLESS_REDIRECT_URI` | Utilisateur via Supabase Dashboard |
| 4 | Mettre à jour le Redirect URI dans GoCardless Partner Dashboard | Utilisateur |

Une fois approuvé, je créerai la page et la route. Vous devrez ensuite mettre à jour le secret et la configuration GoCardless avec la nouvelle URL.
