
-- Function to update company metrics on equipment insert
CREATE OR REPLACE FUNCTION public.update_company_metrics_on_equipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_category text;
  v_co2_kg numeric;
  v_title text;
BEGIN
  -- Get company_id from contract
  SELECT c.company_id INTO v_company_id
  FROM contracts c
  WHERE c.id = NEW.contract_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := lower(NEW.title);

  -- Categorize by title keywords
  IF v_title ~* '(macbook|thinkpad|latitude|elitebook|zbook|probook|laptop|portable|notebook|zenbook|vivobook|ideapad|pavilion|envy|spectre|chromebook)' THEN
    v_category := 'laptop';
  ELSIF v_title ~* '(imac|optiplex|prodesk|desktop|fixe|mini pc|mac mini|mac studio|mac pro|nuc)' THEN
    v_category := 'desktop';
  ELSIF v_title ~* '(iphone|samsung galaxy s|samsung galaxy a|smartphone|pixel|galaxy z|redmi|poco)' THEN
    v_category := 'smartphone';
  ELSIF v_title ~* '(ipad|galaxy tab|surface go|surface pro|tablette|tablet|mediapad|matepad)' THEN
    v_category := 'tablet';
  ELSE
    -- Not a device, skip
    RETURN NEW;
  END IF;

  -- Try to get CO2 from category_environmental_data
  SELECT ced.co2_savings_kg INTO v_co2_kg
  FROM category_environmental_data ced
  JOIN categories cat ON cat.id = ced.category_id
  WHERE ced.company_id = v_company_id
    AND lower(cat.name) = v_category
  LIMIT 1;

  -- Fallback values
  IF v_co2_kg IS NULL OR v_co2_kg = 0 THEN
    v_co2_kg := CASE v_category
      WHEN 'laptop' THEN 170
      WHEN 'desktop' THEN 170
      WHEN 'smartphone' THEN 45
      WHEN 'tablet' THEN 87
      ELSE 0
    END;
  END IF;

  -- Update company metrics (co2_saved is in tonnes)
  UPDATE companies
  SET devices_count = COALESCE(devices_count, 0) + NEW.quantity,
      co2_saved = COALESCE(co2_saved, 0) + (v_co2_kg * NEW.quantity / 1000.0),
      updated_at = now()
  WHERE id = v_company_id;

  RETURN NEW;
END;
$$;

-- Function to handle equipment deletion (decrement)
CREATE OR REPLACE FUNCTION public.decrement_company_metrics_on_equipment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_category text;
  v_co2_kg numeric;
  v_title text;
BEGIN
  SELECT c.company_id INTO v_company_id
  FROM contracts c
  WHERE c.id = OLD.contract_id;

  IF v_company_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_title := lower(OLD.title);

  IF v_title ~* '(macbook|thinkpad|latitude|elitebook|zbook|probook|laptop|portable|notebook|zenbook|vivobook|ideapad|pavilion|envy|spectre|chromebook)' THEN
    v_category := 'laptop';
  ELSIF v_title ~* '(imac|optiplex|prodesk|desktop|fixe|mini pc|mac mini|mac studio|mac pro|nuc)' THEN
    v_category := 'desktop';
  ELSIF v_title ~* '(iphone|samsung galaxy s|samsung galaxy a|smartphone|pixel|galaxy z|redmi|poco)' THEN
    v_category := 'smartphone';
  ELSIF v_title ~* '(ipad|galaxy tab|surface go|surface pro|tablette|tablet|mediapad|matepad)' THEN
    v_category := 'tablet';
  ELSE
    RETURN OLD;
  END IF;

  SELECT ced.co2_savings_kg INTO v_co2_kg
  FROM category_environmental_data ced
  JOIN categories cat ON cat.id = ced.category_id
  WHERE ced.company_id = v_company_id
    AND lower(cat.name) = v_category
  LIMIT 1;

  IF v_co2_kg IS NULL OR v_co2_kg = 0 THEN
    v_co2_kg := CASE v_category
      WHEN 'laptop' THEN 170
      WHEN 'desktop' THEN 170
      WHEN 'smartphone' THEN 45
      WHEN 'tablet' THEN 87
      ELSE 0
    END;
  END IF;

  UPDATE companies
  SET devices_count = GREATEST(COALESCE(devices_count, 0) - OLD.quantity, 0),
      co2_saved = GREATEST(COALESCE(co2_saved, 0) - (v_co2_kg * OLD.quantity / 1000.0), 0),
      updated_at = now()
  WHERE id = v_company_id;

  RETURN OLD;
END;
$$;

-- Triggers
CREATE TRIGGER trg_update_metrics_on_equipment_insert
  AFTER INSERT ON contract_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_company_metrics_on_equipment();

CREATE TRIGGER trg_decrement_metrics_on_equipment_delete
  AFTER DELETE ON contract_equipment
  FOR EACH ROW
  EXECUTE FUNCTION decrement_company_metrics_on_equipment_delete();
