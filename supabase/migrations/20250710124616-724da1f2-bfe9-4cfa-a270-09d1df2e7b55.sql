-- Criar política para permitir visualização pública de tickets ganhadores
CREATE POLICY "Anyone can view winning tickets" 
ON public.raffle_tickets 
FOR SELECT 
USING (
  payment_status = 'paid' 
  AND raffle_id IN (
    SELECT id FROM public.raffles WHERE status = 'completed' AND winning_number IS NOT NULL
  )
  AND ticket_number IN (
    SELECT winning_number FROM public.raffles WHERE status = 'completed' AND winning_number IS NOT NULL
  )
);

-- Criar política para permitir visualização pública de nomes de ganhadores
CREATE POLICY "Anyone can view winner profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT user_id FROM public.raffle_tickets 
    WHERE payment_status = 'paid' 
    AND raffle_id IN (
      SELECT id FROM public.raffles WHERE status = 'completed' AND winning_number IS NOT NULL
    )
    AND ticket_number IN (
      SELECT winning_number FROM public.raffles WHERE status = 'completed' AND winning_number IS NOT NULL
    )
  )
);