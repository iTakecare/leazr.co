
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { processMarkdownToHtml } from "@/lib/utils";

interface ProductDescriptionProps {
  title: string;
  description: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ title, description }) => {
  const [expanded, setExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (contentRef.current) {
      // Check if the content is long enough to need expansion
      const isContentLong = contentRef.current.scrollHeight > 150;
      setShowExpandButton(isContentLong);
      
      // If it's short, just expand it by default
      if (!isContentLong) {
        setExpanded(true);
      }
    }
  }, [description]);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Process markdown to HTML
  const processedDescription = description ? processMarkdownToHtml(description) : null;
  
  return (
    <div className="mt-6 bg-white rounded-xl border border-[#4ab6c4]/30 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Info className="h-5 w-5 mr-2 text-white" />
          {title}
        </h2>
      </div>
      
      <div className="relative overflow-hidden">
        <div 
          ref={contentRef}
          className={`text-gray-700 p-6 transition-all duration-300 ${!expanded && showExpandButton ? 'max-h-[150px]' : ''}`}
        >
          {processedDescription ? (
            <div 
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-strong:text-gray-900 prose-p:text-gray-700"
              dangerouslySetInnerHTML={{ __html: processedDescription }}
            />
          ) : (
            <p className="text-gray-500 italic">Aucune description disponible pour ce produit.</p>
          )}
        </div>
        
        {showExpandButton && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        )}
      </div>
      
      {showExpandButton && (
        <button 
          onClick={toggleExpanded}
          className="w-full flex items-center justify-center p-3 text-[#33638e] hover:text-[#da2959] transition-colors border-t border-[#4ab6c4]/20 bg-[#4ab6c4]/5"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              <span>Réduire</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              <span>Voir plus</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductDescription;
