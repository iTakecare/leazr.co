

# Ajouter un badge compteur sur l'onglet "Materiel"

## Objectif

Afficher un badge avec le nombre total d'equipements actifs directement sur l'onglet "Materiel" de la fiche client, sans avoir a cliquer dessus.

## Approche

Le hook `useClientContracts` est deja utilise dans `ClientActiveEquipment`. On va aussi l'appeler dans `UnifiedClientView` pour calculer le nombre d'equipements et afficher un `Badge` a cote du texte "Materiel" dans le `TabsTrigger`.

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/components/clients/UnifiedClientView.tsx` | Appeler `useClientContracts`, calculer le compteur, ajouter un Badge sur l'onglet |

## Detail technique

### 1. Importer et appeler le hook (en haut du composant)

Ajouter `useClientContracts` et calculer le nombre d'equipements des contrats actifs :

```typescript
const { contracts: clientContracts } = useClientContracts(client.email, client.id);
const activeEquipmentCount = clientContracts
  .filter(c => ["active", "signed", "in_progress", "delivered"].includes(c.status))
  .flatMap(c => c.contract_equipment || [])
  .reduce((sum, eq) => sum + (eq.quantity || 1), 0);
```

### 2. Modifier le TabsTrigger "equipment" (ligne 576-579)

Ajouter un Badge conditionnel apres le texte :

```tsx
<TabsTrigger value="equipment" className="flex items-center gap-2">
  <Monitor className="h-4 w-4" />
  Matériel
  {activeEquipmentCount > 0 && (
    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
      {activeEquipmentCount}
    </Badge>
  )}
</TabsTrigger>
```

## Ce qui ne change pas

- Le composant `ClientActiveEquipment` reste inchange
- Les autres onglets ne sont pas affectes
- Le hook `useClientContracts` est reutilise tel quel (pas de requete supplementaire si le composant enfant l'appelle aussi grace au cache)

