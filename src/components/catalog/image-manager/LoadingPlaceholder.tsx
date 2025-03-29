
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingPlaceholder: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center h-10">
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
};

export default LoadingPlaceholder;
