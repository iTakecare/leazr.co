
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
  table_schema name,
  table_name name,
  column_name name,
  data_type text,
  is_nullable boolean,
  column_default text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_schema::name,
    c.table_name::name,
    c.column_name::name,
    c.data_type,
    (c.is_nullable = 'YES') AS is_nullable,
    c.column_default
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' 
    AND c.table_name = get_table_columns.table_name;
END;
$$;
