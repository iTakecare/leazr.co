import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Broker } from '@/types/broker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BrokerListTableProps {
  brokers: Broker[];
  onRefresh: () => void;
}

const BrokerListTable: React.FC<BrokerListTableProps> = ({ brokers, onRefresh }) => {
  if (brokers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun broker créé pour le moment
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date de création</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brokers.map((broker) => (
            <TableRow key={broker.id}>
              <TableCell className="font-medium">{broker.name}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {broker.slug}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={broker.is_active ? 'default' : 'secondary'}>
                  {broker.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(broker.created_at), 'dd MMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BrokerListTable;
