

## Plan : Partager les options de personnalisation entre packs

### Problème

Quand un partenaire a plusieurs packs, les options de personnalisation (catégories de produits, variantes autorisées) doivent être configurées individuellement pour chaque pack, même si elles sont identiques.

### Solution : "Copier depuis un autre pack"

Ajouter un bouton dans `PartnerPackOptionsEditor` permettant d'importer toutes les options d'un autre pack du même partenaire. Cela évite de tout reconfigurer manuellement à chaque fois.

Avantages :
- Pas de changement de schéma DB (les options restent liées à `partner_pack_id`)
- L'admin peut ensuite ajuster les options copiées si besoin
- Simple et intuitif

### Changements

**Fichier : `src/components/partners/PartnerPackOptionsEditor.tsx`**

1. Ajouter une prop `partnerId` pour pouvoir requêter les autres packs du partenaire
2. Charger les autres `partner_packs` du même partenaire (via `fetchPartnerPacks`)
3. Filtrer pour exclure le pack en cours d'édition
4. Afficher un bouton "Copier les options d'un autre pack" qui ouvre un Select listant les autres packs
5. Au clic sur "Copier", récupérer les options du pack source (`fetchPartnerPackOptions`) puis les insérer une par une via `upsertPartnerPackOption` avec le `partner_pack_id` du pack cible (sans `id` pour créer de nouvelles entrées)

**Fichier : `src/components/partners/PartnerPackManager.tsx`**

6. Passer `partner.id` au composant `PartnerPackOptionsEditor` via une nouvelle prop `partnerId`

### UI

```text
┌─────────────────────────────────────────────┐
│ Options du pack : The Pod - Pack PC         │
├─────────────────────────────────────────────┤
│ [📋 Copier les options d'un autre pack ▼]   │
│   ┌──────────────────────────┐              │
│   │ The Pod - Pack Starter   │              │
│   │ The Pod - Pack Premium   │              │
│   └──────────────────────────┘              │
│                                             │
│ ── Options existantes ──                    │
│ [Écrans]  Obligatoire  Qté max: 1  3 prods │
│ [Souris]  Optionnel    Qté max: 1  5 prods │
│                                             │
│ [+ Ajouter une catégorie d'option]          │
└─────────────────────────────────────────────┘
```

### Flux

1. Admin ouvre les options du Pack A (déjà configuré)
2. Admin configure les options, sauvegarde
3. Admin ouvre les options du Pack B (vide)
4. Clique "Copier les options d'un autre pack" → sélectionne Pack A
5. Toutes les options de Pack A sont dupliquées dans Pack B
6. Admin peut ajuster si nécessaire

