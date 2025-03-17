
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { getAmbassadorProfile, createClientForAmbassador } from "@/services/ambassadorService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Loader2 } from "lucide-react";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const ClientFormSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom doit comporter au moins 2 caractères.",
  }),
  company: z.string().optional(),
  email: z.string().email({
    message: "Adresse e-mail invalide.",
  }),
  phone: z.string().regex(phoneRegex, {
    message: "Numéro de téléphone invalide",
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  additional_info: z.string().optional(),
  accept_terms: z.boolean().refine((value) => value === true, {
    message: "Vous devez accepter les termes et conditions.",
  }),
});

type ClientFormData = z.infer<typeof ClientFormSchema>;

const AmbassadorCreateClient = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ambassador, setAmbassador] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit: submitForm,
    formState: { errors }
  } = useForm<ClientFormData>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      accept_terms: false,
    },
  });

  useEffect(() => {
    const fetchAmbassador = async () => {
      if (user && user.id) {
        try {
          const ambassadorData = await getAmbassadorProfile(user.id);
          setAmbassador(ambassadorData);
        } catch (error) {
          console.error("Error fetching ambassador profile:", error);
          toast.error("Erreur lors du chargement du profil de l'ambassadeur");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAmbassador();
  }, [user]);

  const onSubmit: SubmitHandler<ClientFormData> = async (data) => {
    setSubmitting(true);
    
    try {
      // Make sure all required fields are explicitly included
      const clientData = {
        name: data.name,               // Required field
        email: data.email,             // Required field
        phone: data.phone,             // Required field
        company: data.company,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        notes: data.additional_info,
        status: 'active' as 'lead' | 'active' | 'inactive', // Set a default status
        ambassador_id: ambassador?.id || ''
      };
      
      const success = await createClientForAmbassador(
        ambassador?.id || '',
        clientData
      );
      
      if (success) {
        toast.success("Client créé avec succès");
        navigate('/ambassador/dashboard');
      } else {
        toast.error("Erreur lors de la création du client");
      }
    } catch (error) {
      console.error("Erreur lors de la création du client:", error);
      toast.error("Erreur lors de la création du client");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Créer un nouveau client</h1>
            <p className="text-muted-foreground">Ajoutez un nouveau client à votre liste.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations du client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    type="text"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company">Société</Label>
                  <Input
                    id="company"
                    placeholder="Nom de la société"
                    type="text"
                    {...register("company")}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm">{errors.company.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Adresse e-mail *</Label>
                  <Input
                    id="email"
                    placeholder="john.doe@example.com"
                    type="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Numéro de téléphone *</Label>
                  <Input
                    id="phone"
                    placeholder="+33612345678"
                    type="tel"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  type="text"
                  {...register("address")}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    placeholder="Paris"
                    type="text"
                    {...register("city")}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input
                    id="postal_code"
                    placeholder="75001"
                    type="text"
                    {...register("postal_code")}
                  />
                  {errors.postal_code && (
                    <p className="text-red-500 text-sm">{errors.postal_code.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    placeholder="France"
                    type="text"
                    {...register("country")}
                  />
                  {errors.country && (
                    <p className="text-red-500 text-sm">{errors.country.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="additional_info">Informations complémentaires</Label>
                <Textarea
                  id="additional_info"
                  placeholder="Informations supplémentaires à propos du client"
                  {...register("additional_info")}
                />
                {errors.additional_info && (
                  <p className="text-red-500 text-sm">{errors.additional_info.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" {...register("accept_terms")} />
                  <Label htmlFor="terms">
                    J'accepte les <a href="#" className="text-primary underline underline-offset-2">termes et conditions</a> *
                  </Label>
                </div>
                {errors.accept_terms && (
                  <p className="text-red-500 text-sm">{errors.accept_terms.message}</p>
                )}
              </div>

              <Button 
                disabled={submitting} 
                onClick={submitForm(onSubmit)} 
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer le client"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCreateClient;
