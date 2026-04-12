
ALTER TABLE public.token_market_data
ADD COLUMN volume_24h numeric DEFAULT NULL,
ADD COLUMN fully_diluted_valuation numeric DEFAULT NULL;
