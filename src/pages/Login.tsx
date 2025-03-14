
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertTriangle, ArrowRight, Eye, EyeOff } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide" }),
  password: z.string().min(8, { message: "Le mot de passe doit comporter au moins 8 caractères" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide" }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function Login() {
  const { signIn, isClient, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const navigate = useNavigate();
  const supabase = getSupabaseClient();
  const adminSupabase = getAdminSupabaseClient();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmitLogin = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      await signIn(data.email, data.password);
      
      // Redirect to appropriate dashboard based on role
      if (isClient()) {
        navigate("/client/dashboard");
      } else if (isAdmin()) {
        navigate("/dashboard");
      } else {
        // Default fallback
        navigate("/dashboard");
      }
      
    } catch (error) {
      console.error("Login error:", error);
      // Error is handled by the signIn function in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const onSubmitResetPassword = async (data: ResetPasswordFormValues) => {
    try {
      setResetLoading(true);
      setResetError(null);
      
      // 1. Check if email exists in auth.users
      const { data: userData, error: userError } = await adminSupabase.auth.admin
        .getUserByEmail(data.email);
      
      if (userError) {
        console.error("Error checking user:", userError);
      }
      
      // 2. If not in auth system, check if it exists as a client
      if (!userData?.user) {
        // Check if email exists in clients table
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('email', data.email)
          .maybeSingle();
          
        if (clientError && clientError.code !== 'PGRST116') {
          console.error("Error checking client:", clientError);
          throw new Error("Erreur lors de la vérification du client");
        }
        
        if (clientData) {
          // Client exists but no auth account
          setResetError(
            "Cette adresse email est associée à un client mais n'a pas encore de compte utilisateur. " +
            "Veuillez créer un compte avec cette adresse."
          );
          return;
        } else {
          // No client or user found
          throw new Error("Aucun compte trouvé avec cette adresse email");
        }
      }
      
      // Email exists in auth system, proceed with password reset
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        throw error;
      }

      setResetEmailSent(true);
      toast.success('Instructions de réinitialisation envoyées par e-mail');
    } catch (error: any) {
      console.error('Reset password error:', error);
      setResetError(error.message || 'Erreur lors de la réinitialisation du mot de passe');
      toast.error(error.message || 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Formulaire à gauche */}
      <div className="flex flex-col w-full lg:w-1/2 p-8 justify-center items-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="text-2xl font-bold text-primary">iTakecare Hub</Link>
            <p className="text-muted-foreground">Plateforme de gestion pour le leasing de matériel informatique reconditionné</p>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {resetPassword ? "Réinitialiser le mot de passe" : "Connexion"}
              </CardTitle>
              <CardDescription>
                {resetPassword 
                  ? "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation"
                  : "Entrez vos identifiants pour accéder à votre compte"
                }
              </CardDescription>
            </CardHeader>

            {resetPassword ? (
              // Formulaire de réinitialisation de mot de passe
              <CardContent>
                {resetEmailSent ? (
                  <Alert className="mb-4 bg-primary/10 border-primary/20">
                    <AlertDescription className="flex items-center text-primary">
                      Vérifiez votre boîte de réception pour les instructions de réinitialisation.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(onSubmitResetPassword)} className="space-y-4">
                      {resetError && (
                        <Alert className="mb-4 bg-destructive/10 border-destructive/20">
                          <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                          <AlertDescription className="text-destructive">
                            {resetError}
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormField
                        control={resetForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="votre@email.com" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col space-y-2">
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={resetLoading}
                        >
                          {resetLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setResetPassword(false);
                            setResetError(null);
                          }}
                        >
                          Retour à la connexion
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            ) : (
              // Formulaire de connexion
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="votre@email.com" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => setResetPassword(true)}
                      >
                        Mot de passe oublié ?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Connexion en cours..." : "Se connecter"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            )}
            
            <CardFooter className="flex flex-col space-y-4 border-t pt-4">
              <div className="text-sm text-center text-muted-foreground">
                <span>Vous n'avez pas de compte ? </span>
                <Link to="/signup" className="text-primary hover:underline">
                  Créer un compte
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Image à droite - Mise à jour avec une image plus appropriée pour le matériel IT */}
      <div className="hidden lg:block lg:w-1/2 bg-primary-50">
        <div className="h-full w-full bg-cover bg-center" 
             style={{ 
               backgroundImage: "url('https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&q=80&ixlib=rb-4.0.3')", 
               backgroundSize: 'cover',
               position: 'relative'
             }}>
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 flex flex-col justify-center p-12">
            <div className="glass p-8 max-w-md">
              <h2 className="text-2xl font-bold mb-4">Leasing de matériel informatique reconditionné simplifié</h2>
              <p className="text-muted-foreground mb-6">
                Accédez à votre espace personnel pour gérer vos contrats, 
                suivre vos demandes et consulter notre catalogue de matériel informatique reconditionné.
              </p>
              <div className="flex items-center text-primary font-medium">
                En savoir plus <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Importation nécessaire pour la fonctionnalité de réinitialisation de mot de passe
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
