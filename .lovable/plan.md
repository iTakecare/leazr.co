
# Fix: Erreur "column contract_equipment.product_id does not exist"

## Probleme

Le composant `EquipmentOrderTracker.tsx` utilise une seule requete pour interroger soit `offer_equipment` soit `contract_equipment` selon le `sourceType`. La requete inclut le champ `product_id` (ligne 73), qui existe dans `offer_equipment` mais pas dans `contract_equipment`. Quand le composant est utilise pour un contrat, Supabase renvoie l'erreur.

## Solution

Adapter la requete dans `fetchData` pour ne pas inclure `product_id` quand `sourceType === 'contract'`.

### Fichier modifie

**`src/components/contracts/EquipmentOrderTracker.tsx`**

- Ligne 73 : construire dynamiquement la liste de colonnes selon `sourceType`
  - Pour `offer` : inclure `product_id`
  - Pour `contract` : exclure `product_id`
- L'interface `EquipmentItem` garde `product_id` optionnel (deja le cas ligne 38)
- La logique `startEditing` qui utilise `product_id` (ligne 135) fonctionne deja avec un check `if (!eq.supplier_id && eq.product_id)`, donc pas de changement necessaire

### Changement concret

```typescript
// Ligne 73 - avant :
.select('id, title, quantity, purchase_price, product_id, order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes')

// Apres :
const selectColumns = sourceType === 'offer'
  ? 'id, title, quantity, purchase_price, product_id, order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes'
  : 'id, title, quantity, purchase_price, order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes';

// puis utiliser selectColumns dans la requete
.select(selectColumns)
```

## Impact

- Corrige l'erreur toast "column contract_equipment.product_id does not exist"
- Aucun impact sur le fonctionnement pour les offres
- La fonctionnalite d'auto-remplissage fournisseur prefere (qui depend de `product_id`) reste disponible pour les offres
