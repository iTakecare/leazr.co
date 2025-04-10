
import React from 'react';
import { formatCurrency } from '@/utils/formatters';

type EquipmentItem = {
  id?: string; // Optional
  title: string;
  purchasePrice?: number; // Made optional to match useOfferDetail.ts
  quantity: number;
  margin?: number; // Made optional to match useOfferDetail.ts
  monthlyPayment?: number;
};

interface EquipmentDetailTableProps {
  equipment: EquipmentItem[];
  totalMonthly: number;
  totalMargin: number;
  totalMarginWithDifference?: number; // Ajout du total avec différence
}

const EquipmentDetailTable: React.FC<EquipmentDetailTableProps> = ({
  equipment,
  totalMonthly,
  totalMargin,
  totalMarginWithDifference
}) => {
  // Calcul du nombre total d'articles
  const totalArticles = equipment.reduce((sum, item) => sum + item.quantity, 0);
  
  // Utiliser la marge totale avec différence si disponible, sinon utiliser la marge normale
  const finalMargin = totalMarginWithDifference !== undefined ? totalMarginWithDifference : totalMargin;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 font-medium">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <h3>Détail de l'équipement</h3>
        </div>
        <span className="text-blue-600 text-sm font-medium">{equipment.length} articles</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-4 font-medium text-gray-600">Désignation</th>
              <th className="text-center py-2 px-4 font-medium text-gray-600">Quantité</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Prix mensuel</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Total mensuel</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Numéro de série</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((item, index) => {
              const monthlyPayment = item.monthlyPayment || 0;
              const totalItemMonthly = monthlyPayment * item.quantity;
              
              return (
                <tr key={item.id || index} className="border-b border-gray-100">
                  <td className="py-4 px-4">{item.title}</td>
                  <td className="py-4 px-4 text-center">{item.quantity}</td>
                  <td className="py-4 px-4 text-right">{formatCurrency(monthlyPayment)}</td>
                  <td className="py-4 px-4 text-right font-medium text-blue-600">{formatCurrency(totalItemMonthly)}</td>
                  <td className="py-4 px-4 text-right text-gray-500 text-sm">Non disponible</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-600 mb-1">Quantité totale</span>
          <span className="text-xl font-semibold">{totalArticles} articles</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-600 mb-1">Mensualité totale</span>
          <span className="text-xl font-semibold text-blue-600">{formatCurrency(totalMonthly)}</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <div className="flex items-center text-green-600 mb-1">
            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            <span className="text-gray-600">Marge générée</span>
          </div>
          <span className="text-xl font-semibold text-green-600">{formatCurrency(finalMargin)}</span>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailTable;
