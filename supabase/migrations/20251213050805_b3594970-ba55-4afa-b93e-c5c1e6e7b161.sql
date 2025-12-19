-- =============================================
-- PART 1: SUPER ADMIN ACCESS CONTROL
-- =============================================

-- Create pending_requests table for access requests
CREATE TABLE public.pending_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notified_superadmin BOOLEAN DEFAULT FALSE,
  handled_by UUID REFERENCES auth.users(id),
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manager_activity_logs table
CREATE TABLE public.manager_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.pending_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_activity_logs ENABLE ROW LEVEL SECURITY;

-- Pending requests: Public can insert (for access requests)
CREATE POLICY "Anyone can submit access request"
ON public.pending_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Pending requests: Only super admins can view/update
CREATE POLICY "Super admins can view all requests"
ON public.pending_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update requests"
ON public.pending_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Activity logs: Only super admins can view/insert
CREATE POLICY "Super admins can view activity logs"
ON public.manager_activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can insert activity logs"
ON public.manager_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for pending_requests
CREATE TRIGGER update_pending_requests_updated_at
BEFORE UPDATE ON public.pending_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PART 2: BILLING SYSTEM - Add unique constraint
-- =============================================

-- Add unique constraint to prevent duplicate bills for same tenant/month
-- First drop if exists to be safe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bills_tenant_month_unique'
  ) THEN
    ALTER TABLE public.bills 
    ADD CONSTRAINT bills_tenant_month_unique 
    UNIQUE (tenant_id, billing_month);
  END IF;
END $$;

-- Add is_manual flag to bills table to distinguish manual vs auto bills
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;