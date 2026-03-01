import React from "react";
import { Package, CheckSquare, Wrench, Truck, Archive, Trash2 } from "lucide-react";
import { useStockCounts } from "@/hooks/useStockItems";

const StockDashboard: React.FC = () => {
  const { counts, isLoading } = useStockCounts();

  const cards = [
    { label: "Total", value: counts.total, icon: Package, color: "text-foreground", bg: "bg-muted" },
    { label: "En stock", value: counts.in_stock, icon: Archive, color: "text-green-700", bg: "bg-green-50" },
    { label: "Attribués", value: counts.assigned, icon: CheckSquare, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "Commandés", value: counts.ordered, icon: Truck, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "En réparation", value: counts.in_repair, icon: Wrench, color: "text-orange-700", bg: "bg-orange-50" },
    { label: "Rebut", value: counts.scrapped, icon: Trash2, color: "text-red-700", bg: "bg-red-50" },
  ];

  if (isLoading) {
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(card => (
        <div key={card.label} className={`${card.bg} rounded-xl p-4 border`}>
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StockDashboard;
