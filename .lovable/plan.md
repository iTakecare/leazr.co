

# Éviter les doublons clients dans l'Edge Function `create-product-request`

## Problème

L'Edge Function `create-product-request` (lignes 410-458) crée **systématiquement un nouveau client** à chaque demande, même si un client avec le même email existe déjà. Cela génère des doublons dans la table `clients`.

Le flux depuis l'espace client (`ClientRequestSummary` → `createClientRequest`) n'a pas ce problème car il passe directement le `client_id` existant. Le problème concerne uniquement le flux public (site web / partenaires).

## Correction

**Fichier : `supabase/functions/create-product-request/index.ts`**

Remplacer la création aveugle du client (lignes 410-458) par une logique "find or create" :

1. **Chercher un client existant** par email + company_id :
```typescript
let clientId: string;

// Chercher un client existant avec cet email dans cette company
const { data: existingClient } = await supabaseAdmin
  .from('clients')
  .select('id')
  .eq('email', clientEmail)
  .eq('company_id', targetCompanyId)
  .maybeSingle();

if (existingClient) {
  clientId = existingClient.id;
  console.log(`✅ Client existant trouvé: ${clientId}`);
  
  // Mettre à jour les infos du client existant (phone, address, etc.)
  await supabaseAdmin.from('clients').update({
    phone: clientPhone || undefined,
    vat_number: clientVatNumber || undefined,
    address: clientAddress || undefined,
    city: clientCity || undefined,
    postal_code: clientPostalCode || undefined,
    // ... autres champs non-vides
  }).eq('id', clientId);
} else {
  clientId = crypto.randomUUID();
  // Insérer le nouveau client (code existant)
  const { error } = await supabaseAdmin.from('clients').insert({ id: clientId, ... });
  if (error) throw new Error(`Erreur client: ${error.message}`);
}
```

2. Supprimer la ligne `const clientId = crypto.randomUUID();` (ligne 412) et la rendre conditionnelle.

3. Le reste du code (création de l'offre, équipements) utilise déjà `clientId` — aucun autre changement nécessaire.

## Détails techniques

- La recherche se fait par `email` + `company_id` pour éviter les collisions multi-tenant.
- Si le client existe, on met à jour uniquement les champs non-vides (pour ne pas écraser des données existantes avec des valeurs vides).
- Redéploiement de l'Edge Function requis après modification.

