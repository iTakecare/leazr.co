

# Bannière d'alerte documents demandés sur le dashboard client

## Objectif
Quand une demande en cours a des documents requis (statut `internal_docs_requested` ou `info_requested` avec des `offer_upload_links` actifs), afficher une bannière colorée en haut du dashboard client avec le détail des documents à fournir, cliquable pour rediriger vers la demande.

## Modifications

### 1. `src/hooks/useClientData.ts` — Ajouter la détection des documents demandés

Dans `fetchNotifications`, ajouter une requête pour les offres du client ayant un statut `internal_docs_requested` ou `info_requested` :
- Récupérer les offres concernées avec leur `dossier_number` et `equipment_description`
- Pour chaque offre, récupérer les `offer_upload_links` non expirés pour lister les `requested_documents`
- Créer des notifications de type `'warning'` avec :
  - `title`: "📄 Documents requis"
  - `description`: le détail des documents (ex: "Bilan financier, Carte d'identité - Recto...")
  - `actionHref`: `requests/{offer_id}` pour redirection directe
  - Un nouveau champ optionnel `urgent: true` pour distinguer les alertes bannière

### 2. `ClientNotification` interface — Ajouter champs

```typescript
interface ClientNotification {
  // ... existants
  urgent?: boolean;
  documentCount?: number;
  offerId?: string;
}
```

### 3. `src/pages/ClientDashboard.tsx` — Bannière en haut

Avant le bloc des stats (juste après le welcome banner), insérer une bannière conditionnelle :
- Filtrer les notifications avec `urgent === true`
- Pour chaque alerte urgente, afficher une bannière avec :
  - Fond dégradé orange/ambre avec bordure gauche colorée
  - Icône `FileWarning` animée (bounce subtil)
  - Titre : "Action requise — Documents à fournir"
  - Description : nombre de documents + liste tronquée
  - Bouton "Voir la demande →" cliquable
  - Animation d'entrée avec framer-motion
- Si plusieurs demandes avec docs requis : empiler les bannières

## Rendu visuel attendu

```text
┌─────────────────────────────────────────────────────┐
│ 🟠 ⚠️ Action requise — Documents à fournir         │
│ 4 documents demandés pour votre demande ITC-...-9981│
│ Bilan financier, Bilan provisoire, Carte d'id...    │
│                               [Fournir les docs →]  │
└─────────────────────────────────────────────────────┘
```

