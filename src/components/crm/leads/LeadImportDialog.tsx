import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeadMutations } from '@/hooks/crm/useLeads';
import { parseLeadCsv, type ImportRow } from '@/services/crm/leadService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadImportDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { importList } = useLeadMutations();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [campaign, setCampaign] = useState('');
  const [parseError, setParseError] = useState('');

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    try {
      const parsed = parseLeadCsv(await file.text());
      if (parsed.length === 0) {
        setParseError("Aucune ligne exploitable. Le fichier a-t-il une ligne d'en-têtes ?");
      }
      setRows(parsed);
      if (!campaign) setCampaign(file.name.replace(/\.[^.]+$/, ''));
    } catch (error) {
      setParseError('Fichier illisible.');
      setRows([]);
    }
  };

  const usable = rows.filter((r) => r.email || r.phone || r.company_name);

  const handleImport = async () => {
    await importList.mutateAsync({ rows, campaign: campaign.trim() || undefined });
    setRows([]);
    setFileName('');
    setCampaign('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer une liste de prospection</DialogTitle>
          <DialogDescription>
            Fichier CSV. Les colonnes sont reconnues automatiquement (prénom, nom, email,
            téléphone, société, TVA) — les en-têtes français comme anglais fonctionnent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-file">Fichier</Label>
            <Input id="lead-file" type="file" accept=".csv,text/csv" onChange={handleFile} />
          </div>

          {parseError && (
            <p className="flex items-start gap-1.5 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseError}
            </p>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName}
              </p>
              <p className="mt-1 text-muted-foreground">
                {usable.length} lignes exploitables sur {rows.length}
                {rows.length - usable.length > 0 &&
                  ` — ${rows.length - usable.length} sans email, téléphone ni société seront ignorées`}
              </p>
              {usable[0] && (
                <p className="mt-2 truncate text-xs text-slate-500">
                  Ex. : {[usable[0].first_name, usable[0].last_name].filter(Boolean).join(' ')}{' '}
                  {usable[0].email ? `· ${usable[0].email}` : ''}{' '}
                  {usable[0].company_name ? `· ${usable[0].company_name}` : ''}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="lead-campaign">Campagne</Label>
            <Input
              id="lead-campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="Ex : salon-batibouw-2026"
            />
            <p className="text-xs text-muted-foreground">
              Sert à retrouver ces leads et à mesurer ce que la liste a rapporté.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={usable.length === 0 || importList.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importer {usable.length > 0 ? `${usable.length} leads` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadImportDialog;
