import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Schémas de validation Zod pour les edge functions
 * Prévient les injections et garantit l'intégrité des données
 */

// Schéma pour email
export const emailSchema = z.string()
  .trim()
  .email('Format email invalide')
  .max(255, 'Email trop long (max 255 caractères)');

// Schéma pour mot de passe fort
export const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Mot de passe trop long (max 128 caractères)')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

// Schéma pour mot de passe simple (login seulement)
export const passwordLoginSchema = z.string()
  .min(1, 'Mot de passe requis')
  .max(128, 'Mot de passe trop long');

// Schéma pour token d'authentification
export const tokenSchema = z.string()
  .trim()
  .min(10, 'Token invalide')
  .max(500, 'Token trop long');

// Schéma pour nom (prénom/nom)
export const nameSchema = z.string()
  .trim()
  .min(1, 'Ce champ est requis')
  .max(100, 'Nom trop long (max 100 caractères)')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides dans le nom');

// Schéma pour UUID
export const uuidSchema = z.string()
  .uuid('UUID invalide');

// ========================================
// Schémas pour les requêtes edge functions
// ========================================

// Login
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordLoginSchema
});

// Signup
export const signupRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  companyId: uuidSchema.optional(),
  companyName: z.string().trim().min(1).max(200).optional()
});

// Update password avec token
export const updatePasswordRequestSchema = z.object({
  token: tokenSchema,
  password: passwordSchema
});

// Update user email
export const updateUserEmailRequestSchema = z.object({
  user_id: uuidSchema,
  new_email: emailSchema
});

// Update user password
export const updateUserPasswordRequestSchema = z.object({
  user_id: uuidSchema,
  new_password: passwordSchema
});

// Password reset request
export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

// Product request schema
const productItemSchema = z.object({
  product_id: uuidSchema,
  variant_id: uuidSchema.optional(),
  quantity: z.number().int().positive().max(1000, 'Quantité trop élevée'),
  purchase_price: z.number().positive().max(1000000, 'Prix d\'achat invalide').optional(),
  monthly_payment: z.number().positive().max(100000, 'Mensualité invalide').optional()
});

export const createProductRequestSchema = z.object({
  products: z.array(productItemSchema).min(1, 'Au moins un produit requis').max(50, 'Maximum 50 produits'),
  client: z.object({
    name: z.string().trim().min(2, 'Nom trop court').max(100, 'Nom trop long'),
    email: emailSchema,
    company: z.string().trim().max(200, 'Nom entreprise trop long').optional(),
    phone: z.string().trim().max(20, 'Téléphone invalide').optional()
  }),
  estimated_budget: z.number().positive().max(10000000, 'Budget invalide').optional()
});

// Document request schema
export const sendDocumentRequestSchema = z.object({
  offerId: uuidSchema,
  clientEmail: emailSchema,
  clientName: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
  requestedDocs: z.array(z.string().trim().min(1).max(100)).min(1, 'Au moins un document requis').max(20, 'Trop de documents'),
  customMessage: z.string().trim().max(1000, 'Message trop long').optional(),
  uploadToken: z.string().trim().min(10).max(500, 'Token invalide').optional()
});

/**
 * Helper function pour valider et parser les données de requête
 * Retourne les données validées ou lance une erreur ZodError
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Helper function pour créer une réponse d'erreur de validation
 */
export function createValidationErrorResponse(error: z.ZodError, corsHeaders: Record<string, string>): Response {
  const formattedErrors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return new Response(
    JSON.stringify({
      error: 'Données invalides',
      details: formattedErrors
    }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
