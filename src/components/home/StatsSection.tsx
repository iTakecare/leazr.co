
import React from "react";
import Container from "@/components/layout/Container";

const StatsSection = () => {
  return (
    <section className="py-16 bg-gray-50">
      <Container maxWidth="custom">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#48B5C3]/10 rounded-full mb-4">
              <span className="text-[#48B5C3] font-bold text-2xl">95%</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Satisfaction client</h3>
            <p className="text-gray-600">
              Nos clients sont ravis de la qualité de nos produits et services.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#48B5C3]/10 rounded-full mb-4">
              <span className="text-[#48B5C3] font-bold text-2xl">70%</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Économies réalisées</h3>
            <p className="text-gray-600">
              Économies moyennes par rapport à l'achat de matériel neuf.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#48B5C3]/10 rounded-full mb-4">
              <span className="text-[#48B5C3] font-bold text-2xl">-80%</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Empreinte carbone</h3>
            <p className="text-gray-600">
              Réduction de l'impact environnemental par rapport au neuf.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default StatsSection;
