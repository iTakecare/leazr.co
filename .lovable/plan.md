
# Limiter les commandes fournisseurs aux contrats uniquement

## Probleme

La fonction `fetchAllEquipmentOrders` dans `equipmentOrderService.ts` recupere a la fois les equipements des **offres acceptees** (`offer_equipment`) et des **contrats** (`contract_equipment`), alors que seuls les contrats doivent apparaitre dans l'ecran des commandes fournisseurs.

## Solution

Supprimer la requete et le mapping des `offer_equipment` dans la fonction `fetchAllEquipmentOrders`, ne conserver que les `contract_equipment`.

## Fichier modifie

`src/services/equipmentOrderService.ts` - fonction `fetchAllEquipmentOrders` (lignes 162-245)

### Changements

1. **Supprimer** la requete Supabase sur `offer_equipment` (lignes 163-173)
2. **Supprimer** le mapping des offres dans le tableau `items` (lignes 199-217)
3. **Nettoyer** les references aux unites de type `offer` dans le fetch des `equipment_order_units` (ne filtrer que les unites `contract`)
4. **Conserver** uniquement la requete `contract_equipment` et son mapping

La fonction ne retournera plus que les equipements issus de contrats, ce qui correspond au comportement attendu.
