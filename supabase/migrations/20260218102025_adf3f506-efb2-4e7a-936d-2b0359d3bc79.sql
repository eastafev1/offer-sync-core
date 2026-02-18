
-- ============================================================
-- CRM FULL SCHEMA MIGRATION
-- ============================================================

-- ---- ENUMS ----
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'agent');
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'blocked');
CREATE TYPE public.country_code AS ENUM ('ES', 'DE', 'FR', 'IT', 'UK');
CREATE TYPE public.hold_status AS ENUM ('active', 'expired', 'converted', 'cancelled');
CREATE TYPE public.deal_status AS ENUM (
  'sold_submitted',
  'review_uploaded',
  'approved',
  'rejected',
  'paid_to_client',
  'completed'
);

-- ---- PROFILES ----
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  telegram_username TEXT,
  paypal TEXT,
  payment_details TEXT,
  about TEXT,
  recommendations TEXT,
  status public.user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---- USER ROLES (separate table — never on profiles) ----
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---- USER COUNTRIES ----
CREATE TABLE public.user_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country public.country_code NOT NULL,
  UNIQUE(user_id, country)
);
ALTER TABLE public.user_countries ENABLE ROW LEVEL SECURITY;

-- ---- SECURITY DEFINER: has_role (avoids recursive RLS) ----
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ---- SECURITY DEFINER: get_user_status ----
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS public.user_status
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = _user_id;
$$;

-- ---- PRODUCTS ----
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  asin TEXT,
  amazon_url TEXT,
  marketplace_country public.country_code,
  price_eur NUMERIC(10,2),
  total_qty INTEGER NOT NULL DEFAULT 1,
  daily_limit INTEGER,
  start_date DATE,
  end_date DATE,
  commission_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  main_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ---- PRODUCT BLOCKED AGENTS ----
CREATE TABLE public.product_blocked_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(product_id, agent_id)
);
ALTER TABLE public.product_blocked_agents ENABLE ROW LEVEL SECURITY;

-- ---- HOLDS ----
CREATE TABLE public.holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.hold_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  extended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_holds_agent_id ON public.holds(agent_id);
CREATE INDEX idx_holds_product_id ON public.holds(product_id);
CREATE INDEX idx_holds_expires_at ON public.holds(expires_at);

-- ---- DEALS ----
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id UUID REFERENCES public.holds(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.deal_status NOT NULL DEFAULT 'sold_submitted',
  amazon_profile_url TEXT,
  customer_paypal TEXT,
  customer_name TEXT,
  customer_telegram TEXT,
  order_screenshot_path TEXT,
  review_link TEXT,
  review_screenshot_path TEXT,
  admin_note TEXT,
  commission_eur NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deals_agent_id ON public.deals(agent_id);
CREATE INDEX idx_deals_product_id ON public.deals(product_id);
CREATE INDEX idx_deals_status ON public.deals(status);

-- ---- COMMISSION OVERRIDES ----
CREATE TABLE public.commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_eur NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, agent_id)
);
ALTER TABLE public.commission_overrides ENABLE ROW LEVEL SECURITY;

-- ---- COMMISSION CREDITS ----
CREATE TABLE public.commission_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  amount_eur NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_credits ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_commission_credits_agent_id ON public.commission_credits(agent_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_holds_updated_at BEFORE UPDATE ON public.holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DB FUNCTION: expire_stale_holds
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stale_holds()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE expired_count INTEGER;
BEGIN
  UPDATE public.holds
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- ============================================================
-- DB FUNCTION: create_hold (race-condition-safe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_hold(
  p_product_id UUID,
  p_agent_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_hold_id UUID;
  v_today_sold INTEGER;
  v_total_sold INTEGER;
  v_cooldown_ends TIMESTAMPTZ;
  v_existing_active UUID;
BEGIN
  -- Expire stale holds first
  PERFORM public.expire_stale_holds();

  -- Lock product row
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF NOT v_product.is_active THEN RAISE EXCEPTION 'Product is not active'; END IF;

  -- Check sale window
  IF v_product.start_date IS NOT NULL AND now()::date < v_product.start_date THEN
    RAISE EXCEPTION 'Sale has not started yet';
  END IF;
  IF v_product.end_date IS NOT NULL AND now()::date > v_product.end_date THEN
    RAISE EXCEPTION 'Sale window has ended';
  END IF;

  -- Check agent is not blocked
  IF EXISTS (
    SELECT 1 FROM public.product_blocked_agents
    WHERE product_id = p_product_id AND agent_id = p_agent_id
  ) THEN
    RAISE EXCEPTION 'You are not allowed to reserve this product';
  END IF;

  -- Check cooldown: if last hold expired < 5 min ago
  SELECT expires_at INTO v_cooldown_ends
  FROM public.holds
  WHERE product_id = p_product_id AND agent_id = p_agent_id
    AND status = 'expired'
  ORDER BY updated_at DESC LIMIT 1;

  IF v_cooldown_ends IS NOT NULL AND v_cooldown_ends > now() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Cooldown active: wait 5 minutes after expiry';
  END IF;

  -- Check agent does not already have active hold
  SELECT id INTO v_existing_active FROM public.holds
  WHERE product_id = p_product_id AND agent_id = p_agent_id AND status = 'active';
  IF FOUND THEN RAISE EXCEPTION 'You already have an active hold for this product'; END IF;

  -- Check total_qty (count converted + active holds + deals)
  SELECT COUNT(*) INTO v_total_sold FROM public.holds
  WHERE product_id = p_product_id AND status IN ('active', 'converted');
  v_total_sold := v_total_sold + (
    SELECT COUNT(*) FROM public.deals
    WHERE product_id = p_product_id AND status NOT IN ('rejected')
  ) - (
    SELECT COUNT(*) FROM public.holds h
    INNER JOIN public.deals d ON d.hold_id = h.id
    WHERE h.product_id = p_product_id AND h.status = 'converted'
  );
  -- simpler total: active holds + non-rejected deals
  SELECT COUNT(*) INTO v_total_sold FROM public.deals
  WHERE product_id = p_product_id AND status != 'rejected';
  v_total_sold := v_total_sold + (
    SELECT COUNT(*) FROM public.holds
    WHERE product_id = p_product_id AND status = 'active'
  );
  IF v_total_sold >= v_product.total_qty THEN
    RAISE EXCEPTION 'Product is fully reserved or sold';
  END IF;

  -- Check daily_limit
  IF v_product.daily_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_sold
    FROM public.holds
    WHERE product_id = p_product_id
      AND status IN ('active', 'converted')
      AND created_at::date = now()::date;
    v_today_sold := v_today_sold + (
      SELECT COUNT(*) FROM public.deals
      WHERE product_id = p_product_id
        AND status != 'rejected'
        AND created_at::date = now()::date
    );
    IF v_today_sold >= v_product.daily_limit THEN
      RAISE EXCEPTION 'Daily limit reached for this product';
    END IF;
  END IF;

  -- Create hold
  INSERT INTO public.holds (product_id, agent_id, expires_at)
  VALUES (p_product_id, p_agent_id, now() + INTERVAL '30 minutes')
  RETURNING id INTO v_hold_id;

  RETURN v_hold_id;
END;
$$;

-- ============================================================
-- DB FUNCTION: extend_hold (+5 min, once, only if < 1 min left)
-- ============================================================
CREATE OR REPLACE FUNCTION public.extend_hold(p_hold_id UUID, p_agent_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hold public.holds%ROWTYPE;
BEGIN
  SELECT * INTO v_hold FROM public.holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;
  IF v_hold.agent_id != p_agent_id THEN RAISE EXCEPTION 'Not your hold'; END IF;
  IF v_hold.status != 'active' THEN RAISE EXCEPTION 'Hold is not active'; END IF;
  IF v_hold.extended THEN RAISE EXCEPTION 'Hold has already been extended'; END IF;
  IF v_hold.expires_at - now() > INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Can only extend when less than 1 minute remains';
  END IF;
  UPDATE public.holds
  SET expires_at = expires_at + INTERVAL '5 minutes', extended = true, updated_at = now()
  WHERE id = p_hold_id;
END;
$$;

-- ============================================================
-- DB FUNCTION: convert_hold_to_deal
-- ============================================================
CREATE OR REPLACE FUNCTION public.convert_hold_to_deal(
  p_hold_id UUID,
  p_agent_id UUID,
  p_amazon_profile_url TEXT,
  p_customer_paypal TEXT,
  p_customer_name TEXT,
  p_customer_telegram TEXT,
  p_order_screenshot_path TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hold public.holds%ROWTYPE;
  v_deal_id UUID;
  v_commission NUMERIC(10,2);
BEGIN
  SELECT * INTO v_hold FROM public.holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;
  IF v_hold.agent_id != p_agent_id THEN RAISE EXCEPTION 'Not your hold'; END IF;
  IF v_hold.status != 'active' THEN RAISE EXCEPTION 'Hold is not active'; END IF;

  -- Expire check
  IF v_hold.expires_at < now() THEN
    UPDATE public.holds SET status = 'expired', updated_at = now() WHERE id = p_hold_id;
    RAISE EXCEPTION 'Hold has expired';
  END IF;

  -- Get commission (override or product default)
  SELECT COALESCE(co.commission_eur, pr.commission_eur) INTO v_commission
  FROM public.products pr
  LEFT JOIN public.commission_overrides co
    ON co.product_id = pr.id AND co.agent_id = p_agent_id
  WHERE pr.id = v_hold.product_id;

  -- Convert hold
  UPDATE public.holds SET status = 'converted', updated_at = now() WHERE id = p_hold_id;

  -- Create deal
  INSERT INTO public.deals (
    hold_id, product_id, agent_id,
    amazon_profile_url, customer_paypal, customer_name, customer_telegram,
    order_screenshot_path, commission_eur
  ) VALUES (
    p_hold_id, v_hold.product_id, p_agent_id,
    p_amazon_profile_url, p_customer_paypal, p_customer_name, p_customer_telegram,
    p_order_screenshot_path, v_commission
  ) RETURNING id INTO v_deal_id;

  RETURN v_deal_id;
END;
$$;

-- ============================================================
-- VIEW: admin_sales_metrics
-- ============================================================
CREATE OR REPLACE VIEW public.admin_sales_metrics AS
SELECT
  d.created_at::date AS sale_date,
  p.marketplace_country AS country,
  COUNT(d.id) AS deal_count,
  SUM(d.commission_eur) AS total_commission_eur
FROM public.deals d
JOIN public.products p ON p.id = d.product_id
WHERE d.status NOT IN ('rejected')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ============================================================
-- STORAGE: screenshots bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles: users read/update own; admins read all
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles: admins manage; users read own
CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_countries
CREATE POLICY "Users read own countries"
  ON public.user_countries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage countries"
  ON public.user_countries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products: agents see products not blocked for them; sellers see own; admins see all
CREATE POLICY "Admins see all products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers manage own products"
  ON public.products FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() AND (
      public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    owner_id = auth.uid() AND (
      public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Agents see unblocked approved products"
  ON public.products FOR SELECT TO authenticated
  USING (
    is_active = true AND
    public.has_role(auth.uid(), 'agent') AND
    NOT EXISTS (
      SELECT 1 FROM public.product_blocked_agents
      WHERE product_id = products.id AND agent_id = auth.uid()
    )
  );

-- product_blocked_agents
CREATE POLICY "Admins and sellers manage blocked agents"
  ON public.product_blocked_agents FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND owner_id = auth.uid())
  );

CREATE POLICY "Agents can see their own blocked status"
  ON public.product_blocked_agents FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- holds
CREATE POLICY "Agents see own holds"
  ON public.holds FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents insert holds via function"
  ON public.holds FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents update own holds"
  ON public.holds FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- deals
CREATE POLICY "Agents see own deals"
  ON public.deals FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Agents insert own deals"
  ON public.deals FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents update own deals"
  ON public.deals FOR UPDATE TO authenticated
  USING (
    agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- commission_overrides
CREATE POLICY "Admins manage commission overrides"
  ON public.commission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents see own overrides"
  ON public.commission_overrides FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- commission_credits
CREATE POLICY "Agents see own credits"
  ON public.commission_credits FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert credits"
  ON public.commission_credits FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE RLS
-- ============================================================
CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'screenshots');

CREATE POLICY "Users can view own screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'screenshots' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Product images public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
