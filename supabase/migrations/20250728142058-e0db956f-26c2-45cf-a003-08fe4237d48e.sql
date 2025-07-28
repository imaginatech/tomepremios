-- Atualizar valor padrão do prêmio mensal para o salário mínimo atual
ALTER TABLE public.monthly_affiliate_winners 
ALTER COLUMN prize_amount SET DEFAULT 1518.00;