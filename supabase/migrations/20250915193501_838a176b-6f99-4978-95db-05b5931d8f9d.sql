-- Inserir ticket 061 para o usuário prime@hubcloud.tv.br no sorteio ativo
INSERT INTO public.raffle_tickets (user_id, raffle_id, ticket_number, payment_status)
SELECT 
  p.id,
  r.id,
  61,
  'paid'
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.raffles r ON r.status = 'active'
WHERE u.email = 'prime@hubcloud.tv.br'
AND NOT EXISTS (
  SELECT 1 FROM public.raffle_tickets 
  WHERE raffle_id = r.id AND ticket_number = 61
);