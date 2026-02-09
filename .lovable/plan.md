

# Plan : Correction des vulnerabilites de securite

## Analyse des erreurs

Les erreurs du rapport de securite se divisent en 3 categories :

### A. Corrigeable dans le code (priorite haute)

| # | Probleme | Fichier(s) | Severite |
|---|----------|-----------|----------|
| 1 | **JWT/Token en dur** dans simpleFileUpload.ts | `src/services/simpleFileUpload.ts` (ligne 64) | High |
| 2 | **Cle API exposee** dans integration-guide.txt | `catalog-skeleton/integration-guide.txt` (ligne 64) | High |
| 3 | **CSP trop permissive** (inline, eval) | `index.html` (ligne 7) | High |
| 4 | **XSS via window.location.href** avec donnees non validees | `CatalogHeader.tsx`, `CatalogSearchSection.tsx` | High |
| 5 | **Docker tourne en root** | `Dockerfile` | Medium |

### B. Non corrigeable dans le code (dependances / infrastructure)

| Probleme | Raison |
|----------|--------|
| jspdf - encoding | Vulnerabilite de la librairie jspdf, pas de correctif disponible |
| @remix-run/router XSS | Dependance interne de react-router-dom |
| glob - OS command injection | Dependance de build, pas exposee en production |
| lodash - prototype pollution | Utilisation securisee dans le projet, risque theorique |
| react-router - open redirect | Dependance, mitigation via validation des routes |
| JWT dans client.ts | C'est la **cle publique anon** de Supabase, conçue pour etre exposee cote client - ce n'est PAS un secret |

### C. Path traversal (PDFTemplateEditor, LeaserForm, etc.)

Les fichiers mentionnes utilisent des noms de fichiers pour l'upload Supabase Storage. Le risque est faible car Supabase Storage ne permet pas la traversee de repertoires, mais on peut ajouter une sanitization des noms de fichiers.

---

## Corrections a appliquer

### 1. simpleFileUpload.ts - Supprimer le JWT en dur

Le fichier contient un token anon Supabase code en dur dans un `fetch()` au lieu d'utiliser le client Supabase authentifie. On va utiliser la session utilisateur pour obtenir le token dynamiquement.

**Fichier** : `src/services/simpleFileUpload.ts`

Remplacer l'appel `fetch` avec token en dur (lignes 59-67) par une recuperation du token depuis la session :

```typescript
// Récupérer le token de la session active
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token || SUPABASE_PUBLISHABLE_KEY;

const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 2. integration-guide.txt - Remplacer la cle API par un placeholder

**Fichier** : `catalog-skeleton/integration-guide.txt`

Remplacer la cle API reelle `lzr_015eaab80e2b45539d2551e237f22335` par un placeholder :

```
API_KEY: 'lzr_YOUR_API_KEY_HERE', // Remplacez par votre clé API
```

### 3. index.html - Renforcer la CSP

**Fichier** : `index.html`

Supprimer `'unsafe-inline'` de script-src et `'unsafe-eval'`, ajouter des fallbacks pour les directives manquantes :

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.gpteng.co https://esm.sh;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://*.supabase.co https://cifbetjefyfocafanlhv.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
">
```

**Attention** : La suppression de `'unsafe-inline'` pour script-src peut casser le fonctionnement si Vite injecte des scripts inline. On testera et on ajoutera un nonce ou hash si necessaire. Si ca casse, on conservera `'unsafe-inline'` pour script-src uniquement avec un commentaire explicatif.

### 4. XSS via window.location.href - Valider les URLs

**Fichiers** : `CatalogHeader.tsx`, `CatalogSearchSection.tsx`

Ajouter une validation de l'URL avant la redirection pour s'assurer qu'elle commence par `http://` ou `https://` :

```typescript
const safeRedirect = (url: string) => {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      window.location.href = url;
    }
  } catch {
    // URL invalide, ignorer
  }
};
```

### 5. Dockerfile - Ne pas tourner en root

**Fichier** : `Dockerfile`

Ajouter un utilisateur non-root pour Nginx :

```dockerfile
FROM nginx:alpine
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 6. Sanitization des noms de fichiers (Path Traversal)

Creer une fonction utilitaire pour nettoyer les noms de fichiers et l'utiliser dans les composants d'upload :

```typescript
export const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
};
```

A utiliser dans `PDFTemplateEditor.tsx`, `LeaserForm.tsx` et les autres fichiers d'upload.

---

## Resume des fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/services/simpleFileUpload.ts` | Supprimer JWT en dur, utiliser session |
| `catalog-skeleton/integration-guide.txt` | Remplacer cle API par placeholder |
| `index.html` | Renforcer la CSP |
| `src/components/catalog/public/CatalogHeader.tsx` | Valider URL avant redirection |
| `src/components/catalog/public/CatalogSearchSection.tsx` | Valider URL avant redirection |
| `Dockerfile` | Ajouter utilisateur non-root |
| `src/utils/fileUtils.ts` (nouveau) | Fonction sanitizeFileName |
| `src/components/admin/PDFTemplateEditor.tsx` | Utiliser sanitizeFileName |
| `src/components/settings/LeaserForm.tsx` | Utiliser sanitizeFileName |

## Ce qui ne sera PAS modifie

- **client.ts** : La cle `SUPABASE_PUBLISHABLE_KEY` est la cle publique anon de Supabase, conçue pour etre exposee. Ce n'est pas une faille.
- **Dependances** (jspdf, lodash, glob, remix-run/router, react-router) : Vulnerabilites de librairies tierces qui ne sont pas corrigeables dans le code applicatif.

