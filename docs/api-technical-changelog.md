# Changelog Technique - iTakecare API

## Version 2024.3 - 18 août 2025

### 🔧 Corrections Critiques

#### Système de clients libres (Offres internes)
- **Problème résolu** : Function `getFreeClients` non implémentée causant "Aucun client disponible"
- **Solution** : Implémentation complète utilisant `get_free_clients_secure()` RPC
- **Impact** : Les utilisateurs peuvent maintenant sélectionner des clients en mode offre interne
- **Fichiers modifiés** :
  - `src/services/clientService.ts` : Implémentation de `getFreeClients`
  - `src/components/ui/ClientSelector.tsx` : Gestion améliorée des états de chargement

#### Fonction RPC create_primary_collaborator_for_client
- **Problème résolu** : Erreur lors de la création de collaborateurs primaires
- **Solution** : Correction de la logique de création automatique
- **Impact** : Création fluide des clients via l'API Product Request

### 🚀 Améliorations Techniques

#### Services clients optimisés
```typescript
// Nouvelles fonctions sécurisées
export const getFreeClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase.rpc('get_free_clients_secure');
  // ... gestion d'erreurs et logs
}
```

#### Edge Functions confirmées
- ✅ `create-product-request` : Opérationnelle
- ✅ `catalog-api` : Déployée avec endpoints environnementaux
- ✅ Configuration CORS appropriée pour toutes les functions

### 🔍 Debugging et Monitoring
- Ajout de logs détaillés pour `getFreeClients`
- Amélioration des messages d'erreur dans `ClientSelector`
- Logs de performance pour les RPC calls

---

## Version 2024.2 - Adresses séparées

### Nouvelles fonctionnalités
- Séparation des adresses de facturation et livraison
- Champ `delivery_same_as_billing` pour optimiser les données
- Structure de données client enrichie

### Compatibilité
- API rétro-compatible avec les anciens formats
- Migration automatique des données existantes

---

## Version 2024.1 - Base initiale

### Fonctionnalités de base
- API Product Request fonctionnelle
- Système de catalogue avec données environnementales
- Isolation multi-tenant avec RLS

### Architecture
- Edge Functions Supabase
- Frontend React avec TypeScript
- Services clients avec gestion d'erreurs