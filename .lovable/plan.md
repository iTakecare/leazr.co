

# Fix : Filtrer les commandes sur les offres acceptees uniquement

## Probleme

Actuellement, la vue globale "Commandes fournisseurs" et le tracker affichent les equipements de TOUTES les offres, y compris les brouillons, les offres envoyees, refusees, etc. Seules les offres avec `workflow_status = 'accepted'` doivent apparaitre dans le suivi des commandes.

Les contrats ne sont pas concernes par ce filtre car ils sont deja le resultat d'une offre acceptee.

## Modification

### `src/services/equipmentOrderService.ts`

Dans la fonction `fetchAllEquipmentOrders`, ajouter un filtre sur `offers.workflow_status` pour ne recuperer que les offres acceptees :

**Avant :**
```
.eq('offers.company_id', companyId);
```

**Apres :**
```
.eq('offers.company_id', companyId)
.eq('offers.workflow_status', 'accepted');
```

### `src/components/contracts/EquipmentOrderTracker.tsx`

Meme ajustement si le composant fait sa propre requete pour les offres : ajouter le filtre `workflow_status = 'accepted'` sur la requete des equipements d'offre.

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| `src/services/equipmentOrderService.ts` | Ajouter `.eq('offers.workflow_status', 'accepted')` sur la requete offer_equipment |
| `src/components/contracts/EquipmentOrderTracker.tsx` | Ajouter le meme filtre si la requete offre est presente |

