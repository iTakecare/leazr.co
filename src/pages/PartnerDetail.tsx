import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Edit, Calculator, ChevronLeft } from "lucide-react";
import { getPartnerById, updatePartner } from "@/services/partnerService";
import { Partner } from "@/types/partner";

const PartnerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartner = async () => {
      if (id) {
        try {
          setLoading(true);
          const partnerData = await getPartnerById(id);
          if (partnerData) {
            setPartner(partnerData);
          } else {
            toast.error("Partenaire non trouvé");
            navigate("/partners");
          }
        } catch (error) {
          console.error("Error fetching partner:", error);
          toast.error("Erreur lors du chargement du partenaire");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPartner();
  }, [id, navigate]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!partner) {
    return <div>Partenaire non trouvé.</div>;
  }

  return (
    <div className="py-8 px-4 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          <p className="text-muted-foreground text-lg">Partenaire {partner.type === 'distributor' ? 'Distributeur' : 'Intégrateur'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/partners")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/calculator/partner/${id}`}>
            <Button variant="outline" className="flex items-center">
              <Calculator className="mr-1 h-4 w-4" />
              Calculateur
            </Button>
          </Link>
          <Link to={`/partners/edit/${id}`}>
            <Button className="shadow-sm flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-4">Informations du partenaire</h2>
            <div className="space-y-3">
              <div>
                <Label>Nom:</Label>
                <p>{partner.name}</p>
              </div>
              <div>
                <Label>Email:</Label>
                <p>{partner.email}</p>
              </div>
              <div>
                <Label>Téléphone:</Label>
                <p>{partner.phone}</p>
              </div>
              <div>
                <Label>Type:</Label>
                <p>{partner.type}</p>
              </div>
              <div>
                <Label>Société:</Label>
                <p>{partner.company}</p>
              </div>
              <div>
                <Label>Adresse:</Label>
                <p>{partner.address}</p>
              </div>
              <div>
                <Label>Informations supplémentaires:</Label>
                <p>{partner.additional_info}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerDetail;
