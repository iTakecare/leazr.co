export function sanitizeError(error: any): string {
  // Mapping des erreurs courantes vers messages génériques
  const errorPatterns: Record<string, string> = {
    'relation': 'Une erreur technique est survenue',
    'duplicate': 'Cette ressource existe déjà',
    'not found': 'Ressource introuvable',
    'permission': 'Accès non autorisé',
    'unique constraint': 'Cette donnée existe déjà',
    'foreign key': 'Opération impossible : donnée liée',
    'jwt': 'Session expirée. Veuillez vous reconnecter.',
    'connection': 'Erreur de connexion au serveur',
    'timeout': 'La requête a pris trop de temps',
  };

  const errorMessage = error?.message?.toLowerCase() || '';

  for (const [pattern, message] of Object.entries(errorPatterns)) {
    if (errorMessage.includes(pattern)) {
      return message;
    }
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}

export function createErrorResponse(error: any, corsHeaders: Record<string, string>) {
  // Log détaillé server-side uniquement
  console.error('[INTERNAL ERROR]', {
    message: error?.message,
    stack: error?.stack,
    name: error?.name
  });
  
  return new Response(
    JSON.stringify({ 
      error: sanitizeError(error),
      code: 'INTERNAL_ERROR',
      requestId: crypto.randomUUID() // Pour le support technique
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
