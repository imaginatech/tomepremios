-- FASE 1: CORRIGIR TRIGGER E ADICIONAR DEBUGGING
-- Primeiro, vamos corrigir a função trigger para incluir logs e melhor tratamento de erros

CREATE OR REPLACE FUNCTION public.trigger_affiliate_bonus()
RETURNS TRIGGER AS $$
DECLARE
  http_request_id BIGINT;
  payload JSONB;
BEGIN
  -- Log para debug
  RAISE LOG 'trigger_affiliate_bonus: Executando para ticket %, status antigo: %, status novo: %', 
    NEW.id, OLD.payment_status, NEW.payment_status;
  
  -- Verificar se o status mudou para 'paid' 
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Construir payload
    payload := json_build_object(
      'type', 'INSERT',
      'table', 'raffle_tickets', 
      'record', row_to_json(NEW),
      'schema', 'public'
    );
    
    -- Log do payload
    RAISE LOG 'trigger_affiliate_bonus: Fazendo chamada HTTP com payload: %', payload;
    
    -- Fazer chamada HTTP para a Edge Function process-affiliate-bonus
    SELECT net.http_post(
      url := 'https://achsqyusedhegqqgpucu.supabase.co/functions/v1/process-affiliate-bonus',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHNxeXVzZWRoZWdxcWdwdWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODgwOTksImV4cCI6MjA2NzU2NDA5OX0.SAC-MRbEmOP_UeP-s5la4VmZ6HDggWaB3GC8SNSokvo"}'::jsonb,
      body := payload
    ) INTO http_request_id;
    
    -- Log do resultado
    RAISE LOG 'trigger_affiliate_bonus: HTTP request enviado com ID: %', http_request_id;
    
  ELSE
    RAISE LOG 'trigger_affiliate_bonus: Condição não atendida para execução';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FASE 2: MELHORAR POLÍTICAS RLS PARA PERMITIR INSERÇÃO DO SISTEMA
-- Atualizar política para affiliate_bonus_numbers para permitir inserção via Edge Function
DROP POLICY IF EXISTS "System can create bonus numbers" ON public.affiliate_bonus_numbers;
CREATE POLICY "System can create bonus numbers" 
ON public.affiliate_bonus_numbers 
FOR INSERT 
WITH CHECK (true);

-- Atualizar política para affiliate_referrals para permitir inserção via Edge Function  
DROP POLICY IF EXISTS "System can create referrals" ON public.affiliate_referrals;
CREATE POLICY "System can create referrals" 
ON public.affiliate_referrals 
FOR INSERT 
WITH CHECK (true);

-- Adicionar política para permitir atualização de profiles.referred_by pelo sistema
DROP POLICY IF EXISTS "System can update profiles" ON public.profiles;
CREATE POLICY "System can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (true);

-- FASE 3: GARANTIR QUE A FUNÇÃO process_affiliate_referral POSSA SER EXECUTADA
-- Recriar a função com melhor segurança e logs
CREATE OR REPLACE FUNCTION public.process_affiliate_referral(p_referred_user_id uuid, p_affiliate_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id UUID;
  v_affiliate_user_id UUID;
BEGIN
  -- Log para debug
  RAISE LOG 'process_affiliate_referral: Processando referral para usuário % com código %', 
    p_referred_user_id, p_affiliate_code;
  
  -- Buscar o afiliado pelo código
  SELECT id, user_id INTO v_affiliate_id, v_affiliate_user_id
  FROM public.affiliates
  WHERE affiliate_code = p_affiliate_code AND status = 'active';
  
  -- Se não encontrou o afiliado, retornar false
  IF v_affiliate_id IS NULL THEN
    RAISE LOG 'process_affiliate_referral: Afiliado não encontrado para código %', p_affiliate_code;
    RETURN FALSE;
  END IF;
  
  -- Verificar se não é auto-indicação
  IF v_affiliate_user_id = p_referred_user_id THEN
    RAISE LOG 'process_affiliate_referral: Auto-indicação bloqueada para usuário %', p_referred_user_id;
    RETURN FALSE;
  END IF;
  
  -- Verificar se já existe indicação para este usuário
  IF EXISTS (
    SELECT 1 FROM public.affiliate_referrals 
    WHERE referred_user_id = p_referred_user_id
  ) THEN
    RAISE LOG 'process_affiliate_referral: Usuário % já possui uma indicação', p_referred_user_id;
    RETURN FALSE;
  END IF;
  
  -- Criar registro de indicação
  INSERT INTO public.affiliate_referrals (
    affiliate_id,
    referred_user_id,
    status
  ) VALUES (
    v_affiliate_id,
    p_referred_user_id,
    'registered'
  );
  
  -- Atualizar profile com código de indicação
  UPDATE public.profiles
  SET referred_by = p_affiliate_code
  WHERE id = p_referred_user_id;
  
  RAISE LOG 'process_affiliate_referral: Referral criado com sucesso para usuário %', p_referred_user_id;
  RETURN TRUE;
END;
$$;