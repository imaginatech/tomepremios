-- Excluir a indicação não participante da Luana Foesch pissinatti da Rocha
DELETE FROM public.affiliate_referrals 
WHERE id = '94449cb7-895b-468d-9c62-7e78fb1ede7d' 
AND status = 'registered';

-- Excluir uma das indicações duplicadas da Monique nascimento de Almeida (manter apenas a mais antiga)
DELETE FROM public.affiliate_referrals 
WHERE id = '451172cc-8525-47e7-968c-ef013b66c3aa';