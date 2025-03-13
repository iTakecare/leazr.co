
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, LogIn } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const Login = () => {
  const { login, isLoading } = useAuth();
  const [isPartner, setIsPartner] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await login(values.email, values.password);
  };

  const emailPlaceholder = isPartner 
    ? "partenaire@exemple.com" 
    : "admin@itakecare.com";

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
      },
    }),
  };

  return (
    <PageTransition>
      <Container className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Layers className="h-10 w-10 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Bienvenue sur iTakecare</h1>
            <p className="text-muted-foreground mt-2">
              Connectez-vous pour gérer vos offres
            </p>
          </div>

          <Card className="glass">
            <CardHeader>
              <div className="flex space-x-2 mb-3">
                <Button
                  variant={isPartner ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPartner(true)}
                  className="flex-1"
                >
                  Partenaire
                </Button>
                <Button
                  variant={!isPartner ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPartner(false)}
                  className="flex-1"
                >
                  Admin
                </Button>
              </div>
              <CardTitle>Connexion {isPartner ? "Partenaire" : "Admin"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <motion.div
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={emailPlaceholder}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                  >
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                  >
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2"></div>
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      Se connecter
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                Pour la démo, utilisez n'importe quel email valide et mot de passe.
              </div>
            </CardFooter>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default Login;
