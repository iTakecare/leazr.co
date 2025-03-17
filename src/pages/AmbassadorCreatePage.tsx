
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AmbassadorForm from '@/components/crm/forms/AmbassadorForm';
import { createAmbassador, CreateAmbassadorData } from '@/services/ambassadorService';
import { toast } from 'sonner';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';

const AmbassadorCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const handleCreate = async (formData: CreateAmbassadorData) => {
    try {
      const ambassador = await createAmbassador(formData);

      if (ambassador) {
        toast.success('Ambassadeur créé avec succès');
        navigate(`/ambassadors/${ambassador.id}`);
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'ambassadeur:', error);
      toast.error('Erreur lors de la création de l\'ambassadeur');
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <h1 className="text-2xl font-bold mb-6">Créer un nouvel ambassadeur</h1>
          <AmbassadorForm onSubmit={handleCreate} />
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCreatePage;
