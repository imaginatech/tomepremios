-- FASE 4: TESTE MANUAL DA TRIGGER
-- Criar um teste para verificar se a trigger funciona

-- Primeiro, verificar se existe um usuário teste e afiliado
DO $$
DECLARE
  test_user_id UUID;
  test_affiliate_id UUID;
  test_raffle_id UUID;
  test_ticket_id UUID;
BEGIN
  -- Buscar o primeiro usuário que tenha um código de afiliado
  SELECT profiles.id INTO test_user_id 
  FROM profiles 
  WHERE profiles.referred_by IS NOT NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE LOG 'Nenhum usuário com código de afiliado encontrado para teste';
    RETURN;
  END IF;
  
  -- Buscar o sorteio ativo
  SELECT get_active_raffle() INTO test_raffle_id;
  
  IF test_raffle_id IS NULL THEN
    RAISE LOG 'Nenhum sorteio ativo encontrado para teste';
    RETURN;
  END IF;
  
  RAISE LOG 'Teste: usuário %, sorteio %', test_user_id, test_raffle_id;
  
  -- Inserir um ticket de teste (status pending)
  INSERT INTO raffle_tickets (user_id, raffle_id, ticket_number, payment_status)
  VALUES (test_user_id, test_raffle_id, 199, 'pending')
  RETURNING id INTO test_ticket_id;
  
  RAISE LOG 'Ticket de teste criado: %', test_ticket_id;
  
  -- Aguardar um momento
  PERFORM pg_sleep(1);
  
  -- Atualizar o ticket para 'paid' - isso deve disparar a trigger
  UPDATE raffle_tickets 
  SET payment_status = 'paid' 
  WHERE id = test_ticket_id;
  
  RAISE LOG 'Ticket atualizado para paid - trigger deve ter sido executada';
  
END $$;