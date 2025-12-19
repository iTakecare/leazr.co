import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { exportOffersToExcel } from "@/services/offersExportService";

const STATUS_GROUPS = {
  in_progress: {
    label: "À traiter",
    statuses: ['draft', 'sent', 'info_requested', 'info_received', 'leaser_review', 'approved']
  },
  accepted: {
    label: "Acceptées",
    statuses: ['accepted', 'validated', 'financed', 'contract_sent', 'signed']
  },
  invoiced: {
    label: "Facturées",
    statuses: ['invoicing']
  },
  rejected: {
    label: "Refusées",
    statuses: ['internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected']
  }
} as const;

type StatusGroupKey = keyof typeof STATUS_GROUPS;

interface ExcelExportDialogProps {
  offers: any[];
  children: React.ReactNode;
}

export function ExcelExportDialog({ offers, children }: ExcelExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<StatusGroupKey[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedFilters([]);
    }
  };

  const handleFilterChange = (filter: StatusGroupKey, checked: boolean) => {
    if (checked) {
      setSelectedFilters(prev => [...prev, filter]);
      setSelectAll(false);
    } else {
      setSelectedFilters(prev => prev.filter(f => f !== filter));
    }
  };

  const getFilteredOffers = () => {
    if (selectAll || selectedFilters.length === 0) {
      return offers;
    }

    const selectedStatuses = selectedFilters.flatMap(
      filter => STATUS_GROUPS[filter].statuses
    );

    return offers.filter(offer =>
      selectedStatuses.includes(offer.workflow_status)
    );
  };

  const filteredCount = getFilteredOffers().length;

  const handleExport = () => {
    const offersToExport = getFilteredOffers();
    exportOffersToExcel(offersToExport);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset to default state when opening
      setSelectAll(true);
      setSelectedFilters([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter les demandes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Sélectionnez les demandes à exporter :
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="all" className="font-medium cursor-pointer">
                Toutes les demandes
              </Label>
            </div>

            <div className="border-t pt-3 space-y-3">
              {(Object.keys(STATUS_GROUPS) as StatusGroupKey[]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedFilters.includes(key)}
                    onCheckedChange={(checked) => handleFilterChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className="cursor-pointer">
                    {STATUS_GROUPS[key].label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={filteredCount === 0}>
            Exporter ({filteredCount} demande{filteredCount > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
