-- Corrigir a indicação do Maycon Richard para Maycon B S Anna
-- 1. Atualizar o profile com o código de indicação
UPDATE public.profiles 
SET referred_by = 'B6CB4A52'
WHERE id = '914f39ac-5a39-4632-835c-7069eb1a20dd';

-- 2. Criar o registro de indicação na tabela affiliate_referrals
INSERT INTO public.affiliate_referrals (
  affiliate_id,
  referred_user_id,
  status,
  week_start
) VALUES (
  '8fc24f8b-de78-4b19-b939-b87e45761345', -- ID do afiliado Maycon Richard
  '914f39ac-5a39-4632-835c-7069eb1a20dd', -- ID do usuário indicado Maycon B S Anna
  'registered',
  DATE_TRUNC('week', CURRENT_DATE)::date + INTERVAL '1 day' -- Segunda-feira da semana atual
);