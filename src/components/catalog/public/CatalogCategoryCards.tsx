import React from "react";
import { 
  Laptop, Smartphone, Monitor, Tablet, Headphones, 
  AppWindow, MonitorDot, Package, Keyboard, Mouse,
  Cpu, HardDrive, Printer, Cable
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  name: string;
  label: string;
  icon: string;
  count: number;
}

interface CatalogCategoryCardsProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

const categoryConfig: Record<string, { icon: React.ElementType; bgColor: string; iconColor: string }> = {
  laptop: { icon: Laptop, bgColor: "bg-teal-50", iconColor: "text-teal-600" },
  desktop: { icon: MonitorDot, bgColor: "bg-slate-100", iconColor: "text-slate-600" },
  smartphone: { icon: Smartphone, bgColor: "bg-rose-50", iconColor: "text-rose-500" },
  display: { icon: Monitor, bgColor: "bg-blue-50", iconColor: "text-blue-600" },
  tablet: { icon: Tablet, bgColor: "bg-amber-50", iconColor: "text-amber-600" },
  accessory: { icon: Headphones, bgColor: "bg-violet-50", iconColor: "text-violet-600" },
  peripheral: { icon: Keyboard, bgColor: "bg-indigo-50", iconColor: "text-indigo-600" },
  software: { icon: AppWindow, bgColor: "bg-emerald-50", iconColor: "text-emerald-600" },
  other: { icon: Package, bgColor: "bg-gray-50", iconColor: "text-gray-600" },
};

const CatalogCategoryCards: React.FC<CatalogCategoryCardsProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  const getConfig = (name: string) => {
    return categoryConfig[name] || categoryConfig.other;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Catégories</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* All categories */}
        <button
          onClick={() => onCategorySelect(null)}
          className={cn(
            "flex flex-col items-center gap-2 min-w-[90px] px-4 py-3 rounded-xl border-2 transition-all hover:shadow-md",
            selectedCategory === null
              ? "border-[#4ab6c4] bg-teal-50/50 shadow-sm"
              : "border-transparent bg-card hover:border-border"
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-teal-600" />
          </div>
          <span className="text-xs font-medium text-foreground whitespace-nowrap">Tous</span>
        </button>

        {categories.map((category) => {
          const config = getConfig(category.name);
          const IconComponent = config.icon;
          const isSelected = selectedCategory === category.name;

          return (
            <button
              key={category.name}
              onClick={() => onCategorySelect(category.name)}
              className={cn(
                "relative flex flex-col items-center gap-2 min-w-[90px] px-4 py-3 rounded-xl border-2 transition-all hover:shadow-md",
                isSelected
                  ? "border-[#4ab6c4] bg-teal-50/50 shadow-sm"
                  : "border-transparent bg-card hover:border-border"
              )}
            >
              {/* Count badge */}
              <span className="absolute -top-1.5 -right-1.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                {category.count}
              </span>

              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgColor)}>
                <IconComponent className={cn("w-5 h-5", config.iconColor)} />
              </div>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {category.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogCategoryCards;
