-- Corrigir a função reserve_numbers para resolver ambiguidade de raffle_id
CREATE OR REPLACE FUNCTION reserve_numbers(
  p_user_id UUID,
  p_numbers INTEGER[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_raffle_id UUID;
  number_val INTEGER;
  existing_count INTEGER;
BEGIN
  -- Buscar o sorteio ativo
  SELECT get_active_raffle() INTO v_raffle_id;
  
  IF v_raffle_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum sorteio ativo encontrado';
  END IF;
  
  -- Verificar se algum número já está reservado
  SELECT COUNT(*) INTO existing_count
  FROM public.raffle_tickets
  WHERE raffle_tickets.raffle_id = v_raffle_id
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
      v_raffle_id,
      number_val,
      'paid'
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$;