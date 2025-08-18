# API Changelog - Product Request

## Version 2024.3 - Correction des clients libres et améliorations système
*Date de mise à jour : 18 août 2025*

### Corrections critiques

**Correction de la fonction `getFreeClients`**
- Implémentation complète de la fonction `getFreeClients` dans `clientService.ts`
- Utilisation de la fonction RPC sécurisée `get_free_clients_secure()`
- Correction du bug "Aucun client disponible" en mode offre interne
- Ajout de logs détaillés pour le débogage

**Corrections du système de clients**
- Correction de la fonction `create_primary_collaborator_for_client`
- Amélioration de l'isolation multi-tenant pour les clients libres
- Optimisation des requêtes RPC pour les performances

### Fonctionnalités techniques ajoutées
- Support complet des clients libres (non rattachés aux ambassadeurs)
- Mécanisme de sélection de clients optimisé pour les offres internes
- Logging amélioré pour tous les services clients

## Version 2024.2 - Adresses de facturation et livraison séparées

### Nouvelles fonctionnalités

**Séparation des adresses de facturation et livraison**
- Les adresses de facturation sont maintenant extraites depuis `company_info`
- Les adresses de livraison sont extraites depuis `delivery_info`
- Nouveau champ `delivery_same_as_billing` pour indiquer si les adresses sont identiques

### Structure des données client mise à jour

```json
{
  "contact_info": {
    "email": "client@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+32123456789"
  },
  "company_info": {
    "company_name": "ACME Corp",
    "vat_number": "BE0123456789",
    "address": "123 Rue de la Facturation",
    "city": "Bruxelles",
    "postal_code": "1000",
    "country": "BE"
  },
  "delivery_info": {
    "address": "456 Rue de la Livraison",
    "city": "Anvers",
    "postal_code": "2000",
    "country": "BE"
  },
  "products": [...]
}
```

### Comportement de l'API

1. **Adresses de facturation** : Toujours extraites depuis `company_info`
2. **Adresses de livraison** : 
   - Si `delivery_info` est fourni avec des données différentes → Adresse de livraison distincte
   - Si `delivery_info` est identique à `company_info` → `delivery_same_as_billing = true`
   - Si `delivery_info` est absent → `delivery_same_as_billing = true` (livraison = facturation)

### Compatibilité

L'API reste rétro-compatible :
- Les anciens champs `address`, `city`, `postal_code`, `country` sont maintenus
- Les nouveaux champs sont automatiquement peuplés lors de la création des clients