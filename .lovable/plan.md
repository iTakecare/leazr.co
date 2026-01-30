

# Plan : Ajouter le jour de prélèvement configurable

## Contexte

Actuellement, le jour de prélèvement SEPA est hardcodé :
- Dans le PDF du contrat : `'{{payment_day}}': '1er'`
- Dans l'Edge Function Mollie : date calculée au 1er du mois suivant

L'objectif est de rendre ce paramètre configurable par l'administrateur.

## Modifications a effectuer

### 1. Base de donnees : Ajouter la colonne

Ajouter une colonne `payment_day` a la table `company_customizations` :

```sql
ALTER TABLE company_customizations 
ADD COLUMN payment_day INTEGER DEFAULT 1 CHECK (payment_day >= 1 AND payment_day <= 28);
```

Note : Limite a 28 pour eviter les problemes avec les mois courts (fevrier).

### 2. Interface TypeScript `SiteSettings`

Fichier : `src/services/settingsService.ts`

Ajouter le champ :

```typescript
export interface SiteSettings {
  // ... champs existants ...
  payment_day?: number; // 1-28
}
```

### 3. Composant de configuration

Fichier : `src/components/settings/GeneralSettings.tsx`

Ajouter un champ de selection du jour de prelevement dans la section "Informations legales" ou creer une nouvelle section "Facturation / Paiements" :

| Champ | Type | Valeurs |
|-------|------|---------|
| Jour de prelevement | Select | 1 a 28 |

### 4. Service de sauvegarde

Fichier : `src/services/settingsService.ts`

Ajouter `payment_day` dans la fonction `updateSiteSettings()` lors de l'upsert.

### 5. Edge Function Mollie

Fichier : `supabase/functions/mollie-sepa/index.ts`

Modifier l'action `setup_sepa_complete` pour :
1. Recuperer le `payment_day` depuis `company_customizations` via `company_id`
2. Utiliser ce jour au lieu du 1er par defaut

```typescript
// Recuperer le payment_day de la company
const { data: companySettings } = await supabase
  .from("company_customizations")
  .select("payment_day")
  .eq("company_id", body.company_id)
  .single();

const paymentDay = companySettings?.payment_day || 1;

// Calculer la date de debut avec le bon jour
const now = new Date();
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
const startDate = body.start_date || nextMonth.toISOString().split("T")[0];
```

### 6. PDF du contrat

Fichier : `src/components/pdf/templates/SignedContractPDFDocument.tsx`

Modifier le remplacement de `{{payment_day}}` pour utiliser la valeur configuree :

```typescript
'{{payment_day}}': formatPaymentDay(contract.payment_day || 1),
// Exemple : 1 -> "1er", 2 -> "2", etc.
```

Cela necessite de :
- Ajouter `payment_day` a l'interface `SignedContract`
- Passer la valeur depuis les settings de la company lors de la generation du PDF

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| Base de donnees | `ALTER TABLE company_customizations ADD COLUMN payment_day` |
| `src/services/settingsService.ts` | Ajouter `payment_day` a l'interface et a l'upsert |
| `src/components/settings/GeneralSettings.tsx` | Ajouter le champ de selection |
| `supabase/functions/mollie-sepa/index.ts` | Recuperer et utiliser le `payment_day` |
| `src/components/pdf/templates/SignedContractPDFDocument.tsx` | Utiliser la valeur dynamique |

## Resultat attendu

1. L'administrateur peut configurer le jour de prelevement (1-28) dans les parametres
2. Ce jour est utilise pour creer les abonnements Mollie
3. Ce jour apparait dans les contrats PDF generes
4. Par defaut, le systeme utilise le 1er du mois si non configure

