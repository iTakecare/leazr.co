
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export interface EquipmentItem {
  designation: string;
  quantity: number;
  monthly_price: number;
}

export interface OfferTemplateProps {
  offerNumber: string;
  referenceNumber?: string;
  date?: string;
  clientName: string;
  clientCompany?: string;
  clientContact?: string;
  equipment: EquipmentItem[];
  totalMonthly: number;
  companyInfo?: {
    name: string;
    address: string;
    taxId: string;
    contact: string;
  };
  footerText?: string;
  logo?: string;
  renderSignatureSection?: () => React.ReactNode;
}

const OfferTemplate: React.FC<OfferTemplateProps> = ({
  offerNumber,
  referenceNumber,
  date,
  clientName,
  clientCompany,
  clientContact,
  equipment,
  totalMonthly,
  companyInfo = {
    name: "iTakecare SRL",
    address: "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
    taxId: "TVA: BE 0795.642.894",
    contact: "Tel: +32 471 511 121 - Email: hello@itakecare.be"
  },
  footerText = "Cette offre est valable 30 jours à compter de sa date d'émission.",
  logo = "/lovable-uploads/2a20d115-87b0-4895-b300-d9e4a3e626ee.png",
  renderSignatureSection
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return format(new Date(), "dd/MM/yyyy", { locale: fr });
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };

  return (
    <div className="bg-white min-h-screen max-w-4xl mx-auto shadow-sm border print:border-none print:shadow-none">
      {/* En-tête */}
      <div className="bg-slate-800 text-white p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center">
          {logo && (
            <img src={logo} alt="Logo" className="h-10 md:h-12" />
          )}
        </div>
        <div className="text-xl md:text-2xl font-bold">
          OFFRE N° {offerNumber}
        </div>
      </div>

      {/* Corps du document */}
      <div className="p-6 sm:p-8">
        {/* Section client et date */}
        <div className="flex flex-col md:flex-row justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold uppercase mb-3">CLIENT</h2>
            {clientCompany && <p className="mb-1">{clientCompany}</p>}
            <p className="mb-1">{clientName}</p>
            {clientContact && <p>{clientContact}</p>}
          </div>
          <div className="text-right mt-4 md:mt-0">
            <p className="mb-1">Date: {formatDate(date)}</p>
            {referenceNumber && <p>Référence: {referenceNumber}</p>}
          </div>
        </div>

        {/* Section équipements */}
        <h2 className="text-lg font-bold uppercase mb-4">ÉQUIPEMENTS</h2>
        <Table className="mb-6">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Désignation</TableHead>
              <TableHead className="text-center">Qté</TableHead>
              <TableHead className="text-right">Mensualité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.designation}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.monthly_price)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} className="text-right font-medium">
                Total mensualité:
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totalMonthly)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Total mensualité HTVA */}
        <div className="flex justify-between items-center mb-12 text-blue-600 font-bold">
          <div className="text-lg">Total mensualité:</div>
          <div className="text-lg">{formatCurrency(totalMonthly)} HTVA / mois</div>
        </div>

        {/* Espace pour la signature si nécessaire */}
        {renderSignatureSection && (
          <div className="mb-8">
            {renderSignatureSection()}
          </div>
        )}

        {/* Pied de page */}
        <div className="mt-auto">
          <Separator className="my-6" />
          <div className="text-center text-gray-600 mb-4">{footerText}</div>
          <div className="text-center text-sm text-gray-500">
            <p>{companyInfo.name} - {companyInfo.address}</p>
            <p>{companyInfo.taxId} - {companyInfo.contact}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferTemplate;
