
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";

const ClientITakecarePage = () => {
  return (
    <PageTransition>
      <div className="bg-[#008080] min-h-screen overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto bg-[#C0C7C8] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]">
          <div className="w-full h-8 flex items-center justify-between bg-[#000080] text-white px-2">
            <span className="text-md font-bold">iTakecare - Configurateur de pack</span>
            <div className="flex space-x-1">
              <button className="w-5 h-5 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">_</button>
              <button className="w-5 h-5 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">■</button>
              <button className="w-5 h-5 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">✕</button>
            </div>
          </div>
          <div className="p-4">
            <ITakecarePack />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ClientITakecarePage;
