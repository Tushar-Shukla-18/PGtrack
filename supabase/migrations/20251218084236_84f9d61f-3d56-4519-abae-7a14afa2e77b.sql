-- Add whatsapp_consent to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_consent boolean DEFAULT false;

-- Update whatsapp_logs table to have proper columns for logging
ALTER TABLE public.whatsapp_logs
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS template_name text,
ADD COLUMN IF NOT EXISTS error_message text;

-- Add meta_optin_confirmed to tenants for webhook confirmation
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS meta_optin_confirmed boolean DEFAULT false;

-- Create index for faster bill lookups
CREATE INDEX IF NOT EXISTS idx_bills_tenant_bill_month ON public.bills(tenant_id, bill_month);

-- Create index for faster reminder lookups (unpaid bills by due date)
CREATE INDEX IF NOT EXISTS idx_bills_payment_status_due_date ON public.bills(payment_status, due_date);