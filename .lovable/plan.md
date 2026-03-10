

# Corrections et redesign de la modale email de suivi

## Problèmes identifiés
1. **Email client non pré-rempli** : `contract.client_email` est utilisé à l'init du state mais le composant ne se met pas à jour quand le contract change (le state initial est fixé une seule fois). Il faut aussi fallback sur `contract.clients?.email`.
2. **Durée depuis livraison incorrecte** : Le texte dit toujours "une semaine" en dur au lieu de calculer dynamiquement depuis `contract.delivery_date`.
3. **Design email basique** : Pas de section réseaux sociaux, liens Trustpilot/Google hardcodés et non éditables.

## Plan

### Fichier : `src/components/contracts/FollowupEmailModal.tsx` — Réécriture complète

**A. Correction email client**
- Ajouter un `useEffect` qui met à jour `to` quand `contract` change ou quand la modale s'ouvre : `contract.client_email || contract.clients?.email || ""`

**B. Calcul dynamique de la durée**
- Calculer les semaines entre `contract.delivery_date` et maintenant
- Logique : 1 semaine → "une semaine", 2 → "2 semaines", 3 → "3 semaines", 4 → "un mois", >4 → "quelques semaines"
- Injecter dans le template HTML

**C. Champs éditables sous l'éditeur**
Ajouter 5 champs Input sous le mail :
- URL Trustpilot (défaut: `https://www.trustpilot.com/review/itakecare.be`)
- URL Google Review (défaut: `https://g.page/r/itakecare/review`)
- URL Facebook
- URL LinkedIn  
- URL Instagram

Ces URLs sont injectées dans le template HTML lors de la génération.

**D. Nouveau design email**
Template HTML modernisé avec :
- Header avec logo/nom company (existant, amélioré)
- Corps du message avec durée dynamique
- Boutons CTA Trustpilot + Google (existant, amélioré)
- Section "Suivez-nous sur les réseaux sociaux" avec icônes Facebook, LinkedIn, Instagram (liens conditionnels — n'affiche que ceux renseignés)
- Footer company avec copyright

**E. Régénération du template**
Quand les URLs changent, le template se régénère automatiquement (les URLs sont dans le state, le `useEffect` de génération dépend d'elles).

### Fichiers impactés
| Fichier | Modification |
|---|---|
| `src/components/contracts/FollowupEmailModal.tsx` | Réécriture : email client, durée dynamique, champs URLs, nouveau design, réseaux sociaux |

