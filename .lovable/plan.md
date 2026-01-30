

# Plan de correction - GoCardless Token Compromis

## Contexte

Le token GoCardless "Leazr" a ete detecte comme expose publiquement sur GitHub. GoCardless a envoye une alerte de securite. L'erreur 403 actuelle indique que le token est soit invalide, soit deja revoque par GoCardless.

## Actions a realiser (par toi, dans GoCardless)

### Etape 1 - Revoquer le token compromis

1. Connecte-toi au **Dashboard GoCardless Live** : https://manage.gocardless.com
2. Va dans **Developers** (menu lateral) > **Personal access tokens**
3. Trouve le token nomme **"Leazr"** et clique sur **Revoke** (Revoquer)
4. Confirme la revocation

### Etape 2 - Generer un nouveau token

1. Dans la meme page, clique sur **Create** (Creer un nouveau token)
2. Donne-lui un nom different (ex: "Leazr-Prod-2026")
3. Selectionne **toutes les permissions** (Read + Write sur customers, mandates, subscriptions, payments)
4. Copie le token genere (il ne sera plus visible apres)

### Etape 3 - Mettre a jour le secret Supabase

Une fois le nouveau token cree, je mettrai a jour le secret `GOCARDLESS_ACCESS_TOKEN` dans Supabase avec la nouvelle valeur.

---

## Action technique (apres mise a jour du secret)

### Verification de la configuration

| Secret | Valeur attendue |
|--------|-----------------|
| `GOCARDLESS_ACCESS_TOKEN` | Nouveau Personal Access Token Live |
| `GOCARDLESS_ENVIRONMENT` | `live` |

### Test de validation

Apres mise a jour, tu pourras retester "Configurer la domiciliation" et l'erreur 403 devrait disparaitre.

---

## Securite additionnelle

### Nettoyer le fichier plan.md

Le fichier `.lovable/plan.md` sera modifie pour supprimer toute information sensible potentielle. Ce fichier de documentation ne doit contenir que des informations generiques sur l'integration.

### Verification du repo GitHub

Si le repo `iTakecare/leazr.co` est public, verifie qu'aucun autre fichier ne contient de secrets. Ajoute `.lovable/` au `.gitignore` si ce n'est pas deja fait.

---

## Resume des etapes

```text
+---------------------------+
|  1. Revoquer token Leazr  |
|     (Dashboard GC Live)   |
+-----------+---------------+
            |
            v
+---------------------------+
|  2. Creer nouveau token   |
|     (Personal Access)     |
+-----------+---------------+
            |
            v
+---------------------------+
|  3. Copier valeur token   |
+-----------+---------------+
            |
            v
+---------------------------+
|  4. Approuver ce plan     |
|     et coller le token    |
+-----------+---------------+
            |
            v
+---------------------------+
|  5. Retester domiciliation|
+---------------------------+
```

---

## Notes techniques

- Le fallback automatique sandbox/live dans l'edge function est une mesure de secours mais ne resout pas un token invalide
- Une fois le nouveau token en place, la creation de customer et de mandat fonctionnera
- Le webhook GoCardless (`gocardless-webhook`) utilise un secret different (`GOCARDLESS_WEBHOOK_SECRET`) qui n'est pas affecte

