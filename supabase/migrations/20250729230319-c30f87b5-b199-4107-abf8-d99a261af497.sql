-- Atualizar indicação da Michele feu brandao para Murilo Henrique Lima Nunes
-- Primeiro, atualizar o profile da Michele
UPDATE public.profiles 
SET referred_by = '0E94A9C0'
WHERE id = '9847d1f3-a1a9-4661-a9f6-19665611f1f9';

-- Atualizar o registro de indicação existente
UPDATE public.affiliate_referrals
SET 
  affiliate_id = '4a93ad13-baa3-48bb-91a1-b03f60b4f4b1',
  updated_at = NOW()
WHERE referred_user_id = '9847d1f3-a1a9-4661-a9f6-19665611f1f9';