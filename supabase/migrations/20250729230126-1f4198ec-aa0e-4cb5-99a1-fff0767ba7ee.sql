-- Adicionar Michele feu brandao como indicação ativa de Murilo Henrique Lima Nunes
-- Atualizar o profile da Michele para ter o código de indicação do Murilo
UPDATE public.profiles 
SET referred_by = '0E94A9C0'
WHERE id = '9847d1f3-a1a9-4661-a9f6-19665611f1f9';

-- Criar registro de indicação ativa
INSERT INTO public.affiliate_referrals (
  affiliate_id,
  referred_user_id,
  status,
  week_start
) VALUES (
  '4a93ad13-baa3-48bb-91a1-b03f60b4f4b1',
  '9847d1f3-a1a9-4661-a9f6-19665611f1f9',
  'participant',
  date_trunc('week', CURRENT_DATE)::date
) ON CONFLICT (affiliate_id, referred_user_id) DO UPDATE SET
  status = 'participant',
  week_start = date_trunc('week', CURRENT_DATE)::date;