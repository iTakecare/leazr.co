

# Gestion des doublons lors du reimport Excel

## Probleme actuel
La detection de doublons repose uniquement sur le numero de serie (`serial_number`). Les articles sans numero de serie sont reinsertes a chaque import, ce qui explique que vous avez 69 articles au lieu de 100 : seuls les articles avec un serial deja present sont ignores.

## Solution proposee
Ajouter une detection de doublons multi-criteres qui fonctionne meme sans numero de serie.

### Criteres de detection (par ordre de priorite)
1. **Numero de serie** : si l'article a un serial number identique a un existant -> doublon
2. **Combinaison titre + marque + modele + numero de serie (vide)** : si un article sans serial a le meme titre, la meme marque et le meme modele qu'un existant -> doublon
3. **Titre + fournisseur + prix unitaire** : pour les articles generiques sans marque/modele specifique

### Fichier modifie

| Fichier | Modification |
|---|---|
| `src/services/stockImportService.ts` | Ameliorer la logique de detection des doublons dans `importStockItems()` |

### Detail technique

Dans `importStockItems()` :

1. **Charger les articles existants avec plus de champs** : au lieu de ne charger que `serial_number`, charger aussi `title`, `brand`, `model`, `supplier_id`, `unit_price`
2. **Creer un Set de "fingerprints"** : pour chaque article existant, generer une cle composite normalisee (ex: `normalize(title)|normalize(brand)|normalize(model)`)
3. **Verifier chaque ligne importee** contre ces fingerprints :
   - Si serial_number present et deja en base -> doublon
   - Sinon, si fingerprint (titre+marque+modele) deja en base -> doublon
4. **Ajouter les fingerprints des articles inseres** au Set pour eviter les doublons intra-fichier
5. **Afficher le nombre de doublons ignores** dans le resultat (deja supporte par `StockImportResult.duplicates`)

### Flux utilisateur
1. L'utilisateur importe un fichier Excel
2. Le systeme compare chaque ligne aux articles existants
3. Les doublons sont ignores (pas de mise a jour, pas d'insertion)
4. A la fin, un message indique : "X articles importes, Y doublons ignores, Z erreurs"

