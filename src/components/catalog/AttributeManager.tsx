
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAttributes, 
  getAttributeWithValues, 
  createAttribute, 
  updateAttribute, 
  deleteAttribute,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue
} from "@/services/attributeService";
import { AttributeDefinition, AttributeValue } from "@/types/catalog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, X, Check, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AttributeManager = () => {
  const queryClient = useQueryClient();
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [isAddValueOpen, setIsAddValueOpen] = useState(false);
  const [editedAttribute, setEditedAttribute] = useState<AttributeDefinition | null>(null);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState<AttributeValue | null>(null);
  
  // Form data
  const [attributeName, setAttributeName] = useState("");
  const [attributeDisplayName, setAttributeDisplayName] = useState("");
  const [valueText, setValueText] = useState("");
  const [valueDisplayText, setValueDisplayText] = useState("");
  
  // Query for attributes list
  const attributesQuery = useQuery({
    queryKey: ["attributes"],
    queryFn: getAttributes
  });
  
  // Query for selected attribute with values
  const attributeWithValuesQuery = useQuery({
    queryKey: ["attribute", selectedAttributeId],
    queryFn: () => selectedAttributeId ? getAttributeWithValues(selectedAttributeId) : null,
    enabled: !!selectedAttributeId
  });
  
  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: createAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      resetAttributeForm();
      setIsAddAttributeOpen(false);
      toast.success("Attribut créé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création de l'attribut: ${error.message}`);
    }
  });
  
  // Update attribute mutation
  const updateAttributeMutation = useMutation({
    mutationFn: ({ id, attribute }: { id: string, attribute: Partial<AttributeDefinition> }) => 
      updateAttribute(id, attribute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      setEditedAttribute(null);
      toast.success("Attribut mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour de l'attribut: ${error.message}`);
    }
  });
  
  // Delete attribute mutation
  const deleteAttributeMutation = useMutation({
    mutationFn: deleteAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      setSelectedAttributeId(null);
      toast.success("Attribut supprimé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression de l'attribut: ${error.message}`);
    }
  });
  
  // Create attribute value mutation
  const createAttributeValueMutation = useMutation({
    mutationFn: createAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute", selectedAttributeId] });
      resetValueForm();
      setIsAddValueOpen(false);
      toast.success("Valeur d'attribut créée avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création de la valeur d'attribut: ${error.message}`);
    }
  });
  
  // Update attribute value mutation
  const updateAttributeValueMutation = useMutation({
    mutationFn: ({ id, value }: { id: string, value: Partial<AttributeValue> }) => 
      updateAttributeValue(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute", selectedAttributeId] });
      setEditedValue(null);
      toast.success("Valeur d'attribut mise à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour de la valeur d'attribut: ${error.message}`);
    }
  });
  
  // Delete attribute value mutation
  const deleteAttributeValueMutation = useMutation({
    mutationFn: deleteAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute", selectedAttributeId] });
      toast.success("Valeur d'attribut supprimée avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression de la valeur d'attribut: ${error.message}`);
    }
  });
  
  // Reset form states
  const resetAttributeForm = () => {
    setAttributeName("");
    setAttributeDisplayName("");
  };
  
  const resetValueForm = () => {
    setValueText("");
    setValueDisplayText("");
  };
  
  // Initialize edit attribute form
  const handleEditAttribute = (attribute: AttributeDefinition) => {
    setEditedAttribute(attribute);
    setAttributeName(attribute.name);
    setAttributeDisplayName(attribute.display_name);
  };
  
  // Initialize edit value form
  const handleEditValue = (value: AttributeValue) => {
    setEditedValue(value);
    setValueText(value.value);
    setValueDisplayText(value.display_value);
  };
  
  // Submit attribute form
  const handleSubmitAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!attributeName || !attributeDisplayName) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    if (editedAttribute) {
      updateAttributeMutation.mutate({ 
        id: editedAttribute.id, 
        attribute: { 
          name: attributeName,
          display_name: attributeDisplayName
        } 
      });
    } else {
      createAttributeMutation.mutate({
        name: attributeName,
        display_name: attributeDisplayName
      });
    }
  };
  
  // Submit value form
  const handleSubmitValue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!valueText || !valueDisplayText || !selectedAttributeId) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    if (editedValue) {
      updateAttributeValueMutation.mutate({
        id: editedValue.id,
        value: {
          value: valueText,
          display_value: valueDisplayText
        }
      });
    } else {
      createAttributeValueMutation.mutate({
        attribute_id: selectedAttributeId,
        value: valueText,
        display_value: valueDisplayText
      });
    }
  };
  
  // Select an attribute to view its values
  const handleSelectAttribute = (attributeId: string) => {
    setSelectedAttributeId(attributeId);
  };
  
  // Open add value dialog
  const handleAddValue = () => {
    setEditedValue(null);
    resetValueForm();
    setIsAddValueOpen(true);
  };
  
  useEffect(() => {
    if (editedAttribute === null) {
      resetAttributeForm();
    }
  }, [editedAttribute]);
  
  useEffect(() => {
    if (editedValue === null) {
      resetValueForm();
    }
  }, [editedValue]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestion des attributs</h2>
        <Button onClick={() => {
          setEditedAttribute(null);
          resetAttributeForm();
          setIsAddAttributeOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel attribut
        </Button>
      </div>
      
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Liste des attributs</TabsTrigger>
          {selectedAttributeId && (
            <TabsTrigger value="values">Valeurs d'attribut</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Attributs de produit</CardTitle>
              <CardDescription>
                Les attributs permettent de définir les caractéristiques variables des produits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attributesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : attributesQuery.isError ? (
                <div className="text-center p-4 text-red-500">
                  Erreur lors du chargement des attributs
                </div>
              ) : (attributesQuery.data?.length || 0) === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  Aucun attribut défini. Créez votre premier attribut.
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {attributesQuery.data?.map(attribute => (
                      <div 
                        key={attribute.id} 
                        className={`p-3 border rounded-md flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors ${selectedAttributeId === attribute.id ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => handleSelectAttribute(attribute.id)}
                      >
                        <div>
                          <div className="font-medium">{attribute.display_name}</div>
                          <div className="text-sm text-gray-500">{attribute.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAttribute(attribute);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'attribut</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer cet attribut? Cette action est irréversible et supprimera également toutes les valeurs associées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAttributeMutation.mutate(attribute.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="values">
          {selectedAttributeId && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Valeurs pour{' '}
                  {attributeWithValuesQuery.data?.display_name || '...'}
                </CardTitle>
                <CardDescription>
                  Définissez les valeurs possibles pour cet attribut.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attributeWithValuesQuery.isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-md"></div>
                    ))}
                  </div>
                ) : attributeWithValuesQuery.isError ? (
                  <div className="text-center p-4 text-red-500">
                    Erreur lors du chargement des valeurs
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <Button onClick={handleAddValue}>
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une valeur
                      </Button>
                    </div>
                    
                    {(attributeWithValuesQuery.data?.values?.length || 0) === 0 ? (
                      <div className="text-center p-4 text-gray-500">
                        Aucune valeur définie pour cet attribut.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attributeWithValuesQuery.data?.values?.map(value => (
                          <div 
                            key={value.id} 
                            className="p-3 border rounded-md flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{value.display_value}</div>
                              <div className="text-sm text-gray-500">{value.value}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editedValue?.id === value.id ? (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => setEditedValue(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="default" 
                                    size="icon"
                                    onClick={(e) => handleSubmitValue(e)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditValue(value)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer la valeur</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer cette valeur? Cette action est irréversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteAttributeValueMutation.mutate(value.id)}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Supprimer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Attribute Dialog */}
      <Dialog open={isAddAttributeOpen} onOpenChange={setIsAddAttributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editedAttribute ? "Modifier l'attribut" : "Ajouter un attribut"}
            </DialogTitle>
            <DialogDescription>
              {editedAttribute 
                ? "Modifiez les informations de l'attribut."
                : "Créez un nouvel attribut pour les produits."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAttribute}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="attributeName">Nom technique</Label>
                <Input
                  id="attributeName"
                  value={attributeName}
                  onChange={(e) => setAttributeName(e.target.value)}
                  placeholder="color"
                  required
                />
                <p className="text-xs text-gray-500">
                  Nom utilisé dans le code (sans espaces ni caractères spéciaux)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attributeDisplayName">Nom d'affichage</Label>
                <Input
                  id="attributeDisplayName"
                  value={attributeDisplayName}
                  onChange={(e) => setAttributeDisplayName(e.target.value)}
                  placeholder="Couleur"
                  required
                />
                <p className="text-xs text-gray-500">
                  Nom affiché aux utilisateurs
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditedAttribute(null);
                  setIsAddAttributeOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editedAttribute ? "Mettre à jour" : "Créer l'attribut"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Attribute Value Dialog */}
      <Dialog open={isAddValueOpen} onOpenChange={setIsAddValueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editedValue ? "Modifier la valeur" : "Ajouter une valeur"}
            </DialogTitle>
            <DialogDescription>
              {editedValue 
                ? "Modifiez les informations de la valeur d'attribut."
                : "Ajoutez une nouvelle valeur pour cet attribut."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitValue}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="valueText">Valeur technique</Label>
                <Input
                  id="valueText"
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                  placeholder="red"
                  required
                />
                <p className="text-xs text-gray-500">
                  Valeur utilisée dans le code (sans espaces ni caractères spéciaux)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valueDisplayText">Valeur d'affichage</Label>
                <Input
                  id="valueDisplayText"
                  value={valueDisplayText}
                  onChange={(e) => setValueDisplayText(e.target.value)}
                  placeholder="Rouge"
                  required
                />
                <p className="text-xs text-gray-500">
                  Valeur affichée aux utilisateurs
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditedValue(null);
                  setIsAddValueOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editedValue ? "Mettre à jour" : "Ajouter la valeur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributeManager;
