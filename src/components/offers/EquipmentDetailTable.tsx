
import React, { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EquipmentItem = {
  id?: string; 
  title: string;
  purchasePrice?: number;
  quantity: number;
  margin?: number;
  monthlyPayment?: number;
  attributes?: Record<string, string> | { key: string; value: string }[];
  specifications?: Record<string, string | number> | { key: string; value: string }[];
};

interface EquipmentDetailTableProps {
  equipment: EquipmentItem[];
  totalMonthly: number;
  totalMargin: number;
  totalMarginWithDifference?: number;
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
  
  // État pour suivre quels équipements sont développés
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Par défaut, développer tous les équipements pour montrer les détails au premier chargement
  React.useEffect(() => {
    const expandAll: Record<string, boolean> = {};
    equipment.forEach((item, index) => {
      const itemId = item.id || `item-${index}`;
      expandAll[itemId] = true;
    });
    setExpandedItems(expandAll);
  }, [equipment]);
  
  // Fonction pour basculer l'état d'expansion d'un équipement
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Fonction pour vérifier si un équipement a des attributs ou des spécifications
  const hasDetails = (item: EquipmentItem): boolean => {
    // Vérifier les attributs
    if (item.attributes) {
      if (Array.isArray(item.attributes)) {
        if (item.attributes.length > 0) return true;
      } else if (Object.keys(item.attributes).length > 0) {
        return true;
      }
    }
    
    // Vérifier les spécifications
    if (item.specifications) {
      if (Array.isArray(item.specifications)) {
        if (item.specifications.length > 0) return true;
      } else if (Object.keys(item.specifications).length > 0) {
        return true;
      }
    }
    
    return false;
  };

  // Fonction pour afficher les spécifications et attributs
  const renderDetailsRow = (item: EquipmentItem, itemId: string) => {
    // Normaliser les attributs en tableau d'objets {key, value}
    const normalizedAttributes = item.attributes 
      ? Array.isArray(item.attributes) 
        ? item.attributes 
        : Object.entries(item.attributes).map(([key, value]) => ({ key, value: String(value) }))
      : [];
      
    // Normaliser les spécifications en tableau d'objets {key, value}
    const normalizedSpecs = item.specifications 
      ? Array.isArray(item.specifications) 
        ? item.specifications 
        : Object.entries(item.specifications).map(([key, value]) => ({ key, value: String(value) }))
      : [];
    
    const hasAttributes = normalizedAttributes.length > 0;
    const hasSpecifications = normalizedSpecs.length > 0;

    // Vérifier s'il y a des détails à afficher
    if (!hasAttributes && !hasSpecifications) {
      return null;
    }

    // Vérifier si l'élément est développé
    if (!expandedItems[itemId]) {
      return null;
    }

    // Séparation des attributs en attributs de configuration et autres attributs
    const configAttributes = normalizedAttributes.filter(attr => 
      ['capacité', 'mémoire', 'ram', 'couleur', 'taille', 'processeur', 'cpu', 'stockage', 'modèle', 'type', 'configuration']
      .some(term => attr.key.toLowerCase().includes(term))
    );
    
    const otherAttributes = normalizedAttributes.filter(attr => 
      !['capacité', 'mémoire', 'ram', 'couleur', 'taille', 'processeur', 'cpu', 'stockage', 'modèle', 'type', 'configuration']
      .some(term => attr.key.toLowerCase().includes(term))
    );

    return (
      <tr className="bg-gray-50 border-b border-gray-100">
        <td colSpan={5} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configAttributes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Configuration choisie</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Option</TableHead>
                      <TableHead className="w-1/2">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configAttributes.map((attr, index) => (
                      <TableRow key={`config-${index}`}>
                        <TableCell className="font-medium capitalize">{attr.key}</TableCell>
                        <TableCell>{attr.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {otherAttributes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Autres attributs</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Attribut</TableHead>
                      <TableHead className="w-1/2">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherAttributes.map((attr, index) => (
                      <TableRow key={`attr-${index}`}>
                        <TableCell className="font-medium capitalize">{attr.key}</TableCell>
                        <TableCell>{attr.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {hasSpecifications && (
              <div className={otherAttributes.length > 0 || configAttributes.length > 0 ? "md:col-span-2 mt-4" : ""}>
                <h4 className="font-medium text-gray-700 mb-2">Spécifications techniques</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Spécification</TableHead>
                      <TableHead className="w-1/2">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalizedSpecs.map((spec, index) => (
                      <TableRow key={`spec-${index}`}>
                        <TableCell className="font-medium capitalize">{spec.key}</TableCell>
                        <TableCell>{spec.value}</TableCell>
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
  
  // Fonction pour créer une chaîne de caractères à partir des attributs de configuration
  const createConfigString = (item: EquipmentItem): string => {
    const attributes = item.attributes 
      ? Array.isArray(item.attributes) 
        ? item.attributes 
        : Object.entries(item.attributes).map(([key, value]) => ({ key, value: String(value) }))
      : [];
      
    // Filtrer pour ne garder que les attributs liés à la configuration
    const configAttributes = attributes.filter(attr => 
      ['capacité', 'mémoire', 'ram', 'couleur', 'taille', 'processeur', 'cpu', 'stockage', 'modèle', 'type', 'configuration']
      .some(term => attr.key.toLowerCase().includes(term))
    );
    
    return configAttributes
      .map(attr => `${attr.key}: ${attr.value}`)
      .join(' • ');
  };
  
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
              <th className="text-right py-2 px-4 font-medium text-gray-600">Détails</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((item, index) => {
              const monthlyPayment = item.monthlyPayment || 0;
              const totalItemMonthly = monthlyPayment * item.quantity;
              const itemId = item.id || `item-${index}`;
              const isExpanded = expandedItems[itemId] || false;
              const configString = createConfigString(item);
              
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
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {configString && (
                              <div className="text-xs text-gray-500 mt-1">
                                {configString}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(monthlyPayment)}</td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(totalItemMonthly)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-sm">
                      {hasDetails(item) ? (
                        <button 
                          onClick={() => toggleExpand(itemId)}
                          className="text-blue-600 text-xs underline hover:text-blue-800"
                        >
                          {isExpanded ? "Masquer" : "Afficher"}
                        </button>
                      ) : (
                        <span className="text-gray-400">Non disponible</span>
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
