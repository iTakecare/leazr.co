

## Problème identifié

En vérifiant la base de données, le `vat_number` est bien sauvegardé pour les leads importés **avant le 12 mars** (ex: SK Finances → `BE0567836416`, Sassou → `BE1008527905`), mais il est `null` pour les leads **à partir du 13 mars** (Capeleon, 3 stars construction, Collard Yohan) — alors que ces numéros sont visibles dans le Google Sheet (colonne N).

**Cause racine** : Le Google Apps Script externe a cessé d'envoyer le champ `vat_number` dans le payload JSON vers l'edge function `import-meta-leads`. C'est un problème côté script Google, pas côté Leazr.

Le code Supabase est correct : `vat_number: lead.vat_number || null` fonctionne bien quand la donnée est présente.

## Corrections proposées

### 1. Ajouter un log du payload brut reçu dans `import-meta-leads`

Pour diagnostiquer ce genre de problème à l'avenir, logger les champs reçus pour chaque lead :

```typescript
console.log(`[META IMPORT] Raw lead fields: ${Object.keys(lead).join(', ')}`);
console.log(`[META IMPORT] vat_number received: "${lead.vat_number || 'MISSING'}"`);
```

### 2. Inclure le numéro TVA dans les notes du client (traçabilité)

Ajouter le `vat_number` dans le bloc de notes quand il est présent, pour qu'il soit visible même si le champ DB est vide :

```
🔹 N° TVA: BE0801690944
```

### 3. Mettre à jour le client existant si `vat_number` manquant

Quand un client existant est trouvé (ligne 959-962), mettre à jour les champs vides (`vat_number`, `company`) avec les nouvelles données du lead :

```typescript
if (existingClient) {
  clientId = existingClient.id;
  // Enrichir le client existant avec les données manquantes
  const updates = {};
  if (!existingClient.vat_number && lead.vat_number) updates.vat_number = lead.vat_number;
  if (!existingClient.company && lead.company_name) updates.company = lead.company_name;
  if (Object.keys(updates).length > 0) {
    await supabase.from('clients').update(updates).eq('id', clientId);
  }
}
```

### 4. Corriger le Google Apps Script (instruction pour l'utilisateur)

Le script Google doit envoyer le champ `vat_number` dans chaque objet lead. Vérifier que la colonne N est bien mappée :

```javascript
// Dans le Apps Script Google
leads.push({
  meta_lead_id: row[0],
  // ...
  vat_number: row[13], // Colonne N (index 13)
  // ...
});
```

### Fichiers modifiés
- `supabase/functions/import-meta-leads/index.ts` — logs diagnostiques, TVA dans les notes, enrichissement client existant

