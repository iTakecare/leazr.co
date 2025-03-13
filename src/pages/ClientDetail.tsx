
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ArrowLeft, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  StickyNote, 
  Calendar, 
  Pencil,
  Calculator 
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ClientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        setError("ID client manquant");
        setIsLoading(false);
        return;
      }

      try {
        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
        } else {
          setError("Client introuvable");
        }
      } catch (err) {
        console.error("Erreur lors du chargement du client:", err);
        setError("Impossible de charger les données du client");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  const formatDate = (date: Date) => {
    try {
      return format(date, "dd MMMM yyyy à HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="mb-6 flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array(6).fill(null).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 mt-1" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !client) {
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-600">{error || "Client introuvable"}</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/clients")}
                className="mt-2"
              >
                Retour à la liste des clients
              </Button>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/clients")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">Détails du client</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate(`/clients/edit/${client.id}`)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
              <Button 
                onClick={() => navigate(`/create-offer?client=${client.id}`)}
                className="gap-2"
              >
                <Calculator className="h-4 w-4" />
                Créer une offre
              </Button>
            </div>
          </div>

          <Tabs defaultValue="info">
            <TabsList className="mb-6">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="offers">Offres</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle>Informations du client</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Nom</p>
                          <p className="text-lg font-medium">{client.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Société</p>
                          <p className="text-lg">{client.company || "-"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-lg">{client.email || "-"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Date de création</p>
                          <p className="text-lg">{formatDate(client.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Téléphone</p>
                          <p className="text-lg">{client.phone || "-"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Adresse</p>
                          <p className="text-lg">{client.address || "-"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <StickyNote className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-lg whitespace-pre-line">{client.notes || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="offers">
              <Card>
                <CardHeader>
                  <CardTitle>Offres liées à ce client</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Aucune offre associée à ce client pour le moment
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => navigate(`/create-offer?client=${client.id}`)}
                      className="gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      Créer une offre
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientDetail;
