

## Refonte du Dashboard Client - Style Bento Grid Moderne

### Vision

Transformer le dashboard actuel (grille uniforme de 5 cartes + activité récente) en un layout **Bento Grid** asymétrique avec bannière de bienvenue, KPIs dynamiques, timeline visuelle, notifications et raccourcis rapides.

```text
┌─────────────────────────────────────────────────────┐
│  Bannière de bienvenue (gradient + illustration)    │
│  "Bonjour John, voici votre espace"                │
│  [Nouvelle demande]  [Contacter le support]         │
└─────────────────────────────────────────────────────┘
┌────────────┬────────────┬────────────┬──────────────┐
│ Mensualité │ Équipements│ Demandes   │ Prochain     │
│ totale     │ actifs     │ en attente │ renouvellmt  │
│  245€/mois │    3       │    1       │  15 juin 26  │
└────────────┴────────────┴────────────┴──────────────┘
┌──────────────────────────┬──────────────────────────┐
│  Notifications/Alertes   │  Raccourcis rapides      │
│  ⚠ Contrat à signer     │  📦 Mon Équipement       │
│  📄 Document manquant   │  📋 Mes Contrats         │
│                          │  🛒 Catalogue            │
│                          │  ⚙ Paramètres           │
├──────────────────────────┴──────────────────────────┤
│  Timeline visuelle des demandes en cours            │
│  ● Soumise → ○ En revue → ○ Approuvée → ○ Contrat │
├─────────────────────────────────────────────────────┤
│  Activité Récente (timeline verticale améliorée)    │
└─────────────────────────────────────────────────────┘
```

### Modifications

**1. `src/hooks/useClientData.ts` - Enrichir les données**
- Ajouter une query pour compter les **contrats actifs** et sommer les **mensualités**
- Ajouter une query pour le **prochain renouvellement** (contrat actif avec la date de fin la plus proche)
- Compter les **demandes en attente** dynamiquement (remplace le badge "3" en dur)
- Ajouter une query pour les **notifications** (contrats à signer, documents manquants)
- Retourner : `clientStats: { totalMonthly, activeEquipment, pendingRequests, nextRenewal }`, `notifications: []`

**2. `src/pages/ClientDashboard.tsx` - Refonte complète du layout**

- **Bannière de bienvenue** : `div` pleine largeur avec gradient (primary → primary/80), nom du client, message contextuel selon l'heure, et 2 boutons CTA flottants ("Nouvelle demande", "Contacter le support")
- **KPIs en grille 4 colonnes** : 4 cartes avec valeurs numériques grandes, labels, icones, et micro-animations au chargement. Coins très arrondis (`rounded-2xl`), ombres douces (`shadow-sm`), pas de bordure
- **Grille Bento asymétrique** (2 colonnes) :
  - Colonne gauche : Carte "Notifications / Alertes" avec pastilles colorées et liens d'action
  - Colonne droite : Carte "Raccourcis rapides" en grille 2x2, icones plus grandes, style épuré
- **Timeline des demandes en cours** : Barre de progression horizontale avec étapes (Soumise → En revue → Approuvée → Contrat signé), points colorés pour l'étape active
- **Activité récente** : Refonte en timeline verticale avec trait gauche coloré, icones rondes, badges de statut traduits en français

**3. Styles et design tokens**
- Coins : `rounded-2xl` partout
- Ombres : `shadow-sm hover:shadow-md` transitions douces
- Espacement : `gap-6` entre sections, `p-6` interne aux cartes
- Animations : `framer-motion` stagger sur toutes les sections
- Couleurs KPI : bleu (mensualité), vert (équipements), orange (demandes), violet (renouvellement)

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `src/hooks/useClientData.ts` | Ajouter stats client, notifications, demandes en attente |
| `src/pages/ClientDashboard.tsx` | Refonte complète layout Bento Grid |

