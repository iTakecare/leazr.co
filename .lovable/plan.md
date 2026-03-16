

## Plan : Rediriger `/:companySlug` vers le login et ajouter une image IA sur la page de connexion

### Problème
Quand on visite `https://leazr.co/itakecare/`, le `CompanySlugGuard` affiche le catalogue (shop) au lieu de la page de login. De plus, la partie droite du login utilise une image Unsplash générique au lieu d'une image propre au client.

### Modifications

**1. `src/components/routing/CompanySlugGuard.tsx`**
- Changer le comportement par défaut : au lieu de rendre `PublicSlugCatalog`, rediriger vers `/${companySlug}/login`
- Le catalogue reste accessible via `/:companySlug/catalog`

**2. `src/pages/Login.tsx`** (partie droite, lignes 322-353)
- Quand un `companyBranding` est détecté avec un `logo_url`, utiliser une image d'illustration personnalisée au lieu de l'image Unsplash générique
- Stocker une image générée par IA pour iTakecare dans le storage Supabase et l'utiliser comme image de fond
- Ajouter un champ `login_hero_image` dans la logique : si l'entreprise a une image hero configurée, l'utiliser ; sinon fallback sur l'image Unsplash actuelle

**3. Génération d'image IA pour iTakecare**
- Générer une image via le modèle Gemini illustrant iTakecare (équipements IT, leasing technologique, ambiance professionnelle)
- Uploader l'image dans le storage Supabase public
- L'associer au branding d'iTakecare

### Résumé des changements
| Fichier | Action |
|---------|--------|
| `CompanySlugGuard.tsx` | Redirect `/:companySlug` → `/:companySlug/login` |
| `Login.tsx` | Afficher l'image hero du client si disponible |
| Image IA | Générer et stocker une image pour iTakecare |

