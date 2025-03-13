
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { UserX } from "lucide-react";

const ClientsEmptyState = () => {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <UserX className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Aucun client trouvé</p>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ClientsEmptyState;
