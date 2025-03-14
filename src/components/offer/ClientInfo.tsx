
import React from "react";

// This is a stub component to fix build errors
interface ClientInfoProps {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  remarks: string;
  setRemarks: (remarks: string) => void;
  onOpenClientSelector: () => void;
  handleSaveOffer: () => void;
  isSubmitting: boolean;
  selectedLeaser: any;
  equipmentList: any[];
}

const ClientInfo: React.FC<ClientInfoProps> = () => {
  return <div>Client Info Placeholder</div>;
};

export default ClientInfo;
