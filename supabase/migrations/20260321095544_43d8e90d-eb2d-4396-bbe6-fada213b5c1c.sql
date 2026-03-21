
-- Add prediction target and direction columns to forecasts
ALTER TABLE public.forecasts 
ADD COLUMN prediction_target numeric NULL,
ADD COLUMN prediction_direction text NULL,
ADD COLUMN start_price numeric NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.forecasts.prediction_target IS 'Target price/market cap for token_price/market_cap forecasts';
COMMENT ON COLUMN public.forecasts.prediction_direction IS 'long or short - only for token_price/market_cap forecasts';
COMMENT ON COLUMN public.forecasts.start_price IS 'Price/market cap at time of forecast creation';
