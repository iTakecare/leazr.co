

## Fallback amélioré pour le widget IA

### Modification

**Fichier** : `src/components/client/AIChatWidget.tsx`

Améliorer le `catch` (lignes 95-99) pour détecter les cas spécifiques et afficher des messages clairs :

1. **Fonction non disponible (404 / "Failed to fetch")** : "L'assistant IA n'est pas disponible pour le moment. Veuillez réessayer plus tard ou ouvrir un ticket de support."
2. **Trop de requêtes (429)** : "L'assistant est temporairement surchargé. Merci de patienter quelques instants."
3. **Crédits insuffisants (402)** : "Le service IA est momentanément indisponible. Contactez le support."
4. **Erreur réseau (TypeError / Failed to fetch)** : "Impossible de contacter le serveur. Vérifiez votre connexion internet."
5. **Autre erreur** : Message générique actuel.

Aussi ajouter la détection du statut HTTP dans le bloc `if (!resp.ok)` pour distinguer 404/429/402 avant de throw, afin de passer un message adapté dans l'erreur.

