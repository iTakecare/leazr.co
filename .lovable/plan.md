

# Correction de l'erreur de test du webhook Zapier

## Problème identifié

L'erreur "TypeError: Load failed" dans la console indique que la requête `fetch` échoue avant même d'atteindre le serveur Zapier. Cela peut arriver pour plusieurs raisons :

1. **URL malformée** - L'URL contient des caractères invalides ou des espaces
2. **Problème de protocole** - L'URL ne commence pas par `https://`
3. **Blocage du navigateur** - Certaines extensions ou paramètres de sécurité bloquent les requêtes sortantes

## Analyse du code actuel

Le code actuel (lignes 163-208 de `ZapierIntegrationCard.tsx`) :

```typescript
const handleTest = async () => {
  // ...
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
      body: JSON.stringify(testPayload),
    });
    
    // Si aucune erreur n'est levée, on considère que c'est un succès
    toast.success("Test envoyé !");
  } catch (error) {
    // "Load failed" est capturé ici
    toast.error("Erreur lors du test du webhook");
  }
};
```

Le problème est que le code traite toute exception comme une erreur, mais ne valide pas suffisamment l'URL avant l'envoi.

## Solution proposée

### 1. Améliorer la validation de l'URL avant l'envoi

Ajouter une validation plus stricte de l'URL :
- Vérifier que c'est une URL valide avec `new URL()`
- S'assurer qu'elle commence par `https://`
- Supprimer les espaces et caractères invisibles

### 2. Améliorer la gestion des erreurs

Distinguer les différents types d'erreurs pour donner un message plus utile à l'utilisateur :
- Erreur de réseau (Load failed)
- URL invalide
- Timeout

### 3. Afficher un message plus informatif

Au lieu de juste "Erreur lors du test", afficher un message qui aide à diagnostiquer le problème.

---

## Modifications du fichier

### `src/components/settings/ZapierIntegrationCard.tsx`

```typescript
const handleTest = async () => {
  const trimmedUrl = webhookUrl.trim();
  
  if (!trimmedUrl) {
    toast.error("Veuillez d'abord entrer une URL de webhook");
    return;
  }

  // Validation stricte de l'URL
  try {
    const url = new URL(trimmedUrl);
    if (url.protocol !== "https:") {
      toast.error("L'URL doit commencer par https://");
      return;
    }
    if (!url.hostname.includes("zapier.com")) {
      toast.warning("L'URL ne semble pas être un webhook Zapier valide");
    }
  } catch {
    toast.error("L'URL du webhook n'est pas valide");
    return;
  }

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

    // Note: avec mode: "no-cors", on ne peut pas vérifier la réponse
    // Une absence d'erreur signifie que la requête est partie
    const response = await fetch(trimmedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "no-cors",
      body: JSON.stringify(testPayload),
    });

    // Si on arrive ici sans exception, la requête a été envoyée
    // Note: response.type sera "opaque" avec no-cors
    
    // Mettre à jour last_triggered_at
    if (config?.id) {
      await supabase
        .from("zapier_integrations")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", config.id);
    }

    toast.success(
      "Requête envoyée ! Vérifiez l'historique de votre Zap dans Zapier pour confirmer la réception.",
      { duration: 5000 }
    );
    
    await fetchConfig();
  } catch (error) {
    console.error("Error testing webhook:", error);
    
    // Message d'erreur plus informatif
    if (error instanceof TypeError && error.message === "Load failed") {
      toast.error(
        "Impossible de contacter le webhook. Vérifiez que l'URL est correcte et que votre Zap est publié.",
        { duration: 6000 }
      );
    } else {
      toast.error(
        `Erreur lors du test: ${error instanceof Error ? error.message : "Erreur inconnue"}`
      );
    }
  } finally {
    setTesting(false);
  }
};
```

---

## Résumé des changements

| Aspect | Avant | Après |
|--------|-------|-------|
| Validation URL | Basique (contient `hooks.zapier.com`) | Validation avec `new URL()` + protocole https |
| Nettoyage URL | Aucun | `trim()` pour supprimer espaces |
| Message d'erreur | Générique | Spécifique selon le type d'erreur |
| Durée du toast | Par défaut | 5-6 secondes pour les messages importants |

---

## Impact

- Meilleure UX avec des messages d'erreur explicites
- Validation préventive avant l'envoi
- Pas de changement de fonctionnalité si l'URL est valide

