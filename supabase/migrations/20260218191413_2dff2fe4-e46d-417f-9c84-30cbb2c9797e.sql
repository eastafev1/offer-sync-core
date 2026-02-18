
-- Create a SECURITY DEFINER function to check product ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_product_owner(_product_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = _product_id AND owner_id = _user_id
  );
$$;

-- Drop the recursive policy on product_blocked_agents
DROP POLICY IF EXISTS "Admins and sellers manage blocked agents" ON public.product_blocked_agents;

-- Recreate without recursion using the security definer function
CREATE POLICY "Admins and sellers manage blocked agents"
ON public.product_blocked_agents
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_product_owner(product_blocked_agents.product_id, auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_product_owner(product_blocked_agents.product_id, auth.uid())
);

-- Also fix the deals SELECT policy which also references products directly (same potential issue)
DROP POLICY IF EXISTS "Agents see own deals" ON public.deals;

CREATE OR REPLACE FUNCTION public.is_product_owner_by_deal(_product_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = _product_id AND owner_id = _user_id
  );
$$;

CREATE POLICY "Agents see own deals"
ON public.deals
FOR SELECT
USING (
  (agent_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_product_owner_by_deal(deals.product_id, auth.uid())
);
