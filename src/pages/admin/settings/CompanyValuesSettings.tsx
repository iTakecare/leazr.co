import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { CompanyValuesContent } from '@/components/admin/CompanyValuesContent';

export default function CompanyValuesSettings() {
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
          <h1 className="text-3xl font-bold">Valeurs de l'entreprise</h1>
          <p className="text-muted-foreground">
            Gérez les valeurs affichées dans vos PDFs
          </p>
        </div>
      </div>

      <CompanyValuesContent />
    </div>
  );
}
