
import React, { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";

type EquipmentItem = {
  id?: string; 
  title: string;
  purchasePrice?: number;
  quantity: number;
  margin?: number;
  monthlyPayment?: number;
  attributes?: Record<string, string>;
  specifications?: Record<string, string | number>;
};

interface EquipmentDetailTableProps {
  equipment: EquipmentItem[];
  totalMonthly: number;
  totalMargin: number;
  totalMarginWithDifference?: number;
  hideFinancialDetails?: boolean;
  // Nouveau prop pour la marge de l'offre depuis la DB
  offerMargin?: number;
}

const EquipmentDetailTable: React.FC<EquipmentDetailTableProps> = ({
  equipment,
  totalMonthly,
  totalMargin,
  totalMarginWithDifference,
  hideFinancialDetails = false,
  offerMargin
}) => {
  console.log("🎯 DEBUG EquipmentDetailTable - Props received:");
  console.log("🎯 equipment:", equipment);
  console.log("🎯 equipment margins:", equipment.map(item => ({ title: item.title, margin: item.margin })));
  console.log("🎯 offerMargin:", offerMargin);
  console.log("🎯 totalMargin:", totalMargin);
  console.log("🎯 totalMarginWithDifference:", totalMarginWithDifference);
  // Calcul du nombre total d'articles
  const totalArticles = equipment.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculer la marge à afficher par priorité :
  // 1. Marge de l'offre depuis la DB (si disponible)
  // 2. Marge totale avec différence (calculateur)
  // 3. Marge totale simple
  let finalMargin = totalMargin;
  if (offerMargin !== undefined && offerMargin > 0) {
    finalMargin = offerMargin;
    console.log("💰 Utilisation de la marge depuis l'offre DB:", offerMargin);
  } else if (totalMarginWithDifference !== undefined) {
    finalMargin = totalMarginWithDifference;
    console.log("💰 Utilisation de la marge avec différence:", totalMarginWithDifference);
  }
  
  console.log("💰 MARGE FINALE affichée:", finalMargin);
  
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  const hasDetails = (item: EquipmentItem): boolean => {
    return (
      (item.attributes && Object.keys(item.attributes).length > 0) || 
      (item.specifications && Object.keys(item.specifications).length > 0)
    );
  };

  // Function to format equipment title with attributes
  const formatEquipmentTitle = (item: EquipmentItem): string => {
    let title = item.title;
    
    if (item.attributes && Object.keys(item.attributes).length > 0) {
      const attributesText = Object.entries(item.attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      title += ` (${attributesText})`;
    }
    
    return title;
  };

  // Function to render attribute badges
  const renderAttributeBadges = (item: EquipmentItem) => {
    if (!item.attributes || Object.keys(item.attributes).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(item.attributes).map(([key, value]) => (
          <span 
            key={key}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {key}: {value}
          </span>
        ))}
      </div>
    );
  };

  const renderDetailsRow = (item: EquipmentItem, itemId: string) => {
    const hasAttributes = item.attributes && Object.keys(item.attributes).length > 0;
    const hasSpecifications = item.specifications && Object.keys(item.specifications).length > 0;

    if (!hasAttributes && !hasSpecifications) {
      return null;
    }

    if (!expandedItems[itemId]) {
      return null;
    }

    return (
      <tr className="bg-gray-50 border-b border-gray-100">
        <td colSpan={5} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasSpecifications && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Spécifications</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Spécification</TableHead>
                      <TableHead className="w-1/2">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(item.specifications || {}).map(([key, value]) => (
                      <TableRow key={`spec-${key}`}>
                        <TableCell className="font-medium capitalize">{key}</TableCell>
                        <TableCell>{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 font-medium">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <h4 className="text-lg">Détail de l'équipement</h4>
        </div>
        <span className="text-blue-600 text-sm font-medium">
          {equipment.length} article{equipment.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Désignation</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Quantité</th>
              {!hideFinancialDetails && (
                <th className="text-right py-3 px-4 font-medium text-gray-600">Prix d'achat</th>
              )}
              {!hideFinancialDetails && (
                <th className="text-right py-3 px-4 font-medium text-gray-600">Prix mensuel</th>
              )}
              {!hideFinancialDetails && (
                <th className="text-right py-3 px-4 font-medium text-gray-600">Marge (%)</th>
              )}
              <th className="text-right py-3 px-4 font-medium text-gray-600">Total mensuel</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {equipment.map((item, index) => {
              const monthlyPayment = item.monthlyPayment || 0;
              const totalItemMonthly = monthlyPayment * item.quantity;
              const itemId = item.id || `item-${index}`;
              const isExpanded = expandedItems[itemId] || false;
              
              return (
                <React.Fragment key={itemId}>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-start">
                          {hasDetails(item) && (
                            <button 
                              onClick={() => toggleExpand(itemId)}
                              className="mr-2 mt-0.5 text-blue-600 p-1 rounded-full hover:bg-blue-50"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            {renderAttributeBadges(item)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    {!hideFinancialDetails && (
                      <td className="py-3 px-4 text-right">{formatCurrency(item.purchasePrice || 0)}</td>
                    )}
                    {!hideFinancialDetails && (
                      <td className="py-3 px-4 text-right">{formatCurrency(monthlyPayment)}</td>
                    )}
                    {!hideFinancialDetails && (
                      <td className="py-3 px-4 text-right">
                        {item.margin ? `${item.margin.toFixed(1)}%` : '-'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(totalItemMonthly)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-sm">
                      {hasDetails(item) && item.specifications && Object.keys(item.specifications).length > 0 ? (
                        <button 
                          onClick={() => toggleExpand(itemId)}
                          className="text-blue-600 text-xs underline hover:text-blue-800"
                        >
                          {isExpanded ? "Masquer" : "Afficher"} specs
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                  
                  {renderDetailsRow(item, itemId)}
                </React.Fragment>
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
        {!hideFinancialDetails && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="flex items-center text-green-600 mb-1">
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              <span className="text-gray-600">Marge générée</span>
            </div>
            <span className="text-xl font-semibold text-green-600">{formatCurrency(finalMargin)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentDetailTable;
