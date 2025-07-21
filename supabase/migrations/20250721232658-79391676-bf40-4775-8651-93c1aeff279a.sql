-- Corrigir o registro de indicação do Maycon Richard pela Lorraine
UPDATE profiles 
SET referred_by = '355EF8CA' 
WHERE id = '63503948-7e2c-41cb-aa80-959040a8ce38' 
AND full_name = 'Maycon Richard Cassiano Lopes';

-- Simular o processamento manual do bônus de afiliado
-- Primeiro, vamos inserir o registro na affiliate_referrals se não existir
INSERT INTO affiliate_referrals (
  affiliate_id,
  referred_user_id,
  raffle_id,
  status,
  week_start
)
SELECT 
  a.id as affiliate_id,
  '63503948-7e2c-41cb-aa80-959040a8ce38'::uuid as referred_user_id,
  '3a3ab189-c86f-4910-af5b-da681e07140d'::uuid as raffle_id,
  'participant' as status,
  date_trunc('week', CURRENT_DATE)::date as week_start
FROM affiliates a
WHERE a.affiliate_code = '355EF8CA'
AND NOT EXISTS (
  SELECT 1 FROM affiliate_referrals ar 
  WHERE ar.affiliate_id = a.id 
  AND ar.referred_user_id = '63503948-7e2c-41cb-aa80-959040a8ce38'
);