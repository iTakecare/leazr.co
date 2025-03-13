
import React from "react";
import { Users, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ClientInfoProps {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
  onOpenClientSelector: () => void;
  handleSaveOffer: () => void;
  isSubmitting: boolean;
  selectedLeaser: any;
  equipmentList: any[];
}

const ClientInfo: React.FC<ClientInfoProps> = ({
  clientId,
  clientName,
  clientEmail,
  clientCompany,
  remarks,
  setRemarks,
  onOpenClientSelector,
  handleSaveOffer,
  isSubmitting,
  selectedLeaser,
  equipmentList,
}) => {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Informations client</h3>
      <div className="grid gap-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Client</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="text"
                value={clientName}
                placeholder="Sélectionnez un client..."
                readOnly
                className={!clientId ? "border-orange-300" : ""}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onOpenClientSelector}
                title="Sélectionner un client"
              >
                <Users className="h-5 w-5" />
              </Button>
            </div>
            {!clientId && (
              <p className="text-orange-500 text-sm mt-1">
                Veuillez sélectionner un client
              </p>
            )}
          </div>
        </div>
        {clientId && (
          <>
            <div>
              <Label>Société</Label>
              <Input
                type="text"
                value={clientCompany}
                className="mt-1"
                readOnly
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={clientEmail}
                className="mt-1"
                readOnly
              />
            </div>
          </>
        )}
        <div>
          <Label>Remarques</Label>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 mt-1 h-24"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Ajoutez vos remarques ici..."
          />
        </div>
        <Button
          onClick={handleSaveOffer}
          className="mt-4 flex items-center justify-center gap-2"
          disabled={!clientId || !clientEmail || equipmentList.length === 0 || isSubmitting || !selectedLeaser}
          variant="default"
        >
          <Save className="h-5 w-5" />
          Sauvegarder l'offre
        </Button>
      </div>
    </div>
  );
};

export default ClientInfo;
