-- Corrigir política RLS para permitir que usuários não autenticados vejam sorteios
DROP POLICY IF EXISTS "Anyone can view raffles" ON public.raffles;

-- Criar nova política que explicitamente permite acesso a todos
CREATE POLICY "Anyone can view raffles" 
ON public.raffles 
FOR SELECT 
USING (true);