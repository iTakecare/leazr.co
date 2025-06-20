
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
import { getPartnerById, Partner } from "@/services/partnerService";
import PartnerCommissionsTable from "@/components/partners/PartnerCommissionsTable";

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartner = async () => {
    if (!id) {
      console.error("PartnerDetail - No ID provided");
      setError("ID de partenaire manquant");
      toast.error("ID de partenaire manquant");
      navigate("/partners");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("PartnerDetail - Fetching partner with ID:", id);
      const partnerData = await getPartnerById(id);
      
      console.log("PartnerDetail - Partner data received:", partnerData);
      setPartner(partnerData);
    } catch (error) {
      console.error("PartnerDetail - Error fetching partner:", error);
      setError("Erreur lors du chargement du partenaire");
      toast.error("Erreur lors du chargement du partenaire");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartner();
  }, [id, navigate]);

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

  if (error || !partner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-xl font-semibold text-center max-w-md">
          {error || "Partenaire introuvable"}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Le partenaire demandé n'existe pas ou a été supprimé.
        </p>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate("/partners")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Button>
          {id && (
            <Button onClick={() => fetchPartner()}>
              Réessayer
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasUserAccount = Boolean(partner.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          {partner.contact_name && (
            <p className="text-muted-foreground text-lg">Contact: {partner.contact_name}</p>
          )}
          <Badge className="mt-1" variant={partner.type === 'Revendeur' ? 'default' : 'secondary'}>
            {partner.type}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/partners")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/partners/edit/${id}`}>
            <Button className="shadow-sm">Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>Coordonnées et détails du partenaire</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partner.email && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{partner.email}</p>
                  </div>
                </div>
              )}
              
              {partner.phone && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{partner.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Badge className="mt-0.5" variant={partner.status === 'active' ? 'default' : 'secondary'}>
                  {partner.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(partner.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(partner.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {partner.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{partner.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Compte utilisateur
              </CardTitle>
              <CardDescription>Accès au portail partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {hasUserAccount ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Compte actif</div>
                      {partner.user_account_created_at && (
                        <span className="text-xs text-green-700">
                          Créé le {formatDate(partner.user_account_created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Ce partenaire n'a pas encore de compte utilisateur pour accéder au portail.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Statistiques
              </CardTitle>
              <CardDescription>Performance du partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Chiffre d'affaires total</span>
                  <span className="text-lg font-bold text-green-600">
                    {partner.revenue_total?.toLocaleString('fr-FR')}€
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Clients gérés</span>
                  <span className="text-lg font-bold text-blue-600">
                    {partner.clients_count}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                  <span className="text-sm font-medium">Dernière transaction</span>
                  <span className="text-lg font-bold text-purple-600">
                    {partner.last_transaction?.toLocaleString('fr-FR')}€
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <PartnerCommissionsTable partnerId={partner.id} />
      </div>
    </div>
  );
}
