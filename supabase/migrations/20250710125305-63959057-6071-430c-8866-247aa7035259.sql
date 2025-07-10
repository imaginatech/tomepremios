-- Remover as políticas problemáticas que estão causando recursão infinita
DROP POLICY IF EXISTS "Anyone can view winning tickets" ON public.raffle_tickets;
DROP POLICY IF EXISTS "Anyone can view winner profiles" ON public.profiles;

-- Criar política simples para permitir visualização pública de sorteios concluídos
CREATE POLICY "Anyone can view completed raffles" 
ON public.raffles 
FOR SELECT 
USING (status = 'completed');

-- Criar política simples para permitir contagem de usuários (profiles públicos)
CREATE POLICY "Anyone can count profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Criar política simples para visualizar tickets de sorteios concluídos
CREATE POLICY "Anyone can view completed raffle tickets" 
ON public.raffle_tickets 
FOR SELECT 
USING (
  payment_status = 'paid' 
  AND EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE raffles.id = raffle_tickets.raffle_id 
    AND raffles.status = 'completed'
  )
);