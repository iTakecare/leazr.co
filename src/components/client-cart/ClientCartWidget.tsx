
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useClientCart } from '@/context/ClientCartContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface ClientCartWidgetProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

const ClientCartWidget: React.FC<ClientCartWidgetProps> = ({ 
  variant = 'outline' 
}) => {
  const { getTotalItems } = useClientCart();
  const itemCount = getTotalItems();

  return (
    <Button 
      variant={variant} 
      size="sm" 
      asChild
      className="relative"
    >
      <Link to="/client/requests?action=view-cart">
        <ShoppingCart className="h-4 w-4 mr-1" />
        <span>Mon panier</span>
        {itemCount > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0"
          >
            {itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
};

export default ClientCartWidget;
