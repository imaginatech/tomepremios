-- Atualizar o registro de indicação para participant com o sorteio correto
UPDATE affiliate_referrals 
SET 
  status = 'participant',
  raffle_id = '3a3ab189-c86f-4910-af5b-da681e07140d',
  week_start = date_trunc('week', CURRENT_DATE)::date,
  updated_at = NOW()
WHERE referred_user_id = '63503948-7e2c-41cb-aa80-959040a8ce38'
AND affiliate_id = '0f0a2900-69fb-4b5f-8769-2cca1d7c6dc4';