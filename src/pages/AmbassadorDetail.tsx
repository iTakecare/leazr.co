
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, Loader2, TrendingUp, Users, DollarSign
} from "lucide-react";
import { getAmbassadorById } from "@/services/ambassadorService";
import { Ambassador } from "@/services/ambassadorService";
import AmbassadorCommissionLevelSelector from "@/components/crm/forms/AmbassadorCommissionLevelSelector";
import AmbassadorClientsSection from "@/components/crm/forms/AmbassadorClientsSection";
import AmbassadorCommissionsSection from "@/components/crm/forms/AmbassadorCommissionsSection";
import AmbassadorUserAccount from "@/components/ambassadors/AmbassadorUserAccount";
import { AmbassadorActivityHistory } from "@/components/ambassadors/AmbassadorActivityHistory";

export default function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassador = async () => {
    if (!id) {
      console.error("AmbassadorDetail - No ID provided");
      setError("ID d'ambassadeur manquant");
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("AmbassadorDetail - Fetching ambassador with ID:", id);
      const ambassadorData = await getAmbassadorById(id);
      
      console.log("AmbassadorDetail - Ambassador data received:", ambassadorData);
      setAmbassador(ambassadorData);
    } catch (error) {
      console.error("AmbassadorDetail - Error fetching ambassador:", error);
      setError("Erreur lors du chargement de l'ambassadeur");
      toast.error("Erreur lors du chargement de l'ambassadeur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbassador();
  }, [id, navigate]);

  const handleAccountCreated = () => {
    // Recharger les données de l'ambassadeur pour mettre à jour le statut du compte
    if (id) {
      fetchAmbassador();
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-xl font-semibold text-center max-w-md">
          {error || "Ambassadeur introuvable"}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          L'ambassadeur demandé n'existe pas ou a été supprimé.
        </p>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate("/ambassadors")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Button>
          {id && (
            <Button onClick={() => fetchAmbassador()}>
              Réessayer
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasUserAccount = Boolean(ambassador.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ambassador.name}</h1>
          {ambassador.company && (
            <p className="text-muted-foreground text-lg">{ambassador.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ambassadors")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/ambassadors/edit/${id}`}>
            <Button className="shadow-sm">Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne de gauche - Informations générales */}
        <div className="space-y-6">
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Informations générales
              </CardTitle>
              <CardDescription>Coordonnées et détails de l'ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ambassador.email && (
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Email</h3>
                      <p className="text-sm">{ambassador.email}</p>
                    </div>
                  </div>
                )}
                
                {ambassador.phone && (
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Téléphone</h3>
                      <p className="text-sm">{ambassador.phone}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Badge className="mt-0.5" variant={ambassador.status === 'active' ? 'default' : 'secondary'}>
                    {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
              
              {ambassador.address && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">Adresse</h3>
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm">
                        {ambassador.address}
                        {(ambassador.postal_code || ambassador.city) && (
                          <>, {ambassador.postal_code} {ambassador.city}</>
                        )}
                        {ambassador.country && <>, {ambassador.country}</>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Créé le</h3>
                    <p className="text-sm">{formatDate(ambassador.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                    <p className="text-sm">{formatDate(ambassador.updated_at)}</p>
                  </div>
                </div>
              </div>
              
              {ambassador.notes && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{ambassador.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <AmbassadorCommissionLevelSelector 
            control={null}
            currentLevelId={ambassador.commission_level_id}
          />
        </div>

        {/* Colonne de droite - Gestion et statistiques */}
        <div className="space-y-6">
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Gestion du compte utilisateur
              </CardTitle>
              <CardDescription>Accès au portail ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AmbassadorUserAccount
                ambassador={ambassador}
                onAccountCreated={handleAccountCreated}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Statistiques
              </CardTitle>
              <CardDescription>Performance de l'ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Total commissions</span>
                  <span className="text-lg font-bold text-green-600">
                    {ambassador.commissions_total?.toLocaleString('fr-FR')}€
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Clients gérés</span>
                  <span className="text-lg font-bold text-blue-600">
                    {ambassador.clients_count}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Dernière commission</span>
                  <span className="text-lg font-bold text-purple-600">
                    {ambassador.last_commission?.toLocaleString('fr-FR')}€
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sections en pleine largeur */}
      <div className="grid gap-6">
        <AmbassadorClientsSection ambassadorId={ambassador.id} />
        <AmbassadorCommissionsSection ambassadorId={ambassador.id} />
        <AmbassadorActivityHistory ambassadorId={ambassador.id} />
      </div>
    </div>
  );
}
