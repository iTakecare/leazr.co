
# Plan : Bouton "Relancer le prélèvement" pour les paiements echoues

## Contexte

Dans la section "Historique recent" de la carte SEPA Mollie, quand un paiement a le statut "Echoue" (failed), vous souhaitez avoir un bouton pour relancer manuellement une nouvelle demande de prelevement.

## Solution technique

### Composant a modifier

**`src/components/contracts/MollieSepaCard.tsx`**

### Modifications a effectuer

1. **Ajouter un etat pour le paiement en cours de relance**
```typescript
const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null);
```

2. **Creer une fonction `handleRetryPayment`** qui :
   - Appelle `createMolliePayment()` avec le meme montant et les infos du contrat
   - Affiche un toast de confirmation ou d'erreur
   - Rafraichit l'historique des paiements apres succes

3. **Modifier le rendu de l'historique** (lignes 472-485) pour afficher le bouton "Relancer" a cote des paiements echoues :

```text
+--------------------------------------------------+
| 1 fevrier 2026     67.69 EUR  [Echoue] [Relancer]|
+--------------------------------------------------+
```

### Details du bouton

- **Icone** : RefreshCw (deja importe)
- **Texte** : "Relancer" (ou juste l'icone sur mobile)
- **Variante** : `ghost` ou `outline` de couleur destructive
- **Taille** : Petite (`size="sm"`)
- **Etat de chargement** : Spinner pendant la requete

### Logique de relance

```typescript
const handleRetryPayment = async (payment: MolliePayment) => {
  if (!contract.mollie_customer_id) {
    toast.error("Aucun client Mollie configure");
    return;
  }

  try {
    setRetryingPaymentId(payment.id);
    
    const result = await createMolliePayment({
      customer_id: contract.mollie_customer_id,
      mandate_id: contract.mollie_mandate_id || undefined,
      amount: parseFloat(payment.amount.value),
      description: payment.description || `Loyer mensuel - Contrat ${contract.id.substring(0, 8)}`,
      contract_id: contract.id,
      company_id: companyId,
    });

    if (result.success) {
      toast.success("Prelevement relance avec succes");
      // Rafraichir l'historique
      await fetchMollieDetails();
    } else {
      toast.error(result.error || "Erreur lors de la relance");
    }
  } catch (error) {
    console.error("Retry payment error:", error);
    toast.error("Erreur lors de la relance du prelevement");
  } finally {
    setRetryingPaymentId(null);
  }
};
```

### Rendu dans l'historique

```tsx
{recentPayments.slice(0, 5).map((payment) => (
  <div 
    key={payment.id} 
    className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
  >
    <span className="text-muted-foreground">
      {formatDate(payment.createdAt)}
    </span>
    <span className="font-medium">
      {parseFloat(payment.amount.value).toFixed(2)} EUR
    </span>
    <div className="flex items-center gap-2">
      {getPaymentStatusBadge(payment.status)}
      {/* Bouton Relancer pour les paiements echoues */}
      {(payment.status === "failed" || payment.status === "expired" || payment.status === "canceled") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRetryPayment(payment)}
          disabled={retryingPaymentId === payment.id}
          className="h-6 px-2 text-xs"
        >
          {retryingPaymentId === payment.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Relancer
            </>
          )}
        </Button>
      )}
    </div>
  </div>
))}
```

## Resume des changements

| Fichier | Modification |
|---------|-------------|
| `src/components/contracts/MollieSepaCard.tsx` | Ajouter bouton "Relancer" pour les paiements echoues |

## Resultat attendu

1. Dans l'historique des paiements, les paiements avec statut "Echoue", "Expire" ou "Annule" afficheront un bouton "Relancer"
2. Cliquer sur ce bouton creera un nouveau prelevement SEPA via l'API Mollie
3. Un toast confirmera le succes ou l'echec de la relance
4. L'historique sera automatiquement rafraichi pour afficher le nouveau paiement
