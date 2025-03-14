
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Package, Send, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { supabase } from "@/integrations/supabase/client";
import { createClientRequest } from "@/services/offerService";

// Définition du schéma de validation pour le formulaire
const requestFormSchema = z.object({
  description: z.string().min(10, {
    message: "La description doit comporter au moins 10 caractères.",
  }),
  amount: z.number().min(1, {
    message: "Le montant doit être supérieur à 0.",
  }),
  additional_info: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const ClientEquipmentRequestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  
  // Configuration du formulaire avec React Hook Form
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      description: "",
      amount: 1000,
      additional_info: "",
    },
  });

  // Récupérer l'ID client associé à l'utilisateur
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;
      
      try {
        const id = await getClientIdForUser(user.id);
        console.log("Client ID found:", id);
        setClientId(id);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'ID client:", error);
        toast.error("Impossible de récupérer les informations du client");
      }
    };
    
    fetchClientId();
  }, [user]);

  // Calculer le paiement mensuel quand le montant change
  const calculateMonthlyPayment = (amount: number) => {
    // Exemple simple: diviser par 24 mois
    return amount / 24;
  };

  // Mettre à jour le paiement mensuel quand le montant change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "amount" && value.amount) {
        setMonthlyPayment(calculateMonthlyPayment(value.amount as number));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Soumettre la demande
  const onSubmit = async (values: RequestFormValues) => {
    if (!clientId) {
      toast.error("Impossible de récupérer l'ID client");
      return;
    }
    
    setLoading(true);
    
    try {
      // Préparer les données de la demande
      const requestData = {
        client_id: clientId,
        client_name: user?.company || `${user?.first_name || ''} ${user?.last_name || ''}`,
        client_email: user?.email || '',
        equipment_description: values.description,
        additional_info: values.additional_info,
        amount: values.amount,
        monthly_payment: calculateMonthlyPayment(values.amount),
        coefficient: 0.04, // Exemple de coefficient
        commission: 0, // Pas de commission pour les demandes client
        user_id: user?.id || '',
        type: 'client_request'
      };
      
      // Créer la demande
      const requestId = await createClientRequest(requestData);
      
      if (requestId) {
        toast.success("Votre demande a été envoyée avec succès");
        navigate('/client/requests');
      } else {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Impossible d'envoyer votre demande");
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="w-full p-6">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold">Nouvelle Demande</h1>
          <p className="text-muted-foreground">
            Soumettez une demande d'équipement pour votre entreprise
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Formulaire de demande</CardTitle>
              <CardDescription>
                Décrivez les équipements dont vous avez besoin et indiquez le budget approximatif
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description de votre besoin</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrivez les équipements dont vous avez besoin..."
                            className="min-h-32 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Détaillez les équipements souhaités et leurs caractéristiques
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget approximatif (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="100"
                            step="100"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(value);
                              setMonthlyPayment(calculateMonthlyPayment(value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimation du montant total pour l'équipement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-muted/30 p-4 rounded-md">
                    <p className="text-sm font-medium mb-2">Estimation mensuelle</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(monthlyPayment)}<span className="text-sm font-normal text-muted-foreground"> /mois</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Basé sur un financement sur 24 mois
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="additional_info"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Informations complémentaires (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informations complémentaires..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/client/requests')}
                      className="w-32"
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      className="w-40" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Envoyer la demande
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ClientEquipmentRequestPage;
