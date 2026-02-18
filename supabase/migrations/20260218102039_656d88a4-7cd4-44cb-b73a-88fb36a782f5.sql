
-- Fix 1: Recreate admin_sales_metrics view as SECURITY INVOKER (default, non-definer)
DROP VIEW IF EXISTS public.admin_sales_metrics;
CREATE VIEW public.admin_sales_metrics
WITH (security_invoker = true)
AS
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

-- Fix 2: Re-create update_updated_at with explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Fix 3: Re-create handle_new_user with explicit search_path (already has it, ensure it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix 4: expire_stale_holds with search_path already set — re-assert
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
