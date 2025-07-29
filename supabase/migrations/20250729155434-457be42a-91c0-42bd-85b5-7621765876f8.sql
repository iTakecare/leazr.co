-- Add public read policy for product_pack_items to allow viewing items of public packs
CREATE POLICY "product_pack_items_public_read" ON "public"."product_pack_items"
AS PERMISSIVE FOR SELECT
TO public
USING (
  pack_id IN (
    SELECT id FROM product_packs 
    WHERE is_active = true AND admin_only = false
  )
);