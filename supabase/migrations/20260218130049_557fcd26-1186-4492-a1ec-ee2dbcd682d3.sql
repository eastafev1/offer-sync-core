
-- Update handle_new_user to insert full profile, role and countries from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.app_role;
  v_countries text[];
  v_country text;
BEGIN
  -- Insert full profile from metadata
  INSERT INTO public.profiles (
    id, name, email,
    telegram_username, paypal, payment_details,
    about, recommendations, status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'telegram_username', ''),
    NULLIF(NEW.raw_user_meta_data->>'paypal', ''),
    NULLIF(NEW.raw_user_meta_data->>'payment_details', ''),
    NULLIF(NEW.raw_user_meta_data->>'about', ''),
    NULLIF(NEW.raw_user_meta_data->>'recommendations', ''),
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    telegram_username = EXCLUDED.telegram_username,
    paypal = EXCLUDED.paypal,
    payment_details = EXCLUDED.payment_details,
    about = EXCLUDED.about,
    recommendations = EXCLUDED.recommendations;

  -- Insert role
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent')::public.app_role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  -- Insert countries (stored as JSON array string)
  IF NEW.raw_user_meta_data ? 'countries' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'countries')
    ) INTO v_countries;

    IF v_countries IS NOT NULL THEN
      FOREACH v_country IN ARRAY v_countries LOOP
        INSERT INTO public.user_countries (user_id, country)
        VALUES (NEW.id, v_country::public.country_code)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
