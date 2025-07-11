-- Criar tabela de afiliados
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de indicações de afiliados
CREATE TABLE public.affiliate_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  raffle_id UUID REFERENCES public.raffles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de números bônus dos afiliados
CREATE TABLE public.affiliate_bonus_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  bonus_numbers INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo referred_by na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN referred_by TEXT NULL;

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_bonus_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies para affiliates
CREATE POLICY "Users can view their own affiliate data" 
ON public.affiliates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own affiliate record" 
ON public.affiliates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate record" 
ON public.affiliates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliates" 
ON public.affiliates 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- RLS Policies para affiliate_referrals
CREATE POLICY "Affiliates can view their own referrals" 
ON public.affiliate_referrals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates 
    WHERE affiliates.id = affiliate_referrals.affiliate_id 
    AND affiliates.user_id = auth.uid()
  )
);

CREATE POLICY "System can create referrals" 
ON public.affiliate_referrals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update referrals" 
ON public.affiliate_referrals 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can view all referrals" 
ON public.affiliate_referrals 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- RLS Policies para affiliate_bonus_numbers
CREATE POLICY "Affiliates can view their own bonus numbers" 
ON public.affiliate_bonus_numbers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates 
    WHERE affiliates.id = affiliate_bonus_numbers.affiliate_id 
    AND affiliates.user_id = auth.uid()
  )
);

CREATE POLICY "System can create bonus numbers" 
ON public.affiliate_bonus_numbers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all bonus numbers" 
ON public.affiliate_bonus_numbers 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Triggers para updated_at
CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_referrals_updated_at
BEFORE UPDATE ON public.affiliate_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar código de afiliado único
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Gerar código de 8 caracteres alfanuméricos
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- Verificar se já existe
    SELECT COUNT(*) INTO exists_count
    FROM public.affiliates
    WHERE affiliate_code = code;
    
    -- Se não existe, retornar o código
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Função para processar indicação de afiliado
CREATE OR REPLACE FUNCTION public.process_affiliate_referral(p_referred_user_id UUID, p_affiliate_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id UUID;
  v_affiliate_user_id UUID;
BEGIN
  -- Buscar o afiliado pelo código
  SELECT id, user_id INTO v_affiliate_id, v_affiliate_user_id
  FROM public.affiliates
  WHERE affiliate_code = p_affiliate_code AND status = 'active';
  
  -- Se não encontrou o afiliado, retornar false
  IF v_affiliate_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se não é auto-indicação
  IF v_affiliate_user_id = p_referred_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se já existe indicação para este usuário
  IF EXISTS (
    SELECT 1 FROM public.affiliate_referrals 
    WHERE referred_user_id = p_referred_user_id
  ) THEN
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
  
  RETURN TRUE;
END;
$$;