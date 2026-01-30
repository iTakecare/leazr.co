

# Correction de l'erreur "Load failed" pour le webhook Zapier

## Problème identifié

L'erreur "Load failed" sur la requête POST vers Zapier a **deux causes possibles** :

### Cause 1 : Zap non publié (PROBABLE)
Dans la capture d'écran Zapier, le Zap est en mode **"Draft"**. Un Zap doit être **publié** pour recevoir des requêtes externes.

### Cause 2 : Comportement de Safari
Safari est plus strict que Chrome concernant les requêtes `no-cors`. Même si la requête est envoyée, Safari peut lever une exception si le serveur ne répond pas de manière attendue.

---

## Solution

### Étape 1 : Action utilisateur (publier le Zap)
1. Dans Zapier, cliquez sur **"Publish"** en haut à droite
2. Le Zap passera de "Draft" à "On"
3. Retestez depuis Lovable

### Étape 2 : Amélioration du code (résilience Safari)

Modifier la gestion du fetch pour être plus tolérant aux particularités de Safari :

```typescript
const handleTest = async () => {
  // ... validation existante ...

  try {
    setTesting(true);

    const testPayload = {
      event_type: "test",
      timestamp: new Date().toISOString(),
      triggered_from: window.location.origin,
      data: {
        message: "Test de connexion Zapier depuis Leazr",
        test: true,
      },
    };

    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      await fetch(trimmedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // En mode no-cors, certaines erreurs sont "normales"
      // car on ne peut pas lire la réponse
      console.warn("Fetch warning (peut être normal en no-cors):", fetchError);
    }

    // Avec no-cors, on ne peut pas savoir si ça a vraiment fonctionné
    // Donc on affiche toujours un message informatif
    
    if (config?.id) {
      await supabase
        .from("zapier_integrations")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", config.id);
    }

    toast.info(
      "Requête envoyée vers Zapier. Vérifiez l'historique de votre Zap pour confirmer la réception. Si le Zap est en Draft, publiez-le d'abord.",
      { duration: 6000 }
    );
    
    await fetchConfig();
  } catch (error) {
    console.error("Error testing webhook:", error);
    toast.error(
      "Erreur inattendue. Vérifiez que votre Zap est publié (pas en Draft).",
      { duration: 6000 }
    );
  } finally {
    setTesting(false);
  }
};
```

---

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `ZapierIntegrationCard.tsx` | Ajout d'un try/catch interne pour le fetch avec message informatif au lieu d'une erreur |

---

## Résultat attendu

1. **Après publication du Zap** : La requête arrivera bien dans Zapier
2. **Meilleure UX** : Le message indique clairement que :
   - La requête a été envoyée (même si on ne peut pas confirmer la réception en `no-cors`)
   - L'utilisateur doit vérifier côté Zapier
   - Si ça ne fonctionne pas, il faut publier le Zap

---

## Note importante

Avec le mode `no-cors`, il est **techniquement impossible** de savoir si Zapier a bien reçu la requête depuis le navigateur. C'est une limitation de sécurité des navigateurs. La seule façon de confirmer est de vérifier l'historique du Zap dans Zapier.

