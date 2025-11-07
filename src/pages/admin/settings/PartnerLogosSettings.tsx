import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PartnerLogosContent } from '@/components/admin/PartnerLogosContent';

export default function PartnerLogosSettings() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/settings')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Logos partenaires</h1>
          <p className="text-muted-foreground">
            Gérez les logos affichés dans la section "Ils nous font confiance"
          </p>
        </div>
      </div>

      <PartnerLogosContent />
    </div>
  );
}
