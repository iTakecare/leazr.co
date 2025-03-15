
import React, { useEffect } from "react";
import AmbassadorEditForm from "@/components/crm/forms/AmbassadorEditForm";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AmbassadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      toast.error("ID d'ambassadeur non spécifié");
      navigate("/ambassadors");
    }
  }, [id, navigate]);

  return <AmbassadorEditForm />;
};

export default AmbassadorEditPage;
