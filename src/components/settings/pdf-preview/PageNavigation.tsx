
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PageNavigationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  setCurrentPage,
  totalPages
}) => {
  if (totalPages <= 1) return null;

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={prevPage}
        disabled={currentPage === 0}
        className="h-8 w-8 bg-white bg-opacity-75"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <span className="flex items-center justify-center text-sm px-2 bg-white bg-opacity-75 rounded">
        {currentPage + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={nextPage}
        disabled={currentPage === totalPages - 1}
        className="h-8 w-8 bg-white bg-opacity-75"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PageNavigation;
