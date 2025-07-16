-- Criar tabela para ganhadores semanais do programa de afiliados
CREATE TABLE public.weekly_affiliate_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  prize_amount NUMERIC NOT NULL DEFAULT 500.00,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id)
);

-- Enable RLS
ALTER TABLE public.weekly_affiliate_winners ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins can manage weekly winners" 
ON public.weekly_affiliate_winners 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Affiliates can view their own wins" 
ON public.weekly_affiliate_winners 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.affiliates 
  WHERE affiliates.id = weekly_affiliate_winners.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

-- Criar índices para performance
CREATE INDEX idx_weekly_winners_week ON public.weekly_affiliate_winners(week_start, week_end);
CREATE INDEX idx_weekly_winners_affiliate ON public.weekly_affiliate_winners(affiliate_id);

-- Atualizar status na tabela affiliate_referrals para simplificar
-- 'registered' = usuário se cadastrou mas não comprou
-- 'participant' = usuário comprou título (indicação válida)
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS week_start DATE;