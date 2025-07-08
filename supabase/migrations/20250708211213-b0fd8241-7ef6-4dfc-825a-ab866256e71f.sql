-- Função para buscar o sorteio ativo atual
CREATE OR REPLACE FUNCTION get_active_raffle()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  active_raffle_id UUID;
BEGIN
  SELECT id INTO active_raffle_id
  FROM public.raffles
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN active_raffle_id;
END;
$$;

-- Função para reservar números para um usuário
CREATE OR REPLACE FUNCTION reserve_numbers(
  p_user_id UUID,
  p_numbers INTEGER[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  raffle_id UUID;
  number_val INTEGER;
  existing_count INTEGER;
BEGIN
  -- Buscar o sorteio ativo
  SELECT get_active_raffle() INTO raffle_id;
  
  IF raffle_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum sorteio ativo encontrado';
  END IF;
  
  -- Verificar se algum número já está reservado
  SELECT COUNT(*) INTO existing_count
  FROM public.raffle_tickets
  WHERE raffle_id = raffle_id
    AND ticket_number = ANY(p_numbers);
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Alguns números já estão reservados';
  END IF;
  
  -- Inserir os tickets
  FOREACH number_val IN ARRAY p_numbers
  LOOP
    INSERT INTO public.raffle_tickets (
      user_id,
      raffle_id,
      ticket_number,
      payment_status
    ) VALUES (
      p_user_id,
      raffle_id,
      number_val,
      'paid'
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Criar um sorteio ativo de demonstração se não existir
INSERT INTO public.raffles (
  title,
  description,
  prize_value,
  ticket_price,
  total_tickets,
  draw_date,
  status
)
SELECT 
  'EDIÇÃO #001',
  'Sorteio de demonstração PIX da Sorte',
  500.00,
  5.00,
  200,
  NOW() + INTERVAL '1 week',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.raffles WHERE status = 'active'
);