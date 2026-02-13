
-- Create palpiteco_settings table
CREATE TABLE public.palpiteco_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_url text,
  platform_percentage numeric NOT NULL DEFAULT 50,
  winners_percentage numeric NOT NULL DEFAULT 50,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.palpiteco_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view palpiteco settings"
ON public.palpiteco_settings FOR SELECT
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage palpiteco settings"
ON public.palpiteco_settings FOR ALL
USING (get_current_user_role() = 'admin');

-- Insert default row
INSERT INTO public.palpiteco_settings (platform_percentage, winners_percentage) VALUES (50, 50);
