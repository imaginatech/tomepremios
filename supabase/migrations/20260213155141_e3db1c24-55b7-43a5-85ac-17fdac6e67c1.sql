
-- Tabela de enquetes do Palpiteco
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  winning_option INTEGER,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL DEFAULT 5.00,
  status TEXT NOT NULL DEFAULT 'active',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de participações
CREATE TABLE public.poll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_option INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  pix_payment_id UUID REFERENCES public.pix_payments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active polls"
ON public.polls FOR SELECT
USING (status = 'active' OR status = 'closed' OR status = 'completed');

CREATE POLICY "Admins can manage all polls"
ON public.polls FOR ALL
USING (get_current_user_role() = 'admin');

-- RLS para poll_entries
ALTER TABLE public.poll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
ON public.poll_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries"
ON public.poll_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all entries"
ON public.poll_entries FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all entries"
ON public.poll_entries FOR ALL
USING (get_current_user_role() = 'admin');

-- Trigger para updated_at
CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
