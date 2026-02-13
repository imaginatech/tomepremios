-- Allow authenticated users to read all paid poll entries (for vote counts)
CREATE POLICY "Authenticated users can view paid entries for vote counts"
ON public.poll_entries
FOR SELECT
USING (payment_status = 'paid' AND auth.uid() IS NOT NULL);