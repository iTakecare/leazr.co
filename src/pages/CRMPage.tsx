import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import CompanyCRM from "@/components/crm/CompanyCRM";
import { MobileCRMPage } from "@/components/mobile/pages";

const CRMPage = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileCRMPage />;
  }

  return <CompanyCRM />;
};

export default CRMPage;
