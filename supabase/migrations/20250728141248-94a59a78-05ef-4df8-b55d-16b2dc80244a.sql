-- Criar tabela para ganhadores mensais de afiliados
CREATE TABLE public.monthly_affiliate_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- formato 'YYYY-MM'
  referrals_count INTEGER NOT NULL DEFAULT 0,
  prize_amount NUMERIC NOT NULL DEFAULT 1320.00, -- 1 salário mínimo
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.monthly_affiliate_winners ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage monthly winners" 
ON public.monthly_affiliate_winners 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Affiliates can view their own monthly wins" 
ON public.monthly_affiliate_winners 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM affiliates 
  WHERE affiliates.id = monthly_affiliate_winners.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

-- Criar índice para performance
CREATE INDEX idx_monthly_affiliate_winners_month_year ON public.monthly_affiliate_winners(month_year);
CREATE INDEX idx_monthly_affiliate_winners_affiliate_id ON public.monthly_affiliate_winners(affiliate_id);