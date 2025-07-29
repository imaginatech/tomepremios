-- Criar tabela para prêmios instantâneos
CREATE TABLE public.instant_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID NOT NULL,
  ticket_numbers INTEGER[] NOT NULL,
  prize_amount NUMERIC NOT NULL,
  prize_description TEXT NOT NULL DEFAULT 'Prêmio Instantâneo',
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_by UUID NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.instant_prizes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins can manage all instant prizes" 
ON public.instant_prizes 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own claimed prizes" 
ON public.instant_prizes 
FOR SELECT 
USING (auth.uid() = claimed_by);

CREATE POLICY "Anyone can view unclaimed prizes for active raffles" 
ON public.instant_prizes 
FOR SELECT 
USING (
  NOT claimed 
  AND EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE raffles.id = instant_prizes.raffle_id 
    AND raffles.status = 'active'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_instant_prizes_updated_at
BEFORE UPDATE ON public.instant_prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();