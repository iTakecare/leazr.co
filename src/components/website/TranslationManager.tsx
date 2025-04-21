
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Download, Upload, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Translation = {
  id: string;
  key: string;
  fr: string;
  en: string;
  nl: string;
  de: string;
  section: string;
  created_at: string;
  updated_at: string;
};

const LANGUAGES = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
  { code: "nl", name: "Nederlands" },
  { code: "de", name: "Deutsch" },
];

const SECTIONS = [
  "common",
  "navigation",
  "homepage",
  "catalog",
  "product",
  "checkout",
  "account",
  "footer",
  "blog",
  "contact",
];

const TranslationManager = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [newTranslation, setNewTranslation] = useState<Omit<Translation, "id" | "created_at" | "updated_at">>({
    key: "",
    fr: "",
    en: "",
    nl: "",
    de: "",
    section: "common",
  });
  const [activeSection, setActiveSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch translations query
  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["translations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .order("section")
        .order("key");
      
      if (error) throw error;
      return data as Translation[];
    }
  });

  // Add translation mutation
  const addTranslationMutation = useMutation({
    mutationFn: async (translationData: Omit<Translation, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("translations")
        .insert([translationData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      setIsAddModalOpen(false);
      setNewTranslation({
        key: "",
        fr: "",
        en: "",
        nl: "",
        de: "",
        section: "common",
      });
      toast.success("Traduction ajoutée avec succès");
    },
    onError: (error) => {
      console.error("Error adding translation:", error);
      toast.error("Erreur lors de l'ajout de la traduction");
    }
  });

  // Update translation mutation
  const updateTranslationMutation = useMutation({
    mutationFn: async ({ id, ...translationData }: Translation) => {
      const { data, error } = await supabase
        .from("translations")
        .update(translationData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      setIsEditModalOpen(false);
      setSelectedTranslation(null);
      toast.success("Traduction mise à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating translation:", error);
      toast.error("Erreur lors de la mise à jour de la traduction");
    }
  });

  // Delete translation mutation
  const deleteTranslationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("translations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      toast.success("Traduction supprimée avec succès");
    },
    onError: (error) => {
      console.error("Error deleting translation:", error);
      toast.error("Erreur lors de la suppression de la traduction");
    }
  });

  const handleAddTranslation = () => {
    if (!newTranslation.key.trim() || !newTranslation.fr.trim()) {
      toast.error("La clé et la traduction française sont requises");
      return;
    }
    addTranslationMutation.mutate(newTranslation);
  };

  const handleUpdateTranslation = () => {
    if (!selectedTranslation || !selectedTranslation.key.trim() || !selectedTranslation.fr.trim()) {
      toast.error("La clé et la traduction française sont requises");
      return;
    }
    updateTranslationMutation.mutate(selectedTranslation);
  };

  const handleDeleteTranslation = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette traduction ?")) {
      deleteTranslationMutation.mutate(id);
    }
  };

  const exportTranslations = () => {
    const exportData = translations.reduce((acc, item) => {
      // Group by language
      LANGUAGES.forEach(lang => {
        if (!acc[lang.code]) {
          acc[lang.code] = {};
        }
        
        // Group by section
        if (!acc[lang.code][item.section]) {
          acc[lang.code][item.section] = {};
        }
        
        // Add translation
        acc[lang.code][item.section][item.key] = item[lang.code as keyof typeof item] || '';
      });
      
      return acc;
    }, {} as Record<string, Record<string, Record<string, string>>>);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "translations.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast.success("Exportation réussie");
  };

  const importTranslations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!event.target.files?.length) return;
    
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = async e => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);
        
        // Convert the nested structure to flat translations
        const importedTranslations: Omit<Translation, "id" | "created_at" | "updated_at">[] = [];
        
        // Process each language
        Object.entries(json).forEach(([langCode, sections]) => {
          if (!LANGUAGES.some(l => l.code === langCode)) return;
          
          // Process each section
          Object.entries(sections as Record<string, Record<string, string>>).forEach(([section, translations]) => {
            // Process each translation key
            Object.entries(translations).forEach(([key, text]) => {
              // Find if this key+section already exists in our import list
              const existingIndex = importedTranslations.findIndex(t => t.key === key && t.section === section);
              
              if (existingIndex >= 0) {
                // Update existing entry
                importedTranslations[existingIndex] = {
                  ...importedTranslations[existingIndex],
                  [langCode]: text
                };
              } else {
                // Create new entry with defaults for other languages
                const newEntry: any = {
                  key,
                  section,
                  fr: "",
                  en: "",
                  nl: "",
                  de: ""
                };
                newEntry[langCode] = text;
                importedTranslations.push(newEntry);
              }
            });
          });
        });
        
        // Insert all translations
        if (importedTranslations.length > 0) {
          const { error } = await supabase
            .from("translations")
            .upsert(
              importedTranslations.map(t => ({
                ...t,
                // Use a composite key for upserting
                id: `${t.section}_${t.key}`
              })),
              { onConflict: 'id' }
            );
          
          if (error) throw error;
          
          queryClient.invalidateQueries({ queryKey: ["translations"] });
          toast.success(`Importation réussie: ${importedTranslations.length} traductions`);
        } else {
          toast.error("Aucune traduction valide trouvée dans le fichier");
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Erreur lors de l'importation: format invalide");
      }
      
      // Reset the input
      event.target.value = '';
    };
  };

  // Filter translations based on active section and search query
  const filteredTranslations = translations.filter(translation => {
    const matchesSection = activeSection === "all" || translation.section === activeSection;
    const matchesSearch = searchQuery === "" || 
      translation.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.nl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.de.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSection && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Traductions</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="w-64 pl-9"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une traduction
          </Button>
          <Button variant="outline" onClick={exportTranslations}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" className="relative">
            <Upload className="h-4 w-4 mr-2" />
            Importer
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".json"
              onChange={importTranslations}
            />
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          {SECTIONS.map((section) => (
            <TabsTrigger key={section} value={section}>
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeSection}>
          {isLoading ? (
            <div className="text-center py-4">Chargement...</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Section</TableHead>
                    <TableHead className="w-[200px]">Clé</TableHead>
                    <TableHead className="w-[200px]">Français</TableHead>
                    <TableHead className="w-[200px]">English</TableHead>
                    <TableHead className="w-[200px]">Nederlands</TableHead>
                    <TableHead className="w-[200px]">Deutsch</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranslations.length > 0 ? (
                    filteredTranslations.map((translation) => (
                      <TableRow key={translation.id}>
                        <TableCell className="font-medium">{translation.section}</TableCell>
                        <TableCell>{translation.key}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={translation.fr}>{translation.fr}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={translation.en}>{translation.en}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={translation.nl}>{translation.nl}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={translation.de}>{translation.de}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTranslation(translation);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTranslation(translation.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        Aucune traduction trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Translation Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ajouter une traduction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="section">Section</Label>
                <Select
                  value={newTranslation.section}
                  onValueChange={(value) => setNewTranslation({ ...newTranslation, section: value })}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Sélectionner une section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key">Clé</Label>
                <Input
                  id="key"
                  value={newTranslation.key}
                  onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
                  placeholder="ex: welcome_message"
                />
              </div>
            </div>
            
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="grid gap-2">
                <Label htmlFor={`translation-${lang.code}`}>{lang.name}</Label>
                <Textarea
                  id={`translation-${lang.code}`}
                  value={newTranslation[lang.code as keyof typeof newTranslation] as string}
                  onChange={(e) =>
                    setNewTranslation({
                      ...newTranslation,
                      [lang.code]: e.target.value,
                    })
                  }
                  placeholder={`Traduction en ${lang.name}`}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddTranslation}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Translation Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifier la traduction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-section">Section</Label>
                <Select
                  value={selectedTranslation?.section || ""}
                  onValueChange={(value) =>
                    setSelectedTranslation(
                      selectedTranslation
                        ? { ...selectedTranslation, section: value }
                        : null
                    )
                  }
                >
                  <SelectTrigger id="edit-section">
                    <SelectValue placeholder="Sélectionner une section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-key">Clé</Label>
                <Input
                  id="edit-key"
                  value={selectedTranslation?.key || ""}
                  onChange={(e) =>
                    setSelectedTranslation(
                      selectedTranslation
                        ? { ...selectedTranslation, key: e.target.value }
                        : null
                    )
                  }
                />
              </div>
            </div>
            
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="grid gap-2">
                <Label htmlFor={`edit-translation-${lang.code}`}>{lang.name}</Label>
                <Textarea
                  id={`edit-translation-${lang.code}`}
                  value={selectedTranslation?.[lang.code as keyof typeof selectedTranslation] as string || ""}
                  onChange={(e) =>
                    setSelectedTranslation(
                      selectedTranslation
                        ? { ...selectedTranslation, [lang.code]: e.target.value }
                        : null
                    )
                  }
                  rows={2}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateTranslation}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranslationManager;
