
import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface TabItem {
  id: string;
  label: string;
}

interface EquipmentTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const EquipmentTabs: React.FC<EquipmentTabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange 
}) => {
  return (
    <div className="flex border-b space-x-1 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          className={cn(
            "rounded-none border-b-2 px-4", 
            activeTab === tab.id 
              ? "border-primary text-primary font-medium" 
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
};

export default EquipmentTabs;
