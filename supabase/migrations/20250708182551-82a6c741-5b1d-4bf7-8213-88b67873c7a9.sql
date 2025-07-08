
-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  whatsapp TEXT,
  pix_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de edições/sorteios
CREATE TABLE public.raffles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize_value DECIMAL(10,2) NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  total_tickets INTEGER NOT NULL DEFAULT 200,
  draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
  winning_number INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de participações
CREATE TABLE public.raffle_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(raffle_id, ticket_number)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Políticas para raffles (públicas para visualização)
CREATE POLICY "Anyone can view raffles" 
  ON public.raffles FOR SELECT 
  TO public;

-- Políticas para raffle_tickets
CREATE POLICY "Users can view their own tickets" 
  ON public.raffle_tickets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets" 
  ON public.raffle_tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, whatsapp)
  VALUES (new.id, new.raw_user_meta_data ->> 'whatsapp');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Inserir algumas edições de exemplo
INSERT INTO public.raffles (title, description, prize_value, draw_date, status) VALUES
('Sorteio iPhone 15 Pro', 'Concorra a um iPhone 15 Pro 256GB', 8000.00, '2025-01-15 20:00:00+00', 'active'),
('Sorteio R$ 5.000', 'Concorra a R$ 5.000 em dinheiro via PIX', 5000.00, '2025-01-10 20:00:00+00', 'active'),
('Sorteio PlayStation 5', 'PlayStation 5 + 2 controles + FIFA 24', 3500.00, '2024-12-28 20:00:00+00', 'completed');
