
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Redirection {
  id: number;
  source: string;
  target: string;
  type: string;
}

const RedirectionManager = () => {
  // Redirection mockées pour le prototype
  const [redirections, setRedirections] = useState<Redirection[]>([
    { id: 1, source: "/old-page", target: "/about", type: "301" },
    { id: 2, source: "/blog/old-post", target: "/blog/leasing-materiel-reconditionne-empreinte-carbone", type: "301" },
    { id: 3, source: "/temporary-page", target: "/services", type: "302" }
  ]);
  
  const [isAddingRedirection, setIsAddingRedirection] = useState(false);
  const [isEditingRedirection, setIsEditingRedirection] = useState(false);
  const [currentRedirection, setCurrentRedirection] = useState<Redirection | null>(null);
  const [redirectionToDelete, setRedirectionToDelete] = useState<number | null>(null);

  const handleAddRedirection = () => {
    setCurrentRedirection({ id: 0, source: "", target: "", type: "301" });
    setIsAddingRedirection(true);
  };

  const handleEditRedirection = (redirection: Redirection) => {
    setCurrentRedirection({ ...redirection });
    setIsEditingRedirection(true);
  };

  const handleDeleteRedirection = (id: number) => {
    setRedirectionToDelete(id);
  };

  const confirmDeleteRedirection = () => {
    if (redirectionToDelete) {
      setRedirections(redirections.filter(r => r.id !== redirectionToDelete));
      setRedirectionToDelete(null);
    }
  };

  const handleSaveRedirection = () => {
    if (!currentRedirection) return;

    if (isAddingRedirection) {
      // Ajouter une nouvelle redirection
      const newId = Math.max(0, ...redirections.map(r => r.id)) + 1;
      setRedirections([...redirections, { ...currentRedirection, id: newId }]);
      setIsAddingRedirection(false);
    } else if (isEditingRedirection) {
      // Mettre à jour une redirection existante
      setRedirections(redirections.map(r => 
        r.id === currentRedirection.id ? currentRedirection : r
      ));
      setIsEditingRedirection(false);
    }
    
    setCurrentRedirection(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Redirections</h2>
        <Button onClick={handleAddRedirection}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle redirection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Règles de redirection</CardTitle>
          <CardDescription>
            Configurez les redirections d'URL pour rediriger les visiteurs de pages obsolètes vers de nouvelles pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {redirections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redirections.map((redirection) => (
                  <TableRow key={redirection.id}>
                    <TableCell className="font-medium">{redirection.source}</TableCell>
                    <TableCell>{redirection.target}</TableCell>
                    <TableCell>
                      <div className="inline-block px-2 py-1 rounded-full text-xs">
                        {redirection.type === "301" ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            301 (Permanente)
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            302 (Temporaire)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditRedirection(redirection)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteRedirection(redirection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucune redirection configurée.</p>
              <Button onClick={handleAddRedirection}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter une redirection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue pour ajouter/modifier une redirection */}
      <Dialog 
        open={isAddingRedirection || isEditingRedirection} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingRedirection(false);
            setIsEditingRedirection(false);
            setCurrentRedirection(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddingRedirection ? "Ajouter une redirection" : "Modifier la redirection"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">URL source</Label>
              <Input 
                id="source" 
                placeholder="/ancien-chemin"
                value={currentRedirection?.source || ""}
                onChange={(e) => setCurrentRedirection({
                  ...(currentRedirection as Redirection),
                  source: e.target.value
                })}
              />
              <p className="text-sm text-gray-500">
                Le chemin d'accès relatif à rediriger (par exemple, /ancienne-page)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target">URL destination</Label>
              <Input 
                id="target" 
                placeholder="/nouveau-chemin"
                value={currentRedirection?.target || ""}
                onChange={(e) => setCurrentRedirection({
                  ...(currentRedirection as Redirection),
                  target: e.target.value
                })}
              />
              <p className="text-sm text-gray-500">
                Le chemin d'accès relatif vers lequel rediriger (par exemple, /nouvelle-page)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type de redirection</Label>
              <Select 
                value={currentRedirection?.type || "301"} 
                onValueChange={(value) => setCurrentRedirection({
                  ...(currentRedirection as Redirection),
                  type: value
                })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Type de redirection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Redirection permanente</SelectItem>
                  <SelectItem value="302">302 - Redirection temporaire</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                301 pour une redirection permanente (recommandé), 302 pour une redirection temporaire
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingRedirection(false);
              setIsEditingRedirection(false);
              setCurrentRedirection(null);
            }}>
              Annuler
            </Button>
            <Button onClick={handleSaveRedirection}>
              {isAddingRedirection ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog 
        open={redirectionToDelete !== null} 
        onOpenChange={(open) => {
          if (!open) setRedirectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cette redirection sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRedirection} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RedirectionManager;
