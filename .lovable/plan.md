

# Plan : Corriger le Dashboard Mobile et le Bouton "+" de la Bottom Nav

## Problèmes Identifiés

### Problème 1 : Dashboard mal adapté sur mobile
Le `MobileDashboardPage` actuel utilise directement `CompanyDashboard` qui est conçu pour desktop :
- Tableau mensuel avec 6 colonnes qui déborde horizontalement
- Grille `lg:grid-cols-3` et `lg:grid-cols-4` non adaptée au mobile
- Boutons "Exporter PDF" et filtres qui prennent trop de place
- Sidebar de statistiques empilée de façon non optimale

### Problème 2 : Bouton "+" coupé et mal contrasté
Dans `MobileBottomNav.tsx` (ligne 149-157), le bouton central utilise :
- `-mt-6` qui le fait remonter mais il est partiellement coupé par le container
- `bg-primary` avec un contraste potentiellement insuffisant
- Pas de bordure visible pour le différencier du fond

---

## Solutions Proposées

### Solution 1 : Créer un vrai Dashboard Mobile natif

Au lieu d'importer `CompanyDashboard`, créer un affichage mobile dédié dans `MobileDashboardPage.tsx` :

**Nouveau design mobile :**

```text
┌─────────────────────────────────────────────────────────────┐
│  📷         Tableau de bord                    🔔           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [$ Financier]  [👥 Commercial]                             │  ← Tabs
│                                                             │
│  ┌──────────┐  ┌──────────┐                                │
│  │ 2026  ▼  │  │ Mois ▼   │   🔄                           │  ← Filtres compacts
│  └──────────┘  └──────────┘                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CA Total                                    💵     │   │
│  │  27 907,0 €                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Achats Total                               🛒     │   │
│  │  8 123,4 €                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Marge Brute                                📈     │   │
│  │  9 323,2 €                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Taux de Marge                              🎯     │   │
│  │  33.41%                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Statistiques               [Voir tout →]         │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ ✅ Contrats Réalisés: 12 | Marge: 9 323 €      │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ ⏳ En Attente: 5 | Marge pot.: 4 200 €         │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🏠     📋     ╔═══╗     📁     👤                        │
│ Accueil Demandes ║ + ║  Contrats Profil                    │  ← Bouton + bien visible
│                  ╚═══╝                                     │
└─────────────────────────────────────────────────────────────┘
```

### Solution 2 : Corriger le bouton "+" dans MobileBottomNav

**Modifications de style :**
- Ajouter `overflow-visible` au container parent
- Augmenter la taille du bouton (w-16 h-16 au lieu de w-14 h-14)
- Ajouter une bordure blanche épaisse pour le contraste
- Ajouter une ombre plus prononcée
- Ajuster le margin-top pour un meilleur positionnement

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/mobile/MobileBottomNav.tsx` | Corriger le style du bouton "+" (contraste, taille, bordure, ombre) |
| `src/components/mobile/pages/MobileDashboardPage.tsx` | Remplacer l'import de `CompanyDashboard` par un dashboard natif mobile avec KPIs empilés et statistiques adaptées |

---

## Détails Techniques

### 1. Correction du bouton "+" (MobileBottomNav.tsx)

**Avant :**
```tsx
<motion.div
  whileTap={{ scale: 0.9 }}
  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg"
>
  <Icon className="h-6 w-6" />
</motion.div>
```

**Après :**
```tsx
<motion.div
  whileTap={{ scale: 0.9 }}
  className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-xl border-4 border-background"
>
  <Icon className="h-7 w-7" />
</motion.div>
```

**Modifications sur le container nav :**
```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom overflow-visible">
  <div className="flex items-center justify-around h-16 px-2 overflow-visible">
```

### 2. Dashboard Mobile Natif (MobileDashboardPage.tsx)

**Structure proposée :**
- Utiliser le hook `useCompanyDashboard` directement (comme `CompanyDashboard`)
- Afficher les 4 KPIs en cards pleine largeur empilées
- Afficher les statistiques (Contrats Réalisés, En Attente, etc.) dans des cards compactes cliquables
- Supprimer le tableau mensuel (trop complexe pour mobile) ou le rendre accessible via un drawer
- Garder les filtres année/période en format compact

**Composants mobiles à utiliser :**
- `MobileKPICard` déjà défini dans le fichier (à étendre)
- Cards compactes pour les statistiques avec navigation vers détails

---

## Résultat Attendu

1. **Bouton "+" de la bottom nav :**
   - Bien visible et non coupé
   - Contraste élevé avec bordure blanche
   - Ombre prononcée pour effet "flottant"
   - Taille légèrement plus grande (16x16 au lieu de 14x14)

2. **Dashboard mobile :**
   - 4 KPIs en pleine largeur, empilés verticalement
   - Statistiques claires et accessibles
   - Pas de tableau horizontal qui déborde
   - Interface native type application iOS/Android

