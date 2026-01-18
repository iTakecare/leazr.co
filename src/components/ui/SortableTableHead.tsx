import React from "react";
import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface SortableTableHeadProps<T extends string> {
  column: T;
  label: string;
  currentSort: T;
  direction: 'asc' | 'desc';
  onSort: (column: T) => void;
  className?: string;
}

export function SortableTableHead<T extends string>({
  column,
  label,
  currentSort,
  direction,
  onSort,
  className = "",
}: SortableTableHeadProps<T>) {
  const isActive = currentSort === column;
  
  return (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 transition-colors select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}
