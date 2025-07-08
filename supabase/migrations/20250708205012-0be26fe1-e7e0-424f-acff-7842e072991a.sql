-- Garantir que o usuário ti@hubcloud.tv.br tenha role de admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ti@hubcloud.tv.br'
);