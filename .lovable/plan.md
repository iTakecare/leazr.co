

## Fix : L'assistant IA client renvoie "Failed to fetch"

### Problème

L'Edge Function `client-ai-chat` existe dans le code mais **n'est pas déployée** sur Supabase (erreur 404). Le widget AI côté client reçoit donc un "Failed to fetch" quand il essaie d'appeler la fonction.

### Solution

Déployer la fonction `client-ai-chat`. C'est tout — le code de la fonction et la config TOML sont corrects (`verify_jwt = false`).

### Action
- Déclencher le déploiement de l'Edge Function `client-ai-chat` via l'outil de déploiement

