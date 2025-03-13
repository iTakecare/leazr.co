
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { FileText } from "lucide-react";

const OffersEmptyState = () => {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center py-4">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">Aucune offre trouvée</p>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default OffersEmptyState;
