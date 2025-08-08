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

    console.log("🔥 EQUIPMENT HOOK - Starting fetchEquipment for offer:", offerId);
    setLoading(true);
    setError(null);

    try {
      const data = await getOfferEquipment(offerId);
      console.log("🔥 EQUIPMENT HOOK - Equipment data received:", data?.length, "items");
      setEquipment(data);
    } catch (err: any) {
      console.error("🔥 EQUIPMENT HOOK - Error fetching equipment:", err);
      setError(err.message || "Erreur lors de la récupération des équipements");
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