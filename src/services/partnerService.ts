import { supabase } from "@/integrations/supabase/client";
import type { Partner, CreatePartnerData, PartnerPack, PartnerPackOption, PartnerProviderLink } from "@/types/partner";

// ============================================
// PARTNERS CRUD
// ============================================

export const fetchPartners = async (companyId: string): Promise<Partner[]> => {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;
  return (data || []) as Partner[];
};

export const createPartner = async (companyId: string, partner: CreatePartnerData): Promise<Partner> => {
  const { data, error } = await supabase
    .from("partners")
    .insert({ ...partner, company_id: companyId })
    .select()
    .single();

  if (error) throw error;
  return data as Partner;
};

export const updatePartner = async (id: string, updates: Partial<CreatePartnerData>): Promise<Partner> => {
  const { data, error } = await supabase
    .from("partners")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Partner;
};

export const deletePartner = async (id: string): Promise<void> => {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) throw error;
};

// ============================================
// PARTNER PACKS
// ============================================

export const fetchPartnerPacks = async (partnerId: string): Promise<PartnerPack[]> => {
  const { data, error } = await supabase
    .from("partner_packs")
    .select("*, pack:product_packs(id, name, description, image_url, total_monthly_price, pack_monthly_price, is_active)")
    .eq("partner_id", partnerId)
    .order("position");

  if (error) throw error;
  return (data || []) as unknown as PartnerPack[];
};

export const addPartnerPack = async (partnerId: string, packId: string, position: number = 0): Promise<PartnerPack> => {
  const { data, error } = await supabase
    .from("partner_packs")
    .insert({ partner_id: partnerId, pack_id: packId, position })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PartnerPack;
};

export const updatePartnerPack = async (id: string, updates: { is_customizable?: boolean; position?: number }): Promise<void> => {
  const { error } = await supabase.from("partner_packs").update(updates).eq("id", id);
  if (error) throw error;
};

export const removePartnerPack = async (id: string): Promise<void> => {
  const { error } = await supabase.from("partner_packs").delete().eq("id", id);
  if (error) throw error;
};

// ============================================
// PARTNER PACK OPTIONS
// ============================================

export const fetchPartnerPackOptions = async (partnerPackId: string): Promise<PartnerPackOption[]> => {
  const { data, error } = await supabase
    .from("partner_pack_options")
    .select("*")
    .eq("partner_pack_id", partnerPackId)
    .order("position");

  if (error) throw error;
  return (data || []) as unknown as PartnerPackOption[];
};

export const upsertPartnerPackOption = async (option: Omit<PartnerPackOption, 'id'> & { id?: string }): Promise<void> => {
  const { error } = await supabase.from("partner_pack_options").upsert(option as any);
  if (error) throw error;
};

export const deletePartnerPackOption = async (id: string): Promise<void> => {
  const { error } = await supabase.from("partner_pack_options").delete().eq("id", id);
  if (error) throw error;
};

// ============================================
// PARTNER PROVIDER LINKS
// ============================================

export const fetchPartnerProviderLinks = async (partnerId: string): Promise<PartnerProviderLink[]> => {
  const { data, error } = await supabase
    .from("partner_provider_links")
    .select("*, provider:external_providers(id, name, logo_url, website_url, description, is_active)")
    .eq("partner_id", partnerId)
    .order("position");

  if (error) throw error;
  return (data || []) as unknown as PartnerProviderLink[];
};

export const addPartnerProviderLink = async (
  partnerId: string,
  providerId: string,
  cardTitle: string,
  selectedProductIds: string[] = [],
  position: number = 0
): Promise<void> => {
  const { error } = await supabase.from("partner_provider_links").insert({
    partner_id: partnerId,
    provider_id: providerId,
    card_title: cardTitle,
    selected_product_ids: selectedProductIds,
    position,
  });
  if (error) throw error;
};

export const updatePartnerProviderLink = async (
  id: string,
  updates: { card_title?: string; selected_product_ids?: string[]; position?: number }
): Promise<void> => {
  const { error } = await supabase.from("partner_provider_links").update(updates).eq("id", id);
  if (error) throw error;
};

export const removePartnerProviderLink = async (id: string): Promise<void> => {
  const { error } = await supabase.from("partner_provider_links").delete().eq("id", id);
  if (error) throw error;
};

// ============================================
// SLUG HELPER
// ============================================

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};
