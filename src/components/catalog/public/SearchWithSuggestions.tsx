
import React, { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const SearchWithSuggestions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to catalog with search term as query parameter
      navigate(`?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full rounded-full border border-gray-200 py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30 text-gray-700"
        />
      </form>
    </div>
  );
};
