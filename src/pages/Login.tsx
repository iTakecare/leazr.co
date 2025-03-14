
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide" }),
  password: z.string().min(8, { message: "Le mot de passe doit comporter au moins 8 caractères" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide" }),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, { message: "Le mot de passe doit comporter au moins 8 caractères" }),
  confirmPassword: z.string().min(8, { message: "Le mot de passe doit comporter au moins 8 caractères" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function Login() {
  const { signIn, isClient, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [updatePasswordMode, setUpdatePasswordMode] = useState(false);
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false);
  const [updatePasswordError, setUpdatePasswordError] = useState<string | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Detect password reset flow
  useEffect(() => {
    const checkForPasswordReset = async () => {
      console.log("Checking for password reset parameters");
      
      // Check if we have parameters in the URL hash
      if (location.hash) {
        console.log("Hash detected:", location.hash);
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const typeParam = hashParams.get('type');
        
        console.log("Access token:", accessToken ? "Present" : "Not present");
        console.log("Type:", typeParam);
        
        if (accessToken && typeParam === 'recovery') {
          console.log("Password reset flow detected");
          setPasswordResetToken(accessToken);
          setType(typeParam);
          setUpdatePasswordMode(true);
          
          try {
            // Set the session with these tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error("Error setting session from recovery tokens:", error);
              toast.error("Erreur lors de la récupération de votre session");
              setUpdatePasswordError("Lien de réinitialisation invalide ou expiré. Veuillez réessayer.");
              setUpdatePasswordMode(false);
            } else {
              console.log("Session set for password reset");
            }
          } catch (err) {
            console.error("Exception during session setting:", err);
            setUpdatePasswordError("Une erreur est survenue lors de la récupération de votre session");
            setUpdatePasswordMode(false);
          }
        }
      }
    };
    
    checkForPasswordReset();
  }, [location.hash]);

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
  
  const updatePasswordForm = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  const testConnection = async () => {
    try {
      setLoginError(null);
      console.log("Testing Supabase connection...");
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Test connection error:", error);
        setLoginError(`Erreur de connexion à Supabase: ${error.message}`);
        return;
      }
      
      toast.success("Connexion à Supabase réussie!");
      console.log("Session test:", data);
    } catch (error: any) {
      console.error("Test connection exception:", error);
      setLoginError(`Exception: ${error.message}`);
    }
  };

  const onSubmitLogin = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      setLoginError(null);
      console.log("Attempting login with email:", data.email);
      
      const { error } = await signIn(data.email, data.password);
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      setLoginError(error.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect' 
        : error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitResetPassword = async (data: ResetPasswordFormValues) => {
    try {
      setResetLoading(true);
      setResetError(null);
      
      console.log("Sending password reset to:", data.email);
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
  
  const onSubmitUpdatePassword = async (data: UpdatePasswordFormValues) => {
    try {
      setUpdatePasswordLoading(true);
      setUpdatePasswordError(null);
      
      console.log("Updating password");
      
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        console.error("Error updating password:", error);
        setUpdatePasswordError(error.message || "Erreur lors de la mise à jour du mot de passe");
        return;
      }
      
      toast.success("Mot de passe mis à jour avec succès");
      
      // Clear the URL hash to remove the tokens
      window.history.replaceState(null, '', location.pathname);
      
      // Show login form again
      setUpdatePasswordMode(false);
      loginForm.reset();
      
    } catch (error: any) {
      console.error("Error in update password:", error);
      setUpdatePasswordError(error.message || "Erreur lors de la mise à jour du mot de passe");
    } finally {
      setUpdatePasswordLoading(false);
    }
  };

  // Compte de démonstration pour faciliter les tests
  const loginWithTestAccount = async () => {
    loginForm.setValue('email', 'admin@test.com');
    loginForm.setValue('password', 'admintest123');
    
    // Soumettre le formulaire
    await onSubmitLogin({
      email: 'admin@test.com',
      password: 'admintest123'
    });
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
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold">
                  {updatePasswordMode 
                    ? "Définir un nouveau mot de passe" 
                    : resetPassword 
                      ? "Réinitialiser le mot de passe" 
                      : "Connexion"}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleDebugMode}
                  className="text-xs text-muted-foreground"
                >
                  {debugMode ? "Masquer debug" : "Debug"}
                </Button>
              </div>
              <CardDescription>
                {updatePasswordMode 
                  ? "Choisissez un nouveau mot de passe pour accéder à votre compte"
                  : resetPassword 
                    ? "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation"
                    : "Entrez vos identifiants pour accéder à votre compte"
                }
              </CardDescription>
            </CardHeader>

            {debugMode && (
              <div className="px-6 mb-4">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <div className="text-xs space-y-2">
                    <div><strong>Mode Debug:</strong> Info pour développeur</div>
                    <div>Hash: <code className="text-xs break-all">{location.hash || "Aucun"}</code></div>
                    <div>Type: <code>{type || "Aucun"}</code></div>
                    <div>Reset Token: <code>{passwordResetToken ? "Présent" : "Aucun"}</code></div>
                    <div>
                      <Button 
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 mt-1"
                        onClick={testConnection}
                      >
                        Tester connexion Supabase
                      </Button>
                    </div>
                  </div>
                </Alert>
              </div>
            )}

            {updatePasswordMode ? (
              // Formulaire de mise à jour du mot de passe
              <CardContent>
                <Form {...updatePasswordForm}>
                  <form onSubmit={updatePasswordForm.handleSubmit(onSubmitUpdatePassword)} className="space-y-4">
                    {updatePasswordError && (
                      <Alert className="mb-4 bg-destructive/10 border-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                        <AlertDescription className="text-destructive">
                          {updatePasswordError}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={updatePasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau mot de passe</FormLabel>
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
                    <FormField
                      control={updatePasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={updatePasswordLoading}
                    >
                      {updatePasswordLoading ? "Mise à jour en cours..." : "Mettre à jour le mot de passe"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            ) : resetPassword ? (
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
                    {loginError && (
                      <Alert className="mb-4 bg-destructive/10 border-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                        <AlertDescription className="text-destructive">
                          {loginError}
                        </AlertDescription>
                      </Alert>
                    )}
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
                        className="h-auto p-0 text-sm"
                        onClick={() => {
                          setResetPassword(true);
                          loginForm.reset();
                        }}
                      >
                        Mot de passe oublié?
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? "Connexion en cours..." : "Se connecter"}
                    </Button>
                    <div className="text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        ou
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={loginWithTestAccount}
                      >
                        Se connecter avec le compte démo
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
      
      {/* Bannière à droite */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-primary-foreground to-primary">
        <div className="flex flex-col justify-center items-center h-full text-white p-12">
          <h1 className="text-3xl font-bold mb-4">iTakeCare Hub</h1>
          <p className="text-lg mb-8 text-center max-w-md">
            Plateforme de gestion pour le leasing de matériel informatique reconditionné. Simplifiez vos processus et gérez vos clients efficacement.
          </p>
          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Fonctionnalités principales</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <span>Gestion des clients et contrats</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <span>Création et suivi d'offres</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <span>Tableau de bord intuitif</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <span>Espace client dédié</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
