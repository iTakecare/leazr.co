

# Fix: Afficher les équipements réels dans les onglets client

## Problème
Les onglets "Par contrat", "Par équipement" et "Logiciels" de la page Gestion des Équipements parsent le champ texte `equipment_description` de la table `contracts` au lieu de requêter la table `contract_equipment` qui contient les vrais équipements (ceux visibles dans l'onglet "Assignation"). Résultat : ces onglets affichent "Aucun contrat actif" / "Aucun équipement trouvé" même quand il y a des équipements assignés.

## Solution

### `src/pages/ClientEquipmentPage.tsx`

1. **Remplacer la source de données** : Au lieu de parser `equipment_description`, faire une requête sur `contract_equipment` jointe à `contracts` pour récupérer les vrais équipements avec leurs numéros de série, collaborateurs, etc.

```typescript
// Nouvelle requête — remplace la requête contracts existante
const { data: contractEquipment = [] } = useQuery({
  queryKey: ["client-contract-equipment", clientData?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contract_equipment")
      .select(`
        id, title, quantity, serial_number, monthly_payment, purchase_price,
        collaborator_id, contract_id,
        contracts!inner(id, client_name, status, tracking_number, monthly_payment, start_date, client_id)
      `)
      .eq("contracts.client_id", clientData!.id)
      .eq("contracts.status", "active");
    if (error) throw error;
    return data || [];
  },
  enabled: !!clientData?.id,
});
```

2. **Reconstruire `contracts` et `allEquipment` depuis cette data** :
   - Grouper par `contract_id` pour l'onglet "Par contrat"
   - Aplatir pour l'onglet "Par équipement" et "Logiciels"
   - Passer les vrais équipements au `ClientSoftwareTab`

3. **Onglet Logiciels** : Le composant `ClientSoftwareTab` recevra les vrais équipements au lieu d'une liste vide, donc le dropdown "Équipement cible" sera peuplé correctement.

### Pas de changement de schéma ni de RLS
La policy `clients_can_view_own_contract_equipment` existe déjà et fonctionne.

