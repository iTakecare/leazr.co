

## Plan : Copier les options d'un pack d'un autre partenaire

### Problème actuel

Le sélecteur "Copier les options d'un autre pack" ne montre que les packs du même partenaire. Il faut pouvoir copier depuis n'importe quel partenaire.

### Solution

Modifier `PartnerPackOptionsEditor.tsx` pour ajouter un second mode de copie : sélection d'un partenaire source, puis d'un de ses packs.

### Changements

**Fichier : `src/components/partners/PartnerPackOptionsEditor.tsx`**

1. Importer `fetchPartners` depuis `partnerService`
2. Récupérer le `companyId` via le hook existant (ou le passer en prop depuis `PartnerPackManager`)
3. Ajouter une query pour charger tous les partenaires (`fetchPartners(companyId)`)
4. Remplacer le sélecteur unique par deux sélecteurs chaînés :
   - **Select 1** : Choisir un partenaire (tous les partenaires, y compris le courant)
   - **Select 2** : Choisir un pack de ce partenaire (chargé dynamiquement via `fetchPartnerPacks(selectedPartnerId)`, en excluant le pack en cours d'édition si même partenaire)
5. Le bouton "Copier" reste identique, il utilise le `copySourcePackId` sélectionné

**Fichier : `src/components/partners/PartnerPackManager.tsx`**

6. Passer `companyId` en prop à `PartnerPackOptionsEditor` (récupéré depuis le contexte auth existant dans `PartnerManager`)

### UI résultante

```text
┌─────────────────────────────────────────────────────┐
│ 📋 [Partenaire source ▼]  [Pack source ▼]  [Copier]│
└─────────────────────────────────────────────────────┘
```

Le premier select liste tous les partenaires. Une fois un partenaire choisi, le second select liste ses packs. Le bouton Copier duplique les options du pack sélectionné.

