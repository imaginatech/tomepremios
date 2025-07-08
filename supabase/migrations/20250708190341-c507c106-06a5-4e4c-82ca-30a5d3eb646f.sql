
-- Adicionar coluna de role na tabela profiles para controle de acesso
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Atualizar o usuário específico como admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ti@hubcloud.tv.br'
);

-- Criar trigger para definir role como admin para o email específico
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Se for o email do admin, definir role como admin
  IF new.email = 'ti@hubcloud.tv.br' THEN
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = new.id;
  END IF;
  RETURN new;
END;
$$;

-- Criar trigger que executa após inserção de usuário
CREATE TRIGGER on_auth_user_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_admin_user();

-- Adicionar colunas para controle de campanha nas edições
ALTER TABLE public.raffles ADD COLUMN campaign_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.raffles ADD COLUMN campaign_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.raffles ADD COLUMN auto_start_next BOOLEAN DEFAULT FALSE;

-- Criar políticas RLS para permitir que admin gerencie tudo
CREATE POLICY "Admins can manage all raffles" 
  ON public.raffles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all tickets" 
  ON public.raffle_tickets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
