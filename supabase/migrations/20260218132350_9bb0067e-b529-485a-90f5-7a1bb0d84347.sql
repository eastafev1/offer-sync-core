
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the admin user id
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@crm.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Insert identity record (required for email/password login)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'admin@crm.com',
      'email_verified', true
    ),
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  RAISE NOTICE 'Identity created for user %', v_user_id;
END $$;
