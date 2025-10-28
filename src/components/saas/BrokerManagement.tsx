import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBrokers } from '@/hooks/useBrokers';
import BrokerCreationDialog from './BrokerCreationDialog';
import BrokerListTable from './BrokerListTable';

const BrokerManagement: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { brokers, loading, refresh } = useBrokers();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Gestion des Brokers</CardTitle>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un broker
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <BrokerListTable brokers={brokers} onRefresh={refresh} />
          )}
        </CardContent>
      </Card>

      <BrokerCreationDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={refresh}
      />
    </div>
  );
};

export default BrokerManagement;
