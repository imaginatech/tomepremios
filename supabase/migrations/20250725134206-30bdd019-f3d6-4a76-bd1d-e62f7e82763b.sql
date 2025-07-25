-- Atualizar status do referral do Mário Martins para participant
UPDATE affiliate_referrals 
SET 
  status = 'participant',
  updated_at = NOW()
WHERE referred_user_id = '7e9f4265-e862-4504-a0e7-45d3f9067b0a';