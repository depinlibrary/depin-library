
-- Enable trigram extension for title similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to check for duplicate forecasts
CREATE OR REPLACE FUNCTION public.check_forecast_duplicate(
  p_project_a_id uuid,
  p_project_b_id uuid,
  p_dimension text,
  p_end_date timestamptz,
  p_title text,
  p_creator_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  is_duplicate boolean,
  duplicate_type text,
  duplicate_forecast_id uuid,
  duplicate_title text,
  similarity_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check 1: Structural duplicate (same projects + dimension + overlapping timeframe)
  RETURN QUERY
  SELECT 
    true AS is_duplicate,
    'structural'::text AS duplicate_type,
    f.id AS duplicate_forecast_id,
    f.title AS duplicate_title,
    1.0::numeric AS similarity_score
  FROM forecasts f
  JOIN forecast_targets ft ON ft.forecast_id = f.id
  WHERE f.project_a_id = p_project_a_id
    AND (
      (p_project_b_id IS NULL AND f.project_b_id IS NULL)
      OR f.project_b_id = p_project_b_id
    )
    AND ft.dimension = p_dimension
    AND f.end_date > now()
    AND p_end_date > now()
    -- Overlapping: the new forecast ends after existing starts, and existing ends after new starts
    AND f.status = 'active'
  LIMIT 1;

  -- If structural match found, stop
  IF FOUND THEN RETURN; END IF;

  -- Check 2: Title similarity (>= 0.5 trigram similarity on same project)
  RETURN QUERY
  SELECT 
    true AS is_duplicate,
    'title_similar'::text AS duplicate_type,
    f.id AS duplicate_forecast_id,
    f.title AS duplicate_title,
    similarity(lower(p_title), lower(f.title))::numeric AS similarity_score
  FROM forecasts f
  WHERE f.project_a_id = p_project_a_id
    AND f.end_date > now()
    AND f.status = 'active'
    AND similarity(lower(p_title), lower(f.title)) >= 0.5
  ORDER BY similarity(lower(p_title), lower(f.title)) DESC
  LIMIT 1;

  -- If title match found, stop
  IF FOUND THEN RETURN; END IF;

  -- No duplicate found
  RETURN QUERY SELECT false, NULL::text, NULL::uuid, NULL::text, 0.0::numeric;
END;
$$;
