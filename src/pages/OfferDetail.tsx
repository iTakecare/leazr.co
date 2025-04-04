
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOfferById } from '@/services/offers/offerDetail';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { translateOfferType } from '@/utils/offerTypeTranslator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Separator } from '@/components/ui/separator';

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getOfferById(id);
        
        if (!data) {
          setError('Offre non trouvée');
          return;
        }
        
        setOffer(data);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'offre:', err);
        setError('Impossible de charger les détails de l\'offre');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des détails de l'offre...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !offer) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error || 'Offre non trouvée'}</p>
            <Button onClick={() => navigate('/offers')}>
              Retour à la liste des offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      return 'Date non disponible';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Validée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Refusée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Analyser les données d'équipement si elles existent
  let equipmentData = [];
  try {
    if (offer.equipment_description) {
      const parsedData = typeof offer.equipment_data === 'object' 
        ? offer.equipment_data 
        : JSON.parse(offer.equipment_description);
      
      if (Array.isArray(parsedData)) {
        equipmentData = parsedData;
      }
    }
  } catch (e) {
    console.error('Erreur lors du parsing des données d\'équipement:', e);
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/offers')} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux offres
            </Button>
            <div className="flex items-center">
              {getStatusBadge(offer.status)}
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails de l'offre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Informations concernant cette offre</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Client</h3>
                    <p className="font-medium">{offer.client_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="font-medium">{offer.client_email}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Montant financé</h3>
                    <p className="font-medium">{formatCurrency(offer.financed_amount || 0)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Paiement mensuel</h3>
                    <p className="font-medium">{formatCurrency(offer.monthly_payment)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Coefficient</h3>
                    <p className="font-medium">{offer.coefficient}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Commission</h3>
                    <p className="font-medium">{formatCurrency(offer.commission)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date de création</h3>
                    <p className="font-medium">{formatDate(offer.created_at)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Type d'offre</h3>
                    <p className="font-medium">{translateOfferType(offer.type)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Équipements</CardTitle>
              </CardHeader>
              <CardContent>
                {equipmentData.length > 0 ? (
                  <div className="space-y-4">
                    {equipmentData.map((item: any, index: number) => (
                      <div key={index} className="border p-4 rounded-md">
                        <h3 className="font-medium text-lg">{item.title}</h3>
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <p className="text-sm text-gray-500">Prix d'achat:</p>
                            <p className="font-medium">{formatCurrency(item.price)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Quantité:</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Marge:</p>
                            <p className="font-medium">{item.margin ? `${item.margin}%` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    {offer.equipment_description || 'Aucun équipement spécifié'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
