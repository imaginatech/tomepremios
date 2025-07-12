-- Atualizar a função process_affiliate_referral para incluir mais logs detalhados
CREATE OR REPLACE FUNCTION public.process_affiliate_referral(p_referred_user_id uuid, p_affiliate_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_affiliate_id UUID;
  v_affiliate_user_id UUID;
BEGIN
  -- Log para debug - início da função
  RAISE LOG 'process_affiliate_referral: INICIANDO processamento para usuário % com código %', 
    p_referred_user_id, p_affiliate_code;
  
  -- Buscar o afiliado pelo código
  SELECT id, user_id INTO v_affiliate_id, v_affiliate_user_id
  FROM public.affiliates
  WHERE affiliate_code = p_affiliate_code AND status = 'active';
  
  -- Se não encontrou o afiliado, retornar false
  IF v_affiliate_id IS NULL THEN
    RAISE LOG 'process_affiliate_referral: ERRO - Afiliado não encontrado para código %', p_affiliate_code;
    RETURN FALSE;
  END IF;
  
  RAISE LOG 'process_affiliate_referral: Afiliado encontrado - ID: %, User ID: %', v_affiliate_id, v_affiliate_user_id;
  
  -- Verificar se não é auto-indicação
  IF v_affiliate_user_id = p_referred_user_id THEN
    RAISE LOG 'process_affiliate_referral: ERRO - Auto-indicação bloqueada para usuário %', p_referred_user_id;
    RETURN FALSE;
  END IF;
  
  -- Verificar se já existe indicação para este usuário
  IF EXISTS (
    SELECT 1 FROM public.affiliate_referrals 
    WHERE referred_user_id = p_referred_user_id
  ) THEN
    RAISE LOG 'process_affiliate_referral: ERRO - Usuário % já possui uma indicação', p_referred_user_id;
    RETURN FALSE;
  END IF;
  
  RAISE LOG 'process_affiliate_referral: Validações OK - Criando registro de indicação';
  
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
  
  RAISE LOG 'process_affiliate_referral: SUCESSO - Referral criado para usuário % com código %', 
    p_referred_user_id, p_affiliate_code;
  RETURN TRUE;
END;
$function$