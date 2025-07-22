-- Atualizar função handle_new_user para incluir referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, whatsapp, full_name, referred_by)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'whatsapp',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'referred_by'
  );
  RETURN new;
END;
$$;