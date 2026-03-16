

## Enrichir le contexte client dans l'assistant IA

### Problème

L'Edge Function `client-ai-chat` récupère les contrats et demandes mais ne transmet que des infos minimales au modèle IA :
- Contrats : juste `status` et `monthly_payment`
- Demandes : juste `status` et `monthly_payment`
- Aucun détail sur les équipements (`offer_equipment`), dates, descriptions
- Le system prompt ne dit pas à l'IA d'utiliser ces données de façon précise

Résultat : l'IA donne des réponses génériques au lieu de citer les vraies données du client.

### Solution

**Fichier : `supabase/functions/client-ai-chat/index.ts`**

1. **Enrichir la requête contrats** : ajouter `client_name, equipment_description, tracking_number, delivery_status` et formater avec les détails (dates, équipement, montant)

2. **Enrichir la requête demandes** : joindre `offer_equipment(title, quantity, monthly_payment, purchase_price)` pour avoir le détail des équipements par demande, et ajouter `created_at, type, amount`

3. **Ajouter les factures** : requêter `invoices` liées au client pour donner l'info sur les paiements

4. **Améliorer le system prompt** : instruire l'IA de répondre avec les données exactes du client, citer les montants, statuts, équipements par leur nom, et ne jamais inventer de données

### Détail du contexte enrichi

```text
Contrats du client:
- Contrat #ABC (actif) : MacBook Pro 16" - 125€/mois - du 01/03/2025 au 01/03/2028

Demandes en cours:
- Demande #DEF (en validation) créée le 15/03/2026 :
  · 2x Dell Latitude 5540 - 89€/mois
  · 1x Écran Dell 27" - 25€/mois
  Total: 203€/mois

Factures:
- Facture #001 - 125€ - payée le 01/03/2026
```

### System prompt amélioré

```text
Tu es l'assistant IA du portail client iTakecare. Tu as accès aux données 
réelles du client ci-dessous. Quand le client pose une question sur ses 
contrats, demandes ou factures, réponds avec les données exactes (montants, 
dates, noms d'équipements). Ne donne JAMAIS de réponse générique si tu as 
les données. Si une information n'est pas dans tes données, dis-le 
clairement et propose d'ouvrir un ticket de support.
```

### Fichiers impactés
1. `supabase/functions/client-ai-chat/index.ts` — enrichir les requêtes DB et le system prompt
2. Redéploiement de l'Edge Function

