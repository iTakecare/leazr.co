-- kpi_run_query : exécution SQL en LECTURE SEULE pour l'Analyste KPI (edge function kpi-ai).
-- Garde-fous : SELECT/WITH uniquement, une seule instruction, blacklist de mots-clés,
-- transaction read-only, timeout 20s, résultat plafonné à 200 lignes (agréger en SQL).
-- Exécutable uniquement par service_role (l'edge function vérifie le rôle admin
-- et impose le filtre company_id avant d'appeler cette fonction).

CREATE OR REPLACE FUNCTION public.kpi_run_query(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_result jsonb;
BEGIN
  v_sql := btrim(p_sql);
  -- retirer un éventuel ';' final
  v_sql := regexp_replace(v_sql, ';\s*$', '');

  IF v_sql !~* '^(select|with)\M' THEN
    RAISE EXCEPTION 'Requête refusée : seules les requêtes SELECT / WITH sont autorisées';
  END IF;
  IF position(';' in v_sql) > 0 THEN
    RAISE EXCEPTION 'Requête refusée : une seule instruction SQL à la fois';
  END IF;
  IF v_sql ~* '\m(insert|update|delete|truncate|drop|alter|create|grant|revoke|copy|vacuum|call|do|execute|set|reset|listen|notify|comment|refresh|lock|pg_sleep|pg_terminate_backend|pg_cancel_backend|dblink|pg_read_file|pg_ls_dir|lo_import|lo_export)\M' THEN
    RAISE EXCEPTION 'Requête refusée : mot-clé non autorisé détecté';
  END IF;

  PERFORM set_config('transaction_read_only', 'on', true);
  PERFORM set_config('statement_timeout', '20000', true);

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (SELECT * FROM (%s) kpi_sub LIMIT 200) t',
    v_sql
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.kpi_run_query(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kpi_run_query(text) FROM anon;
REVOKE ALL ON FUNCTION public.kpi_run_query(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_run_query(text) TO service_role;
