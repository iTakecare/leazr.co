
import React from "react";
import MainNavigation from "@/components/layout/MainNavigation";

const ProductLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <MainNavigation />
      </div>
      <div className="container mx-auto px-4 py-8 mt-24">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductLoadingState;
