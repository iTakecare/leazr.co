
import React from "react";

interface DebugInfoProps {
  currentPage: number;
  zoomLevel: number;
  pageWidth: number;
  pageHeight: number;
  fields?: any[];
  sampleData?: any;
  localTemplate?: any;
}

const DebugInfo: React.FC<DebugInfoProps> = ({
  currentPage,
  zoomLevel,
  pageWidth,
  pageHeight,
  fields = [],
  sampleData = {},
  localTemplate = {}
}) => {
  return (
    <div className="p-2 bg-gray-100 border rounded text-xs mt-2">
      <details>
        <summary className="font-medium">Debug Information</summary>
        <div className="mt-2 space-y-1">
          <p><strong>Current Page:</strong> {currentPage + 1}</p>
          <p><strong>Zoom Level:</strong> {Math.round(zoomLevel * 100)}%</p>
          <p><strong>Canvas Size:</strong> {pageWidth.toFixed(0)}px × {pageHeight.toFixed(0)}px</p>
          <p><strong>PDF Fields on Page:</strong> {fields?.length || 0}</p>
        </div>
      </details>
    </div>
  );
};

export default DebugInfo;
