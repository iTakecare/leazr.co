
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Mail, Phone, MapPin, FileText 
} from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const clientData = await getClientById(id);
        
        if (!clientData) {
          toast.error("Client introuvable");
          navigate("/clients");
          return;
        }
        
        console.log("Client data loaded:", clientData);
        setClient(clientData);
      } catch (error) {
        console.error("Error fetching client:", error);
        toast.error("Erreur lors du chargement du client");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  if (!client) {
    return <div className="flex items-center justify-center h-64">Client introuvable</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">{client.company}</p>
        </div>
        <div>
          <Link to={`/clients/edit/${id}`}>
            <Button variant="outline">Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Coordonnées et détails du client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{client.email || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{client.phone || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span>{client.company || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>
                  {client.address ? 
                    `${client.address}, ${client.postal_code} ${client.city}, ${client.country}` : 
                    "Adresse non spécifiée"}
                </span>
              </div>
              
              {client.vat_number && (
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span>TVA: {client.vat_number}</span>
                </div>
              )}
              
              {client.user_id && (
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="bg-green-100">Compte utilisateur actif</Badge>
                </div>
              )}
            </div>
            
            {client.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="collaborators" className="flex-1">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="collaborators">Collaborateurs</TabsTrigger>
          </TabsList>
          <TabsContent value="collaborators" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Collaborateurs</CardTitle>
                <CardDescription>Personnes à contacter chez ce client</CardDescription>
              </CardHeader>
              <CardContent>
                <CollaboratorForm clientId={id!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
