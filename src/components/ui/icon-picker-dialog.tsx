import { useState } from 'react';
import * as icons from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Liste des icônes courantes à afficher
const COMMON_ICONS = [
  'Heart', 'Star', 'TrendingUp', 'Award', 'Target', 
  'Zap', 'Shield', 'Users', 'UserCheck', 'ThumbsUp',
  'Laptop', 'Smartphone', 'Monitor', 'HardDrive', 'Wifi',
  'Leaf', 'Recycle', 'Wind', 'Sun', 'Battery',
  'DollarSign', 'TrendingDown', 'PieChart', 'BarChart', 'Activity',
  'Clock', 'Calendar', 'MapPin', 'Globe', 'Home',
  'Briefcase', 'Building', 'Building2', 'Store', 'Factory',
  'Phone', 'Mail', 'MessageCircle', 'Send', 'Share2',
  'Settings', 'Tool', 'Wrench', 'Cog', 'Package',
  'Truck', 'Box', 'ShoppingCart', 'CreditCard', 'Wallet',
  'Sparkles', 'CheckCircle', 'XCircle', 'AlertCircle', 'Info',
  'Search', 'Filter', 'Edit', 'Trash', 'Download',
  'Upload', 'File', 'FileText', 'Image', 'Video',
  'Music', 'Headphones', 'Camera', 'Printer', 'Cpu',
];

interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon: string | undefined;
  onSelectIcon: (iconName: string | undefined) => void;
}

export function IconPickerDialog({ 
  open, 
  onOpenChange, 
  selectedIcon, 
  onSelectIcon 
}: IconPickerDialogProps) {
  const [search, setSearch] = useState('');
  
  // Filtrage des icônes basé sur la recherche
  const filteredIcons = COMMON_ICONS.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choisir une icône</DialogTitle>
          <DialogDescription>
            Sélectionnez une icône pour votre métrique
          </DialogDescription>
        </DialogHeader>
        
        {/* Barre de recherche */}
        <div className="space-y-4">
          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          {/* Grille d'icônes */}
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-6 gap-4 p-4">
              {filteredIcons.map((iconName) => {
                const IconComponent = icons[iconName as keyof typeof icons] as React.ComponentType<{ className?: string }>;
                const isSelected = selectedIcon === iconName;
                
                if (!IconComponent) return null;
                
                return (
                  <button
                    key={iconName}
                    onClick={() => {
                      onSelectIcon(iconName);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                  >
                    <IconComponent className="h-6 w-6" />
                    <span className="text-xs text-center break-words w-full">{iconName}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onSelectIcon(undefined);
              onOpenChange(false);
            }}
          >
            Supprimer l'icône
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
