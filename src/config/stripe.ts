
// Configuration Stripe
export const STRIPE_CONFIG = {
  // Clé publique Stripe - récupérée depuis les variables d'environnement
  publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_51RSaxg2SBsy1aJL0mkoGaHFfsePkzVi23DCaslMqZnz1MiMPfKCLhhvQAypuFCirTIMCFx0Wu5RtvrqzpxM6LxSZ00bJbbsMHj",
  
  // Configuration par défaut
  options: {
    locale: 'fr' as const,
  }
};
