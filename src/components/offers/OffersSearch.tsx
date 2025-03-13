
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface OffersSearchProps {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}

const OffersSearch = ({ searchTerm, setSearchTerm }: OffersSearchProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Rechercher..."
        className="pl-8 w-full sm:w-[200px]"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

export default OffersSearch;
