-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true);

-- Allow authenticated users to upload invoices
CREATE POLICY "Users can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

-- Allow public read access for WhatsApp API
CREATE POLICY "Public can view invoices"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invoices');