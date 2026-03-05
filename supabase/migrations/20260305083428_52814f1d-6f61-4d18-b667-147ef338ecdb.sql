
-- Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default categories
INSERT INTO public.categories (name) VALUES
  ('Wireless'), ('Storage'), ('Compute'), ('Sensors'), ('Energy'),
  ('Mapping'), ('AI'), ('Mobility'), ('CDN'), ('VPN');

-- Blockchains table
CREATE TABLE public.blockchains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blockchains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blockchains are publicly readable" ON public.blockchains
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blockchains" ON public.blockchains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default blockchains
INSERT INTO public.blockchains (name) VALUES
  ('Solana'), ('Ethereum'), ('Polygon'), ('Cosmos'), ('IoTeX'),
  ('Polkadot'), ('Arbitrum'), ('Filecoin'), ('Arweave'), ('Custom');
