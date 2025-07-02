import { useState, useEffect } from "react";
import { getOfferEquipment } from "@/services/offers/offerEquipment";
import { OfferEquipment } from "@/types/offerEquipment";

export const useOfferEquipment = (offerId?: string) => {
  const [equipment, setEquipment] = useState<OfferEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    if (!offerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getOfferEquipment(offerId);
      setEquipment(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur lors de la récupération des équipements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [offerId]);

  const refresh = () => {
    fetchEquipment();
  };

  return { equipment, loading, error, refresh };
};