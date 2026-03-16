

# Redirection "Contacter le support" avec ticket pré-rempli

## Modifications

### 1. `src/pages/ClientRequestDetailPage.tsx`
- Le bouton "Contacter le support" navigue vers la page support avec des query params :
  ```
  /{slug}/client/support?subject=Demande d'information - Offre ITC-2026-OFF-9981&category=other&description=Bonjour, je voudrais avoir des informations au sujet de mon offre ITC-2026-OFF-9981
  ```
- Utiliser `useNavigate` (déjà importé) et construire l'URL avec le `dossier_number` ou l'ID de l'offre

### 2. `src/pages/ClientSupportPage.tsx`
- Importer `useSearchParams` de `react-router-dom`
- Au montage, lire les params `subject`, `category`, `description`
- Si présents : pré-remplir le state `form` et activer `showForm(true)` automatiquement
- Nettoyer les params de l'URL après lecture (optionnel, pour éviter un re-remplissage au refresh)

Aucune autre modification nécessaire — les routes et le composant de formulaire existants supportent déjà ces champs.

