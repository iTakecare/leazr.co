import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Euro, Calculator as CalcIcon, Package, Percent, Plus, Trash2, Pencil, FolderOpen, ChevronUp, ChevronDown, Users, Building2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Equipment, Leaser, GlobalMarginAdjustment } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import ProductCatalog from "@/components/ui/ProductCatalog";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { formatCurrency } from "@/utils/formatters";
import { createOffer } from "@/services/offerService";

const CreateOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [equipment, setEquipment] = useState<Equipment>({
    id: crypto.randomUUID(),
    title: '',
    purchasePrice: 0,
    quantity: 1,
    margin: 20,
  });
  
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState({ percentage: 0, amount: 0 });
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [totalMonthlyPayment, setTotalMonthlyPayment] = useState<number>(0);
  const [globalMarginAdjustment, setGlobalMarginAdjustment] = useState<GlobalMarginAdjustment>({ 
    percentage: 0,
    amount: 0,
    newMonthly: 0,
    currentCoef: 0,
    newCoef: 0
  });
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    setSelectedLeaser(defaultLeasers[0]);
    setLoading(false);
  }, []);

  const calculateFinancedAmount = (eq: Equipment) => {
    const priceWithMargin = eq.purchasePrice * (1 + eq.margin / 100);
    return priceWithMargin;
  };

  const findCoefficient = (amount: number) => {
    if (!selectedLeaser || !selectedLeaser.ranges) {
      return defaultLeasers[0].ranges[0].coefficient; // Default to first coefficient if no leaser selected
    }
    
    const range = selectedLeaser.ranges.find(
      (r) => amount >= r.min && amount <= r.max
    );
    return range?.coefficient || defaultLeasers[0].ranges[0].coefficient; // Fallback to default if no range found
  };

  const calculateMonthlyPayment = () => {
    const financedAmount = calculateFinancedAmount(equipment);
    const coef = findCoefficient(financedAmount);
    setCoefficient(coef);
    setMonthlyPayment((financedAmount * coef) / 100);
  };

  const calculateMarginFromMonthlyPayment = () => {
    if (targetMonthlyPayment <= 0 || equipment.purchasePrice <= 0) {
      setCalculatedMargin({ percentage: 0, amount: 0 });
      return;
    }

    // Get ranges from selected leaser or default leaser
    const ranges = selectedLeaser?.ranges || defaultLeasers[0].ranges;
    let coef = ranges[0].coefficient; // Start with first coefficient
    
    // Find the appropriate coefficient based on estimated financed amount
    for (const range of ranges) {
      const estimatedFinancedAmount = (targetMonthlyPayment * 100) / range.coefficient;
      if (estimatedFinancedAmount >= range.min && estimatedFinancedAmount <= range.max) {
        coef = range.coefficient;
        break;
      }
    }

    const requiredFinancedAmount = (targetMonthlyPayment * 100) / coef;
    const marginAmount = requiredFinancedAmount - equipment.purchasePrice;
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;

    setCalculatedMargin({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount
    });
  };

  const calculateGlobalMarginAdjustment = () => {
    if (equipmentList.length === 0) {
      setGlobalMarginAdjustment({ 
        percentage: 0, 
        amount: 0, 
        newMonthly: 0,
        currentCoef: 0,
        newCoef: 0
      });
      return;
    }

    const totalBaseAmount = equipmentList.reduce((sum, eq) => {
      return sum + (eq.purchasePrice * eq.quantity);
    }, 0);

    const totalFinancedAmount = equipmentList.reduce((sum, eq) => {
      return sum + calculateFinancedAmount(eq) * eq.quantity;
    }, 0);

    const currentCoef = findCoefficient(totalFinancedAmount);
    const currentMonthly = (totalFinancedAmount * currentCoef) / 100;
    const newCoef = findCoefficient(totalFinancedAmount);
    const newMonthly = (totalFinancedAmount * newCoef) / 100;
    const marginAmount = totalFinancedAmount - totalBaseAmount;
    const marginPercentage = (marginAmount / totalBaseAmount) * 100;

    setGlobalMarginAdjustment({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount,
      newMonthly: newMonthly,
      currentCoef: currentCoef,
      newCoef: newCoef
    });

    setTotalMonthlyPayment(newMonthly);
  };

  const applyCalculatedMargin = () => {
    setEquipment({
      ...equipment,
      margin: Number(calculatedMargin.percentage.toFixed(2))
    });
  };

  const handleMarginChange = (value: string) => {
    const newMargin = parseFloat(value);
    if (!isNaN(newMargin) && newMargin >= 0) {
      setEquipment({
        ...equipment,
        margin: Number(Math.min(1000, newMargin).toFixed(2))
      });
    }
  };

  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      if (editingId) {
        setEquipmentList(equipmentList.map(eq => 
          eq.id === editingId ? { ...equipment, margin: Number(equipment.margin.toFixed(2)), id: editingId } : eq
        ));
        setEditingId(null);
      } else {
        const newEquipment = { ...equipment, margin: Number(equipment.margin.toFixed(2)) };
        setEquipmentList([...equipmentList, newEquipment]);
      }
      
      setEquipment({
        id: crypto.randomUUID(),
        title: '',
        purchasePrice: 0,
        quantity: 1,
        margin: 20,
      });
    }
  };

  const startEditing = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEquipment(equipmentToEdit);
      setEditingId(id);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEquipment({
      id: crypto.randomUUID(),
      title: '',
      purchasePrice: 0,
      quantity: 1,
      margin: 20,
    });
  };

  const removeFromList = (id: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setEquipmentList(equipmentList.map(eq => 
      eq.id === id ? { ...eq, quantity: Math.max(1, eq.quantity + change) } : eq
    ));
  };

  const handleProductSelect = (product: any) => {
    if (!selectedLeaser) return;
    
    const coef = findCoefficient(product.price);
    const margin = 20; // Default margin as the product doesn't include monthly_price
    
    setEquipment({
      id: crypto.randomUUID(),
      title: `${product.name}`,
      purchasePrice: product.price,
      quantity: 1,
      margin: Number(margin),
    });
  };

  const handleClientSelect = (client: { id: string; name: string; email: string; company: string }) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientEmail(client.email);
    setClientCompany(client.company);
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    
    // Recalculer les paiements avec le nouveau leaser
    if (leaser) {
      calculateMonthlyPayment();
      calculateGlobalMarginAdjustment();
    }
  };

  const handleSaveOffer = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer une offre");
      return;
    }

    if (!clientName || !clientEmail || equipmentList.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const equipmentDescription = equipmentList
        .map(eq => `${eq.title} (${eq.quantity}x)`)
        .join(", ");

      const offerData = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: totalMonthlyPayment * 0.1, // Exemple: 10% de commission
      };

      const offerId = await createOffer(offerData);
      
      if (offerId) {
        toast.success("Offre créée avec succès !");
        navigate("/offers");
      } else {
        throw new Error("Failed to create offer");
      }
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error("Une erreur s'est produite lors de la création de l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedLeaser) {
      calculateMonthlyPayment();
    }
  }, [equipment, selectedLeaser]);

  useEffect(() => {
    calculateMarginFromMonthlyPayment();
  }, [targetMonthlyPayment, equipment.purchasePrice, selectedLeaser]);

  useEffect(() => {
    if (selectedLeaser) {
      calculateGlobalMarginAdjustment();
    }
  }, [equipmentList, selectedLeaser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <CalcIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Calculateur de Mensualités
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/offers')}
                >
                  Retour
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="grid gap-6">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Leaser
                    </Label>
                    <div className="flex gap-3 items-center">
                      <div 
                        onClick={() => setIsLeaserSelectorOpen(true)}
                        className="flex-1 relative border border-gray-300 rounded-lg p-3 flex items-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            {selectedLeaser?.logo_url ? (
                              <div className="h-8 w-14 flex items-center">
                                <img 
                                  src={selectedLeaser.logo_url} 
                                  alt={selectedLeaser.name} 
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : null}
                            <span>{selectedLeaser?.name || 'Sélectionner un leaser'}</span>
                          </div>
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    <Label className="text-sm font-medium text-gray-700">
                      Intitulé du matériel
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          type="text"
                          className="pl-10"
                          value={equipment.title}
                          onChange={(e) =>
                            setEquipment({ ...equipment, title: e.target.value })
                          }
                          placeholder="Ex: ThinkPad T480"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCatalogOpen(true)}
                        title="Sélectionner depuis le catalogue"
                      >
                        <FolderOpen className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Prix d'achat (€)
                      </Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-10"
                          value={equipment.purchasePrice || ''}
                          onChange={(e) =>
                            setEquipment({
                              ...equipment,
                              purchasePrice: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Marge (%)
                      </Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.01"
                          className="pl-10"
                          value={equipment.margin.toFixed(2)}
                          onChange={(e) => handleMarginChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Marge en euros :</span>
                        <span className="font-semibold">
                          {formatCurrency(equipment.purchasePrice * (equipment.margin / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Prix avec marge :</span>
                        <span className="font-semibold">
                          {formatCurrency(equipment.purchasePrice * (1 + equipment.margin / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Coefficient appliqué :</span>
                        <span className="font-semibold">{coefficient.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-blue-600">
                        <span>Mensualité unitaire :</span>
                        <span>{formatCurrency(monthlyPayment)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={addToList}
                      className="flex-1"
                      disabled={!equipment.title || equipment.purchasePrice <= 0}
                    >
                      {editingId ? (
                        <>
                          <Pencil className="mr-2 h-4 w-4" />
                          Mettre à jour
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter à la liste
                        </>
                      )}
                    </Button>
                    {editingId && (
                      <Button
                        onClick={cancelEditing}
                        variant="destructive"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-6">Calcul de la marge à partir de la mensualité souhaitée</h2>
                    <div className="grid gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Mensualité souhaitée (€)
                        </Label>
                        <div className="relative">
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="pl-10"
                            value={targetMonthlyPayment || ''}
                            onChange={(e) => setTargetMonthlyPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6">
                        <div className="grid gap-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Marge nécessaire :</span>
                            <span className="font-semibold">{calculatedMargin.percentage.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-lg font-bold text-blue-600">
                            <span>Marge en euros :</span>
                            <span>{formatCurrency(calculatedMargin.amount)}</span>
                          </div>
                          <Button
                            onClick={applyCalculatedMargin}
                            disabled={calculatedMargin.percentage === 0}
                            className="w-full mt-2"
                          >
                            Appliquer cette marge
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Liste des équipements</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Équipement</th>
                        <th className="text-right py-3 px-4">Prix unitaire</th>
                        <th className="text-right py-3 px-4">Qté</th>
                        <th className="text-right py-3 px-4">Marge</th>
                        <th className="text-right py-3 px-4">Total</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentList.map((eq) => (
                        <tr key={eq.id} className={`border-b ${editingId === eq.id ? 'bg-blue-50' : ''}`}>
                          <td className="py-3 px-4">{eq.title}</td>
                          <td className="text-right py-3 px-4">
                            {formatCurrency(eq.purchasePrice)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateQuantity(eq.id, -1)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <span>{eq.quantity}</span>
                              <button
                                onClick={() => updateQuantity(eq.id, 1)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">{eq.margin.toFixed(2)}%</td>
                          <td className="text-right py-3 px-4">
                            {formatCurrency(eq.purchasePrice * eq.quantity * (1 + eq.margin / 100))}
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditing(eq.id)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Modifier"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => removeFromList(eq.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {equipmentList.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td colSpan={4} className="py-4 px-4 text-right">
                            Mensualité totale :
                          </td>
                          <td colSpan={2} className="py-4 px-4 text-right text-blue-600">
                            {formatCurrency(totalMonthlyPayment)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {equipmentList.length > 0 && (
                  <>
                    <div className="mt-8 bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Récapitulatif global</h3>
                      <div className="grid gap-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Coefficient actuel :</span>
                          <span className="font-semibold">{globalMarginAdjustment.currentCoef.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Nouveau coefficient :</span>
                          <span className="font-semibold">{globalMarginAdjustment.newCoef.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Marge globale :</span>
                          <span className="font-semibold">{globalMarginAdjustment.percentage.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Marge totale en euros :</span>
                          <span className="font-semibold">
                            {formatCurrency(globalMarginAdjustment.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold text-blue-600">
                          <span>Mensualité totale :</span>
                          <span>{formatCurrency(globalMarginAdjustment.newMonthly)}</span>
                        </div>
                      </div>
                    </div>

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
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsClientSelectorOpen(true)}
                                title="Sélectionner un client"
                              >
                                <Users className="h-5 w-5" />
                              </Button>
                            </div>
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
                          disabled={!clientName || !clientEmail || equipmentList.length === 0 || isSubmitting || !selectedLeaser}
                          variant="default"
                        >
                          <Save className="h-5 w-5" />
                          Sauvegarder l'offre
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <ProductCatalog
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProduct={handleProductSelect}
        />

        <ClientSelector
          isOpen={isClientSelectorOpen}
          onClose={() => setIsClientSelectorOpen(false)}
          onSelectClient={handleClientSelect}
        />

        <LeaserSelector
          isOpen={isLeaserSelectorOpen}
          onClose={() => setIsLeaserSelectorOpen(false)}
          onSelect={handleLeaserSelect}
          currentLeaserId={selectedLeaser?.id}
        />
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
