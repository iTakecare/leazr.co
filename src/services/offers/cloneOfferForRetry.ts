import { supabase } from "@/integrations/supabase/client";

const FIELDS_TO_CLONE = [
  "ambassador_id",
  "amount",
  "annual_insurance",
  "billing_entity_id",
  "business_sector",
  "client_email",
  "client_id",
  "client_name",
  "coefficient",
  "commission",
  "company_id",
  "contract_duration",
  "contract_terms",
  "discount_amount",
  "discount_type",
  "discount_value",
  "down_payment",
  "duration",
  "equipment_description",
  "estimated_budget",
  "file_fee",
  "financed_amount",
  "is_purchase",
  "leaser_id",
  "margin",
  "margin_difference",
  "monthly_payment",
  "monthly_payment_before_discount",
  "pack_id",
  "partner_name",
  "partner_slug",
  "products_to_be_determined",
  "remarks",
  "source",
  "total_margin_with_difference",
  "type",
  "user_id",
  "workflow_template_id",
] as const;

const EQUIPMENT_FIELDS_TO_CLONE = [
  "coefficient",
  "collaborator_id",
  "custom_pack_id",
  "delivery_address",
  "delivery_city",
  "delivery_contact_email",
  "delivery_contact_name",
  "delivery_contact_phone",
  "delivery_country",
  "delivery_notes",
  "delivery_postal_code",
  "delivery_site_id",
  "delivery_type",
  "discount_amount",
  "discount_type",
  "discount_value",
  "duration",
  "image_url",
  "is_part_of_custom_pack",
  "margin",
  "monthly_payment",
  "monthly_payment_before_discount",
  "original_unit_price",
  "pack_discount_percentage",
  "product_id",
  "purchase_price",
  "quantity",
  "selling_price",
  "supplier_id",
  "supplier_price",
  "title",
  "variant_id",
] as const;

interface CloneOfferForRetryResult {
  newOfferId: string;
  newDossierNumber: string;
}

/**
 * Crée une nouvelle offre en re-soumission à partir d'une offre refusée.
 * Lien de traçabilité posé via offers.previous_offer_id.
 * La nouvelle offre repart en workflow_status='draft' avec scores réinitialisés
 * et rejection_category=null. Les équipements (+ attributs/specs) sont dupliqués.
 */
export const cloneOfferForRetry = async (
  originalOfferId: string
): Promise<CloneOfferForRetryResult | null> => {
  try {
    const { data: original, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", originalOfferId)
      .maybeSingle();

    if (fetchError || !original) {
      console.error("Offre originale introuvable:", fetchError);
      return null;
    }

    const cloned: Record<string, any> = {};
    for (const field of FIELDS_TO_CLONE) {
      cloned[field] = (original as any)[field] ?? null;
    }

    cloned.previous_offer_id = originalOfferId;
    cloned.workflow_status = "draft";
    cloned.status = "draft";
    cloned.internal_score = null;
    cloned.leaser_score = null;
    cloned.rejection_category = null;
    cloned.converted_to_contract = false;
    cloned.signature_data = null;
    cloned.signed_at = null;
    cloned.signer_ip = null;
    cloned.signer_name = null;
    cloned.commission_paid_at = null;
    cloned.commission_status = null;
    cloned.leaser_request_number = null;

    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    cloned.dossier_number = `ITC-${year}-OFF-${timestamp}`;

    const { data: insertedRows, error: insertError } = await supabase
      .from("offers")
      .insert([cloned])
      .select("id, dossier_number");

    if (insertError || !insertedRows?.[0]) {
      console.error("Echec d'insertion de l'offre clonée:", insertError);
      return null;
    }

    const newOfferId = insertedRows[0].id;
    const newDossierNumber = insertedRows[0].dossier_number ?? cloned.dossier_number;

    const { data: originalEquipment, error: equipError } = await supabase
      .from("offer_equipment")
      .select("*")
      .eq("offer_id", originalOfferId);

    if (equipError) {
      console.error("Erreur lors de la lecture des équipements originaux:", equipError);
    }

    if (originalEquipment && originalEquipment.length > 0) {
      const newEquipmentRows = originalEquipment.map((eq) => {
        const row: Record<string, any> = { offer_id: newOfferId };
        for (const field of EQUIPMENT_FIELDS_TO_CLONE) {
          row[field] = (eq as any)[field] ?? null;
        }
        return row;
      });

      const { data: insertedEquipment, error: insertEquipError } = await supabase
        .from("offer_equipment")
        .insert(newEquipmentRows)
        .select("id");

      if (insertEquipError) {
        console.error("Erreur lors de la duplication des équipements:", insertEquipError);
      } else if (insertedEquipment) {
        for (let i = 0; i < originalEquipment.length; i++) {
          const oldEqId = originalEquipment[i].id;
          const newEqId = insertedEquipment[i]?.id;
          if (!newEqId) continue;

          const [{ data: attrs }, { data: specs }] = await Promise.all([
            supabase.from("offer_equipment_attributes").select("key, value").eq("equipment_id", oldEqId),
            supabase.from("offer_equipment_specifications").select("key, value").eq("equipment_id", oldEqId),
          ]);

          if (attrs && attrs.length > 0) {
            await supabase
              .from("offer_equipment_attributes")
              .insert(attrs.map((a) => ({ equipment_id: newEqId, key: a.key, value: a.value })));
          }
          if (specs && specs.length > 0) {
            await supabase
              .from("offer_equipment_specifications")
              .insert(specs.map((s) => ({ equipment_id: newEqId, key: s.key, value: s.value })));
          }
        }
      }
    }

    return { newOfferId, newDossierNumber };
  } catch (error) {
    console.error("Erreur dans cloneOfferForRetry:", error);
    return null;
  }
};
