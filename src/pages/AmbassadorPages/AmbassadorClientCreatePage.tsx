
import React from "react";
import AmbassadorLayout from "@/components/layout/AmbassadorLayout";
import AmbassadorClientForm from "@/components/ambassador/AmbassadorClientForm";

const AmbassadorClientCreatePage = () => {
  return (
    <AmbassadorLayout>
      <div className="w-full">
        <AmbassadorClientForm />
      </div>
    </AmbassadorLayout>
  );
};

export default AmbassadorClientCreatePage;
