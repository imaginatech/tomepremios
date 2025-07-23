-- Corrigir a indicação da Luana Foesch pissinatti pela Leticia Jacob Cuzzuol
-- 1. Atualizar o profile com o código de indicação
UPDATE public.profiles 
SET referred_by = '8AA48D2A'
WHERE id = 'cb3b3bbf-9201-4eaf-9fb4-2ca6edd26595';

-- 2. Criar o registro de indicação na tabela affiliate_referrals
INSERT INTO public.affiliate_referrals (
  affiliate_id,
  referred_user_id,
  raffle_id,
  status,
  week_start
) VALUES (
  '36f885f3-8c79-4239-8811-18ee7fcce79d', -- ID da afiliada Leticia Jacob Cuzzuol
  'cb3b3bbf-9201-4eaf-9fb4-2ca6edd26595', -- ID da usuária indicada Luana Foesch pissinatti
  '3a3ab189-c86f-4910-af5b-da681e07140d', -- ID do sorteio atual
  'participant', -- Status participant pois já fez compra
  DATE_TRUNC('week', CURRENT_DATE)::date -- Semana atual
);