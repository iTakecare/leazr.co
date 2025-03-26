
import React from "react";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

interface ProductTypeTabsProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
}

const ProductTypeTabs: React.FC<ProductTypeTabsProps> = ({ 
  selectedTab, 
  setSelectedTab 
}) => {
  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
      <TabsList className="w-full">
        <TabsTrigger value="tous" className="flex-1">Tous</TabsTrigger>
        <TabsTrigger value="parents" className="flex-1">Parents</TabsTrigger>
        <TabsTrigger value="variantes" className="flex-1">Variantes</TabsTrigger>
        <TabsTrigger value="individuels" className="flex-1">Individuels</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ProductTypeTabs;
