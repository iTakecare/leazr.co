

## Plan : Mettre à jour `public/catalog-api-documentation.txt`

### Problème
Le fichier téléchargeable par les utilisateurs est `public/catalog-api-documentation.txt`. C'est lui qui est affiché dans ta capture d'écran. Je n'ai mis à jour que les fichiers internes (`catalog-skeleton/`), pas ce fichier public.

### Solution
Mettre à jour `public/catalog-api-documentation.txt` :

1. **Version et date** (lignes 5-6) :
   - `VERSION : 2026.4`
   - `DATE : 15 mars 2026 — Image hero partenaires & génération IA`

2. **Nouvelle section "NOUVEAUTES VERSION 2026.4"** (après ligne 7, avant la section 2026.3) :
   - Champ `hero_image_url` ajouté aux endpoints partenaires
   - Génération IA d'images hero via Edge Function `generate-partner-hero`
   - Scraping du site web du partenaire pour contexte visuel
   - Upload manuel ou génération automatique depuis l'admin

### Fichier modifié
| Fichier | Action |
|---------|--------|
| `public/catalog-api-documentation.txt` | Bump version 2026.4, ajouter section nouveautés hero_image_url |

