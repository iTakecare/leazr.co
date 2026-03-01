import React from "react";
import { useClientContracts } from "@/hooks/useClientContracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Monitor, Loader2, PackageOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatContractDate } from "@/utils/contractDates";

interface ClientActiveEquipmentProps {
  clientId: string;
  clientEmail?: string;
}

const ACTIVE_STATUSES = ["active", "signed", "in_progress", "delivered"];

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: "Actif",
    signed: "Signé",
    in_progress: "En cours",
    delivered: "Livré",
  };
  return map[status] || status;
};

const ClientActiveEquipment: React.FC<ClientActiveEquipmentProps> = ({ clientId, clientEmail }) => {
  const { contracts, loading } = useClientContracts(clientEmail, clientId);
  const navigate = useNavigate();

  const activeContracts = contracts.filter(c => ACTIVE_STATUSES.includes(c.status));

  const equipmentRows = activeContracts.flatMap(contract =>
    (contract.contract_equipment || []).map(eq => ({
      ...eq,
      contract_id: contract.id,
      contract_number: contract.contract_number || contract.id.slice(0, 8),
      contract_status: contract.status,
      contract_end_date: contract.contract_end_date,
    }))
  );

  if (loading) {
    return (
      <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Chargement du matériel…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          Matériel en cours
        </CardTitle>
        <CardDescription>
          Équipements issus des contrats actifs du client ({equipmentRows.length} article{equipmentRows.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {equipmentRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <PackageOpen className="h-12 w-12 mb-3" />
            <p className="text-sm">Aucun matériel en cours pour ce client</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead>N° de série</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentRows.map((item, idx) => (
                <TableRow key={`${item.id}-${idx}`}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.serial_number || "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/contracts/${item.contract_id}`)}
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      {item.contract_number}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {getStatusLabel(item.contract_status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatContractDate(item.contract_end_date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientActiveEquipment;
