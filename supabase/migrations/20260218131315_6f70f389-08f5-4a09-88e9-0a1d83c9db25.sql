
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_existing_id uuid;
BEGIN
  -- Check if admin@crm.com already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'admin@crm.com';
  
  IF v_existing_id IS NOT NULL THEN
    -- Just make sure profile is approved and role is admin
    UPDATE public.profiles SET status = 'approved' WHERE id = v_existing_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_existing_id, 'admin')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Updated existing user %', v_existing_id;
  ELSE
    -- Create new auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      raw_app_meta_data,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@crm.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"name": "Administrator"}',
      '{"provider": "email", "providers": ["email"]}',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO public.profiles (id, name, email, status)
    VALUES (v_user_id, 'Administrator', 'admin@crm.com', 'approved')
    ON CONFLICT (id) DO UPDATE SET status = 'approved';

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created admin user with id %', v_user_id;
  END IF;
END $$;
