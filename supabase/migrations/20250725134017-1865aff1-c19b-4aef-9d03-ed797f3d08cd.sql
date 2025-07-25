-- Vincular Mário Martins ao afiliado Weverson Armani

-- 1. Atualizar o campo referred_by no profile do Mário Martins
UPDATE profiles 
SET referred_by = '7CD1C197', updated_at = NOW()
WHERE id = '7e9f4265-e862-4504-a0e7-45d3f9067b0a';

-- 2. Inserir/atualizar o registro de affiliate_referrals
INSERT INTO affiliate_referrals (
  affiliate_id,
  referred_user_id,
  status
) VALUES (
  '27aa1059-d94a-42b1-b968-56c4021f5cbf', -- ID do afiliado Weverson Armani
  '7e9f4265-e862-4504-a0e7-45d3f9067b0a', -- ID do cliente Mário Martins
  'registered'
)
ON CONFLICT (referred_user_id) 
DO UPDATE SET 
  affiliate_id = EXCLUDED.affiliate_id,
  updated_at = NOW();