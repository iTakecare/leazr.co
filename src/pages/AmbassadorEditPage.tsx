
const loadAmbassador = useCallback(async () => {
  if (!id) return;
  
  try {
    setLoading(true);
    console.log("[loadAmbassador] Chargement des données de l'ambassadeur:", id);
    const ambassadorData = await getAmbassadorById(id);
    
    if (!ambassadorData) {
      console.error("[loadAmbassador] Ambassadeur introuvable");
      toast.error("Ambassadeur introuvable");
      navigate("/ambassadors");
      return;
    }
    
    console.log("[loadAmbassador] Données chargées:", ambassadorData);
    setAmbassador(ambassadorData);
    
    form.reset({
      name: ambassadorData.name,
      email: ambassadorData.email,
      phone: ambassadorData.phone || "",
      status: ambassadorData.status as "active" | "inactive",
      notes: ambassadorData.notes || "",
      company: ambassadorData.company || "",
      vat_number: ambassadorData.vat_number || "",
      address: ambassadorData.address || "",
      city: ambassadorData.city || "",
      postal_code: ambassadorData.postal_code || "",
      country: ambassadorData.country || ""
    });
    
    await loadCommissionLevels();
    
    if (ambassadorData.commission_level_id) {
      console.log("[loadAmbassador] Setting current level ID:", ambassadorData.commission_level_id);
      setCurrentLevelId(ambassadorData.commission_level_id);
      await loadCommissionLevel(ambassadorData.commission_level_id);
    } else {
      console.warn("[loadAmbassador] No commission level ID in ambassador data");
      setCurrentLevelId("");
      setCommissionLevel(null);
    }
    
    await loadPDFTemplates();
    
    if (ambassadorData.pdf_template_id) {
      setSelectedTemplateId(ambassadorData.pdf_template_id);
    } else {
      setSelectedTemplateId("default");
    }
    
  } catch (error: any) {
    console.error("[loadAmbassador] Erreur:", error);
    
    if (error.message && error.message.includes("invalid input syntax for type uuid")) {
      setError("L'identifiant fourni n'est pas valide");
      toast.error("ID d'ambassadeur invalide");
    } else {
      setError("Erreur lors du chargement de l'ambassadeur");
      toast.error("Erreur lors du chargement de l'ambassadeur");
    }
    
    setTimeout(() => navigate("/ambassadors"), 2000);
  } finally {
    setLoading(false);
  }
}, [id, navigate, form]);
