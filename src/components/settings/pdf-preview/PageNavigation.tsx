
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  setCurrentPage
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
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
        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage === totalPages - 1}
        className="h-8 w-8 bg-white bg-opacity-75"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PageNavigation;
