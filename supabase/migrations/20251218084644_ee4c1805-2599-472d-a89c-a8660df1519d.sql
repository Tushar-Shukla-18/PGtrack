-- Add is_disabled column to profiles for manager account status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false;