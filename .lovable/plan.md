
# Export Excel du parc materiel client

## Objectif

Ajouter un bouton d'export Excel dans le composant `ClientActiveEquipment` pour telecharger la liste des equipements actifs du client.

## Fichiers concernes

| Fichier | Changement |
|---|---|
| `src/components/clients/ClientActiveEquipment.tsx` | Ajouter le bouton export et la logique d'export Excel via ExcelJS |

## Detail technique

### Logique d'export (dans le composant)

Ajouter une fonction `handleExportExcel` qui :
- Utilise `ExcelJS` (deja installe dans le projet) pour creer un classeur
- Cree une feuille "Parc materiel" avec les colonnes : Designation, Quantite, N de serie, N contrat, Statut contrat, Echeance
- Remplit les lignes a partir de `equipmentRows` (deja calcule dans le composant)
- Style l'en-tete (fond colore, texte blanc, gras)
- Ajoute un auto-filtre
- Declenche le telechargement du fichier `.xlsx`

Le nom du fichier inclura le nom du client si disponible : `parc_materiel_[client]_[date].xlsx`

### Modifications UI

Ajouter un bouton "Exporter" avec l'icone `Download` dans le `CardHeader`, a cote du titre, aligne a droite. Le bouton est desactive si la liste est vide.

```text
CardHeader
+-----------------------------------------------+
| [Monitor] Materiel en cours    [Exporter xlsx] |
| Description...                                 |
+-----------------------------------------------+
```

### Props

Le composant recevra une prop optionnelle `clientName?: string` pour nommer le fichier d'export. On ajoutera cette prop dans `UnifiedClientView.tsx` lors de l'appel au composant.

### Fichier supplementaire modifie

| Fichier | Changement |
|---|---|
| `src/components/clients/UnifiedClientView.tsx` | Passer `clientName={client.name}` au composant `ClientActiveEquipment` |

## Patron suivi

Le code suit le meme patron que `stockExportService.ts` : creation de workbook ExcelJS, style d'en-tete, auto-filtre, generation de buffer et telechargement via Blob URL.
