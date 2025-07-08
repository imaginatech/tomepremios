-- Adicionar política para permitir que usuários não autenticados vejam contagem de tickets vendidos
-- Isso é necessário para exibir estatísticas públicas no banner
CREATE POLICY "Anyone can view sold tickets count" 
ON public.raffle_tickets 
FOR SELECT 
USING (payment_status = 'paid');