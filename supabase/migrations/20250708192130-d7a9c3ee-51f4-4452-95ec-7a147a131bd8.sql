
-- Atualizar o usuário específico como admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ti@hubcloud.tv.br'
);

-- Corrigir a função de trigger para salvar o nome completo corretamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, whatsapp, full_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'whatsapp',
    new.raw_user_meta_data ->> 'full_name'
  );
  RETURN new;
END;
$$;

-- Atualizar a função de admin para garantir que o email específico seja sempre admin
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
