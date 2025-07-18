
# Guide de déploiement Netlify avec gestion des sous-domaines

## Prérequis
- Compte Netlify
- Repository Git (GitHub, GitLab, etc.)
- Domaine leazr.co configuré

## Étapes de déploiement

### 1. Préparation du repository
```bash
# Commit tous les fichiers
git add .
git commit -m "Prepare for Netlify deployment with subdomain support"
git push origin main
```

### 2. Configuration Netlify
1. Connecter votre repository sur Netlify
2. Configurer les paramètres de build :
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

### 3. Variables d'environnement
Ajouter dans Netlify > Site settings > Environment variables :
```
VITE_SUPABASE_URL=https://cifbetjefyfocafanlhv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw
```

### 4. Configuration du domaine principal
1. Aller dans Netlify > Domain management
2. Ajouter le domaine personnalisé : `leazr.co`
3. Configurer les DNS chez votre registrar :
   - A record: `leazr.co` → IP Netlify
   - CNAME: `www.leazr.co` → `leazr.co`

### 5. Configuration des sous-domaines wildcard
1. Dans les DNS de votre registrar, ajouter :
   - CNAME: `*.leazr.co` → `leazr.co`
2. Dans Netlify > Domain management, ajouter :
   - `*.leazr.co` comme domaine personnalisé

### 6. Configuration SSL
- Netlify activera automatiquement SSL pour le domaine principal et les sous-domaines

### 7. Test des sous-domaines
Après déploiement, tester :
- `https://leazr.co` (domaine principal)
- `https://itakecare.leazr.co` (sous-domaine avec détection d'entreprise)
- `https://autreentreprise.leazr.co` (autres sous-domaines)

## Structure des URLs supportées

### Sous-domaines (Recommandé)
- `https://itakecare.leazr.co` → Détection automatique de l'entreprise iTakecare
- `https://entreprise.leazr.co` → Détection automatique par nom d'entreprise

### Paramètres URL (Fallback)
- `https://leazr.co/public/itakecare` → Via paramètre de chemin
- `https://leazr.co?company=itakecare` → Via paramètre de requête

### Pages publiques avec branding
- `https://itakecare.leazr.co/catalog` → Catalogue avec branding iTakecare
- `https://itakecare.leazr.co/contact` → Page contact personnalisée

## Monitoring et logs
- Netlify Functions logs : Vérifier les logs de l'edge function `detect-company`
- Analytics Netlify : Suivre le trafic des sous-domaines
- Supabase logs : Vérifier les requêtes de détection d'entreprise

## Troubleshooting

### Sous-domaine ne fonctionne pas
1. Vérifier la configuration DNS wildcard `*.leazr.co`
2. Contrôler les redirections dans `_redirects`
3. Vérifier les logs Netlify Functions

### Détection d'entreprise échoue
1. Vérifier les données dans la table `company_domains`
2. Contrôler les logs de l'edge function `detect-company`
3. Tester manuellement avec des paramètres URL

### Problèmes de SSL
1. Attendre la propagation DNS (jusqu'à 24h)
2. Forcer le renouvellement SSL dans Netlify
3. Vérifier la configuration wildcard SSL
